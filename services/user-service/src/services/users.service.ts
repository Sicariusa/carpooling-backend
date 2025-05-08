import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { CreateUserInput } from 'src/dto/create-user.input';
import { UpdateUserInput } from 'src/dto/update-user.input.dto';
import * as bcrypt from 'bcrypt';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import * as nodemailer from 'nodemailer';
import { Console } from 'console';
import { verify } from 'jsonwebtoken';

// Global OTP store with case-insensitive email keys
const otpStore = new Map<string, { otp: string; expiresAt: Date }>();

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly prisma: PrismaService) {
    // Initialize Nodemailer transporter
    this.initializeNodemailer();
  }

  private initializeNodemailer() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });

      this.logger.log('Nodemailer transporter initialized');

      // Test the connection
      this.transporter.verify((error) => {
        if (error) {
          console.log('EMAIL_USER or EMAIL_PASSWORD is not set in environment variables');
        } else {
          console.log('SMTP server connection established');
        }
      });
    } catch (error) {
      console.log('Failed to initialize Nodemailer transporter:', error);
    }
  }

  //  Create a new user
  async create(input: CreateUserInput) {
    try {
      this.logger.log(`Creating new user with email: ${input.email}`);

      // Normalize email to lowercase for consistency
      const normalizedEmail = input.email.toLowerCase();

      // First check if a user with this email already exists
      const existingUser = await this.findByEmail(normalizedEmail);

      if (existingUser) {
        throw new ConflictException(`User with email ${normalizedEmail} already exists`);
      }

      const existingUserByUniversityId = await this.prisma.user.findUnique({
        where: { universityId: input.universityId }
      });

      if (existingUserByUniversityId) {
        throw new ConflictException(`User with university ID ${input.universityId} already exists`);
      }

      // Hash the password before storing
      const hashedPassword = await bcrypt.hash(input.password, 10);
      const { phoneNumber, ...restInput } = input;

      const newUser = await this.prisma.user.create({
        data: {
          ...restInput,
          email: normalizedEmail, // Store normalized email
          password: hashedPassword,
          isApproved: false, // Ensure user starts as unapproved
        },
      });

      this.logger.log(`User created successfully with ID: ${newUser.id}`);

      // ✉️ Automatically send OTP after registration
      try {
        await this.sendOtp(newUser.email);
        this.logger.log(`OTP sent successfully to: ${newUser.email}`);
      } catch (error) {
        this.logger.error(`Failed to send OTP to ${newUser.email}:`, error);
        // Don't throw here - we want to return the created user even if OTP fails
      }

      return newUser;
    } catch (error) {
      this.logger.error('Error creating user:', error);
      // Handle Prisma-specific errors
      if (error instanceof PrismaClientKnownRequestError) {
        // P2002 is the Prisma error code for unique constraint violations
        if (error.code === 'P2002') {
          throw new ConflictException(`User with email ${input.email} already exists`);
        }
      }
      // Re-throw the error if it's not a Prisma unique constraint error
      throw error;
    }
  }

  //  Get all users
  async findAll() {
    return this.prisma.user.findMany();
  }

  //  Get a user by universityId
  async findOne(universityId: number): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { universityId } });
    if (!user) {
      throw new NotFoundException(`User with university ID ${universityId} not found`);
    }
    return user;
  }

  // Get a user by universityId
  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  //  Update a user
  async update(universityId: number, input: UpdateUserInput) {
    // Remove phoneNumber from input as it's not in the User model
    const { phoneNumber, ...restInput } = input;

    return this.prisma.user.update({
      where: { universityId },
      data: restInput
    });
  }

  //  Delete a user
  async remove(universityId: number) {
    try {
      await this.prisma.user.delete({ where: { universityId } });
      return true;
    } catch (error) {
      throw new NotFoundException(`User with university ID ${universityId} not found`);
    }
  }

  async findByUuid(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string) {
    // Always search with lowercase email
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
  }

  async sendOtp(email: string) {
    this.logger.log(`Attempting to send OTP to: ${email}`);

    // Normalize email
    const normalizedEmail = email.toLowerCase();

    if (!process.env.EMAIL_USER) {
      this.logger.error('EMAIL_USER is not set in environment variables');
      throw new BadRequestException('Email service is not properly configured');
    }

    // Verify that the user exists
    const user = await this.findByEmail(normalizedEmail);
    if (!user) {
      throw new BadRequestException(`No user found with email: ${normalizedEmail}`);
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins expiry

    // Store OTP in memory with normalized email as key
    otpStore.set(normalizedEmail, { otp, expiresAt });

    // Send email using Nodemailer
    const msg = {
      from: process.env.EMAIL_USER,
      to: normalizedEmail,
      subject: 'Your Verification OTP',
      text: `Your OTP is ${otp}. It expires in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Verification</h2>
          <p>Thank you for registering! Please use the following OTP to verify your email address:</p>
          <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0;">
            ${otp}
          </div>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this verification, please ignore this email.</p>
          <p>- Carpooling Team</p>
        </div>
      `,
    };

    try {
      this.logger.log(`Sending email via Nodemailer to ${normalizedEmail}...`);
      await this.transporter.sendMail(msg);
      this.logger.log(`Nodemailer email sent successfully to ${normalizedEmail}`);

      // For debugging
      this.logger.debug(`OTP for ${normalizedEmail}: ${otp}`);

      return true;
    } catch (error) {
      this.logger.error('Nodemailer error:', error);
      throw new BadRequestException('Failed to send OTP email: ' + error.message);
    }
  }

  async verifyOtp(email: string, otp: string): Promise<boolean> {
    // Normalize email
    const normalizedEmail = email.toLowerCase();

    this.logger.log(`Verifying OTP for email: ${normalizedEmail}`);

    // Verify that the user exists
    const user = await this.findByEmail(normalizedEmail);
    if (!user) {
      throw new BadRequestException(`No user found with email: ${normalizedEmail}`);
    }

    // Get OTP record using normalized email
    const record = otpStore.get(normalizedEmail);

    if (!record) {
      this.logger.warn(`No OTP found for email: ${normalizedEmail}`);
      throw new BadRequestException('No OTP found. Please request a new OTP.');
    }

    if (record.expiresAt < new Date()) {
      this.logger.warn(`OTP expired for email: ${normalizedEmail}`);
      // Clean up expired OTP
      otpStore.delete(normalizedEmail);
      throw new BadRequestException('OTP has expired. Please request a new OTP.');
    }

    if (record.otp !== otp) {
      this.logger.warn(`Invalid OTP provided for email: ${normalizedEmail}`);
      throw new BadRequestException('Invalid OTP. Please try again.');
    }

    // ✅ Mark user as approved after successful verification
    try {
      const updatedUser = await this.prisma.user.update({
        where: { email: normalizedEmail },
        data: { isApproved: true },
      });

      this.logger.log(`User ${normalizedEmail} successfully verified and approved.`);

      // Clean up after successful verification
      otpStore.delete(normalizedEmail);

      return true;
    } catch (error) {
      this.logger.error(`Error updating user verification status: ${error}`);
      throw new BadRequestException('Failed to update user verification status');
    }
  }

  async getUserByToken(token: string) {
    try {
      const decoded = verify(token, process.env.JWT_SECRET) as { id: string };
      return this.findByUuid(decoded.id);
    } catch (error) {
      throw new BadRequestException('Invalid token');
    }
  }
}