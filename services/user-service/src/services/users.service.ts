import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { CreateUserInput } from 'src/dto/create-user.input';
import { UpdateUserInput } from 'src/dto/update-user.input.dto';


@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ✅ Create a new user
  async create(input: CreateUserInput) {
    return this.prisma.user.create({ data: input });
  }

  // ✅ Get all users
  async findAll() {
    return this.prisma.user.findMany();
  }

  // ✅ Get a user by ID
  async findOne(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  // ✅ Update a user
  async update(id: string, input: UpdateUserInput) {
    return this.prisma.user.update({ where: { id }, data: input });
  }

  // ✅ Delete a user
  async remove(id: string) {
    try {
      await this.prisma.user.delete({ where: { id } });
      return true;
    } catch (error) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }
}
