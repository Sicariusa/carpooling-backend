import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { CreateUserInput } from 'src/dto/create-user.input';
import { UpdateUserInput } from 'src/dto/update-user.input.dto';
import * as bcrypt from 'bcrypt';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  //  Create a new user
  async create(input: CreateUserInput) {
    try {
      // First check if a user with this email already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: input.email }
      });

      if (existingUser) {
        throw new ConflictException(`User with email ${input.email} already exists`);
      }

      // Hash the password before storing
      const hashedPassword = await bcrypt.hash(input.password, 10);
      const { phoneNumber, ...restInput } = input;
      
      return this.prisma.user.create({ 
        data: {
          ...restInput,
          password: hashedPassword
        } 
      });
    } catch (error) {
      // Handle Prisma-specific errors
      if (error instanceof PrismaClientKnownRequestError) {
        // P2002 is the Prisma error code for unique constraint violations
        if (error.code === 'P2002') {
          throw new ConflictException(`User with email ${input.email} already exists`);
        }
      }
      // Re-throw the error if it's not a Prisma unique constraint error
      // or if we've already handled it above
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

  // Get a user by ID
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
}
