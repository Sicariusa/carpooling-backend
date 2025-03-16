import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthMiddleware.name);

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        req['user'] = null;
        return next();
      }

      const token = authHeader.split(' ')[1];
      
      if (!token) {
        req['user'] = null;
        return next();
      }

      try {
        // Call the user service to validate the token
        const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3000';
        const response = await axios.get(`${userServiceUrl}/auth/validate`, {
          params: { token }
        });

        const { isValid, user, error } = response.data;

        if (isValid && user) {
          // Attach user information to the request
          req['user'] = user;
        } else {
          this.logger.warn(`Token validation failed: ${error}`);
          req['user'] = null;
        }
      } catch (error) {
        this.logger.error(`Error validating token: ${error.message}`);
        req['user'] = null;
      }
    } catch (error) {
      this.logger.error(`Middleware error: ${error.message}`);
      req['user'] = null;
    }

    next();
  }
} 