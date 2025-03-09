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

  // ✅ Get a user by universityId
  async findOne(universityId: number): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { universityId } });
    if (!user) {
      throw new NotFoundException(`User with university ID ${universityId} not found`);
    }
    return user;
  }

  // ✅ Update a user
  async update(universityId: number, input: UpdateUserInput) {
    return this.prisma.user.update({ where: { universityId }, data: input });
  }

  // ✅ Delete a user
  async remove(universityId: number) {
    try {
      await this.prisma.user.delete({ where: { universityId } });
      return true;
    } catch (error) {
      throw new NotFoundException(`User with university ID ${universityId} not found`);
    }
  }
}
