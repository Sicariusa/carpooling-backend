import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthMiddleware.name);

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3003';
        
        // Validate token with user service
        const response = await fetch(`${userServiceUrl}/auth/validate?token=${token}`);
        const result = await response.json();
        
        if (result.isValid && result.user) {
          // Attach user information to the request
          req['user'] = result.user;
          this.logger.log(`Authenticated user: ${result.user.email}`);
        } else {
          this.logger.warn(`Invalid token: ${result.error}`);
        }
      } catch (error) {
        this.logger.error('Error validating token:', error instanceof Error ? error.message : String(error));
      }
    }
    
    next();
  }
}
