import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { CreateUserInput } from 'src/dto/create-user.input';
import { UpdateUserInput } from 'src/dto/update-user.input.dto';


import { User } from 'src/schema/user';
import { UsersService } from 'src/services/users.service';
import { Roles, Public } from '../guards/auth.guard';
import { Role } from '@prisma/client';

// getdriverrides fe ride service
// getMyBookings rides from booking service

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
}
