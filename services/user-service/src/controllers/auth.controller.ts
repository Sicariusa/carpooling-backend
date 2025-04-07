import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { Public } from '../guards/auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  async login(@Body() loginDto: { universityId: number; password: string }) {
    return this.authService.login(loginDto.universityId, loginDto.password);
  }

  @Get('validate')
  @Public()
  async validateToken(@Query('token') token: string) {
    return this.authService.validateToken(token);
  }
} 