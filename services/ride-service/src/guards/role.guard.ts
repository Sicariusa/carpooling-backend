import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      'roles', [
        context.getHandler(),
        context.getClass()
      ]
    );
    
    if (!requiredRoles) return true;

    const ctx = GqlExecutionContext.create(context);
    if (ctx.getContext().req.body.operationName === 'IntrospectionQuery') {
      return true;
    }
    const { user } = ctx.getContext().req;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const hasRole = requiredRoles.some(role => user.role === role);
    if (!hasRole) {
      throw new ForbiddenException(`User with role ${user.role} does not have the required role ${requiredRoles.join(' or ')}`);
    }

    return true;
  }
}
