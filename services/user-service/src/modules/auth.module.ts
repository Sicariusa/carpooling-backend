import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from '../services/auth.service';
import { AuthResolver } from '../resolvers/auth.resolver';
import { UsersModule } from './users.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from '../guards/auth.guard';

@Module({
  imports: [
    UsersModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'KZ8+W5gGyl8bABMjrsQpOSMJIu5BH94cwkp+5qtv3GM=', // Use environment variable in production
      signOptions: { expiresIn: '24h' },
    }),
  ],
  providers: [
    AuthService, 
    AuthResolver,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    }
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {} 