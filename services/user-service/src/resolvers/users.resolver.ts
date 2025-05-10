import { Resolver, Query, Mutation, Args, Int, Context } from '@nestjs/graphql';
import { CreateUserInput } from 'src/dto/create-user.input';
import { UpdateUserInput } from 'src/dto/update-user.input.dto';
import { User } from 'src/schema/user';
import { UsersService } from 'src/services/users.service';
import { Roles, Public } from '../guards/auth.guard';
import { Role } from '@prisma/client';

@Resolver(() => User)
export class UsersResolver {
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
    return this.usersService.create(input);
  }

  // Update a user (protected by default)
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

  // Get user by UUID (public)
  @Query(() => User, { name: 'getUserByUuid' })
  @Public()
  async getUserByUuid(@Args('id', { type: () => String }) id: string) {
    return this.usersService.findByUuid(id);
  }

  // Verify OTP (public)
  @Mutation(() => Boolean, { name: 'verifyOtp' })
  @Public()
  async verifyOtp(
    @Args('email') email: string,
    @Args('otp') otp: string,
  ): Promise<boolean> {
    return this.usersService.verifyOtp(email, otp);
  }

  // Get user by token provided in header (protected by default)
  @Query(() => User, { name: 'getUserByToken' })
  async getUserByToken(@Context() context) {
    try {
      const token = context.req.headers.authorization?.split(' ')[1];
      if (!token) {
        throw new Error('No token provided');
      }
      return this.usersService.getUserByToken(token);
    } catch (error) {
      throw new Error('Error getting user by token: ' + error.message);
    }
  }
}
