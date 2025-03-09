import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { CreateUserInput } from 'src/dto/create-user.input';
import { UpdateUserInput } from 'src/dto/update-user.input.dto';

import { User } from 'src/schema/user';
import { UsersService } from 'src/sercvices/users.service';


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
  async findOne(@Args('id', { type: () => String }) id: string) {
    return this.usersService.findOne(id);
  }

  // ✅ Register a new user
  @Mutation(() => User, { name: 'registerUser' })
  async create(@Args('input') input: CreateUserInput) {
    return this.usersService.create(input);
  }

  // ✅ Update a user
  @Mutation(() => User, { name: 'updateUser' })
  async update(
    @Args('id', { type: () => String }) id: string,
    @Args('input') input: UpdateUserInput,
  ) {
    return this.usersService.update(id, input);
  }

  // ✅ Delete a user
  @Mutation(() => Boolean, { name: 'deleteUser' })
  async remove(@Args('id', { type: () => String }) id: string): Promise<boolean> {
    return this.usersService.remove(id);
  }
}
