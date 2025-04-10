import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { CreateUserInput } from 'src/dto/create-user.input';
import { UpdateUserInput } from 'src/dto/update-user.input.dto';


import { User } from 'src/schema/user';
import { UsersService } from 'src/services/users.service';
import { Roles, Public } from '../guards/auth.guard';
import { Role } from '@prisma/client';
import { Logger } from '@nestjs/common';

// getdriverrides fe ride service
// getMyBookings rides from booking service

@Resolver(() => User)
export class UsersResolver {
  private readonly logger = new Logger(UsersResolver.name);

  constructor(private readonly usersService: UsersService) {}

  // Get all users (protected by default)
  @Query(() => [User], { name: 'getAllUsers' })
  @Roles(Role.ADMIN)
  async findAll() {
    return this.usersService.findAll();
  }

  // Get user by ID (protected by default)
  @Query(() => User, { name: 'getUserById' })
  async findOne(@Args('universityId', { type: () => Int }) universityId: number) {
    return this.usersService.findOne(universityId);
  }

  // Register a new user (public)
  @Mutation(() => User, { name: 'registerUser' })
  @Public()
  async createUser(@Args('input') input: CreateUserInput) {
    this.logger.log(`Registering new user with email: ${input.email}`);
    const user = await this.usersService.create(input);
    this.logger.log(`User registered successfully: ${user.id}`);
    return user;
  }

  //Update a user (protected by default)
  @Mutation(() => User, { name: 'updateUser' })
  async update(
    @Args('universityId', { type: () => Int }) universityId: number,
    @Args('input') input: UpdateUserInput,
  ) {
    return this.usersService.update(universityId, input);
  }

  // Delete a user (admin only)
  @Mutation(() => Boolean, { name: 'deleteUser' })
  @Roles(Role.ADMIN)
  async remove(@Args('universityId', { type: () => Int }) universityId: number): Promise<boolean> {
    return this.usersService.remove(universityId);
  }

  @Query(() => User, { name: 'getUserByUuid' })
  @Public()
  async getUserByUuid(@Args('id', { type: () => String }) id: string) {
    return this.usersService.findByUuid(id);
  }

  @Mutation(() => Boolean, { name: 'sendVerificationOtp' })
  @Public()
  async sendVerificationOtp(@Args('email') email: string) {
    this.logger.log(`Sending verification OTP to: ${email}`);
    const result = await this.usersService.sendOtp(email);
    this.logger.log(`OTP sent successfully to: ${email}`);
    return result;
  }

  @Mutation(() => Boolean, { name: 'verifyOtp' })
  @Public()
  async verifyOtp(
    @Args('email') email: string,
    @Args('otp') otp: string,
  ): Promise<boolean> {
    this.logger.log(`Verifying OTP for email: ${email}`);
    const result = await this.usersService.verifyOtp(email, otp);
    if (result) {
      this.logger.log(`OTP verified successfully for: ${email}`);
    }
    return result;
  }
}
