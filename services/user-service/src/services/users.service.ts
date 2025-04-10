import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { CreateUserInput } from 'src/dto/create-user.input';
import { UpdateUserInput } from 'src/dto/update-user.input.dto';
import * as bcrypt from 'bcrypt';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import * as sgMail from '@sendgrid/mail';

const otpStore = new Map<string, { otp: string; expiresAt: Date }>(); // In-memory OTP storage

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {
    // Initialize SendGrid with API key
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      this.logger.error('SENDGRID_API_KEY is not set in environment variables');
    }
    sgMail.setApiKey(apiKey);
  }
  
  //  Create a new user
  async create(input: CreateUserInput) {
    try {
      this.logger.log(`Creating new user with email: ${input.email}`);
      
      // First check if a user with this email already exists
      const existingUser = await this.findByEmail(input.email);

      if (existingUser) {
        throw new ConflictException(`User with email ${input.email} already exists`);
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
    return this.prisma.user.findUnique({ where: { email } });
  }
  
  async sendOtp(email: string) {
    this.logger.log(`Attempting to send OTP to: ${email}`);
    
    if (!process.env.SENDGRID_FROM_EMAIL) {
      this.logger.error('SENDGRID_FROM_EMAIL is not set in environment variables');
      throw new BadRequestException('Email service is not properly configured');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins expiry
  
    // Store OTP in memory
    otpStore.set(email, { otp, expiresAt });
  
    // Send email using SendGrid
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'Your Verification OTP',
      text: `Your OTP is ${otp}. It expires in 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Verification</h2>
          <p>Thank you for registering! Please use the following OTP to verify your email address:</p>
          <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0;">
            ${otp}
          </div>
          <p>This OTP will expire in 5 minutes.</p>
          <p>If you didn't request this verification, please ignore this email.</p>
        </div>
      `,
    };
    
    try {
      this.logger.log('Sending email via SendGrid...');
      await sgMail.send(msg);
      this.logger.log('SendGrid email sent successfully');
      return true;
    } catch (error) {
      this.logger.error('SendGrid error:', error);
      throw new BadRequestException('Failed to send OTP email: ' + error.message);
    }
  }
  
  async verifyOtp(email: string, otp: string): Promise<boolean> {
    this.logger.log(`Verifying OTP for email: ${email}`);
    
    const record = otpStore.get(email);
  
    if (!record) {
      this.logger.warn(`No OTP found for email: ${email}`);
      throw new BadRequestException('No OTP found');
    }
    if (record.expiresAt < new Date()) {
      this.logger.warn(`OTP expired for email: ${email}`);
      throw new BadRequestException('OTP expired');
    }
    if (record.otp !== otp) {
      this.logger.warn(`Invalid OTP provided for email: ${email}`);
      throw new BadRequestException('Invalid OTP');
    }
  
    // ✅ Mark user as approved after successful verification
    try {
      await this.prisma.user.update({
        where: { email },
        data: { isApproved: true },
      });
      this.logger.log(`User ${email} successfully verified`);
    } catch (error) {
      this.logger.error(`Error updating user verification status: ${error}`);
      throw new BadRequestException('Failed to update user verification status');
    }
  
    otpStore.delete(email); // Clean up
    return true;
  }
}
