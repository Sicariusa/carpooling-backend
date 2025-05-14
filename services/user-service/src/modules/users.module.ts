import { Module } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { PrismaService } from '../services/prisma.service';
import { UsersResolver } from 'src/resolvers/users.resolver';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'defaultSecret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [UsersResolver, UsersService, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}



