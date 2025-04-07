import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from './users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(universityId: number, password: string): Promise<any> {
    const user = await this.usersService.findOne(universityId);
    
    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(universityId: number, password: string) {
    const user = await this.validateUser(universityId, password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    const payload = { 
      sub: user.id, 
      id: user.id,
      universityId: user.universityId,
      email: user.email,
      role: user.role,
      phoneNumber: user.phoneNumber || null
    };
    
    return {
      accessToken: this.jwtService.sign(payload),
      user,
    };
  }

  verifyToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      return {
        isValid: true,
        user: payload
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  // Method to be used by other services to validate tokens
  async validateToken(token: string) {
    try {
      // Remove 'Bearer ' prefix if present
      const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token;
      
      // Verify the token
      const payload = this.jwtService.verify(actualToken);
      
      // Optionally fetch the latest user data to ensure it's up to date
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        return {
          isValid: false,
          error: 'User not found'
        };
      }
      
      // Return user information that other services might need
      return {
        isValid: true,
        user: {
          id: user.id,
          universityId: user.universityId,
          email: user.email,
          role: user.role
        }
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }
} 