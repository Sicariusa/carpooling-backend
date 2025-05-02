import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';
import axios from 'axios';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req;
   
    
    if (request.body.operationName === 'IntrospectionQuery') return true;

    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }
    
    try {
      // Validate the token with the user service
      const response = await axios.post(
        `${process.env.USER_SERVICE_URL || 'http://localhost:3000'}/graphql`,
        {
          query: `
            query ValidateToken($token: String!) {
              validateToken(token: $token) {
                isValid
                error
                user {
                  id
                  universityId
                  email
                  role
                  phoneNumber
                }
              }
            }
          `,
          variables: {
            token
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      const result = response.data.data.validateToken;
      
      if (!result.isValid) {
        throw new UnauthorizedException(result.error || 'Invalid token');
      }
      
      // Attach the user data to the request for use in resolvers
      request.user = result.user;
      if (!request.user.roles) {
        request.user.roles = request.user.role ? [request.user.role] : [];
        delete request.user.role;
      }
      return true;
    } catch (error: any) {
      throw new UnauthorizedException('Authentication failed: ' + (error.message || 'Unknown error'));
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) return undefined;
    
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
