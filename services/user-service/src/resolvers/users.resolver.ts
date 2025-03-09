import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { CreateUserInput } from 'src/dto/create-user.input';
import { UpdateUserInput } from 'src/dto/update-user.input.dto';


import { User } from 'src/schema/user';
import { UsersService } from 'src/services/users.service';


@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  // ✅ Get all users
  @Query(() => [User], { name: 'getAllUsers' })
  async findAll() {
    return this.usersService.findAll();
  }

  // ✅ Get user by ID
  @Query(() => User, { name: 'getUserById' })
  async findOne(@Args('universityId', { type: () => Int }) universityId: number) {
    return this.usersService.findOne(universityId);
  }

  // ✅ Register a new user
  @Mutation(() => User, { name: 'registerUser' })
  async createUser(@Args('input') input: CreateUserInput) {
    return this.usersService.create(input);
  }

  // ✅ Update a user
  @Mutation(() => User, { name: 'updateUser' })
  async update(
    @Args('universityId', { type: () => Int }) universityId: number,
    @Args('input') input: UpdateUserInput,
  ) {
    return this.usersService.update(universityId, input);
  }

  // ✅ Delete a user
  @Mutation(() => Boolean, { name: 'deleteUser' })
  async remove(@Args('universityId', { type: () => Int }) universityId: number): Promise<boolean> {
    return this.usersService.remove(universityId);
  }
}
