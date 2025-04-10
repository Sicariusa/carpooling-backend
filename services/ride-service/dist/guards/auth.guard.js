"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthGuard = void 0;
const common_1 = require("@nestjs/common");
const graphql_1 = require("@nestjs/graphql");
const axios_1 = require("axios");
let AuthGuard = class AuthGuard {
    async canActivate(context) {
        const ctx = graphql_1.GqlExecutionContext.create(context);
        const request = ctx.getContext().req;
        const token = this.extractTokenFromHeader(request);
        if (!token) {
            throw new common_1.UnauthorizedException('Missing authentication token');
        }
        try {
            const response = await axios_1.default.post(`${process.env.USER_SERVICE_URL || 'http://localhost:3000'}/graphql`, {
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
            }, {
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            const result = response.data.data.validateToken;
            if (!result.isValid) {
                throw new common_1.UnauthorizedException(result.error || 'Invalid token');
            }
            request.user = result.user;
            return true;
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Authentication failed: ' + (error.message || 'Unknown error'));
        }
    }
    extractTokenFromHeader(request) {
        const authHeader = request.headers.authorization;
        if (!authHeader)
            return undefined;
        const [type, token] = authHeader.split(' ');
        return type === 'Bearer' ? token : undefined;
    }
};
exports.AuthGuard = AuthGuard;
exports.AuthGuard = AuthGuard = __decorate([
    (0, common_1.Injectable)()
], AuthGuard);
//# sourceMappingURL=auth.guard.js.map