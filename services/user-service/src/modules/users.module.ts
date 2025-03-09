import { Module } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { PrismaService } from '../services/prisma.service';
import { UsersResolver } from 'src/resolvers/users.resolver';

@Module({
  providers: [UsersResolver, UsersService, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}



