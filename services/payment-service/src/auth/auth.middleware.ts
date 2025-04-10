import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import fetch from 'node-fetch'; // Ensure you have the 'node-fetch' module installed for server-side fetching

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    console.log('Auth Middleware - Request URL:', req.originalUrl); // Log request URL

    const authHeader = req.headers.authorization;

    // Skip authorization for the GraphQL GET method and Webhook POST method
    if (req.originalUrl === '/graphql' && req.method === 'GET') {
      return next();
    }
    if (req.originalUrl === '/webhook' && req.method === 'POST') {
      console.log('Webhook request allowed without authentication');
      console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY);
      console.log('STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET);


      return next(); // Allow the webhook request without authentication
    }
    if (req.originalUrl === '/webhook' && req.method === 'GET') {
      return next(); // Allow the webhook request without authentication
    }


    // If there's no auth header, return 401 for other routes
    if (!authHeader) {
      return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    try {
      // Extract the token
      const token = authHeader.split(' ')[1];

      // Fetch the token validation from your user service
      const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3000';
      const response = await fetch(`${userServiceUrl}/auth/validate?token=${token}`);
      const result = await response.json();

      interface AuthResponse {
        isValid: boolean;
        user?: any;
      }

      // If valid, attach the user to the request and proceed to the next middleware
      if (result.isValid && result.user) {
        req['user'] = result.user;
        next();
      } else {
        return res.status(401).json({ message: 'Invalid or expired token.' });
      }
    } catch (error) {
      console.error('❌ Error validating token:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
}
