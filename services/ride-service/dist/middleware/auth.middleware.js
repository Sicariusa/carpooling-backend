"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AuthMiddleware_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthMiddleware = void 0;
const common_1 = require("@nestjs/common");
let AuthMiddleware = AuthMiddleware_1 = class AuthMiddleware {
    constructor() {
        this.logger = new common_1.Logger(AuthMiddleware_1.name);
    }
    async use(req, res, next) {
        const authHeader = req.headers.authorization;
        if (authHeader) {
            try {
                const token = authHeader.split(' ')[1];
                const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3003';
                const response = await fetch(`${userServiceUrl}/auth/validate?token=${token}`);
                const result = await response.json();
                if (result.isValid && result.user) {
                    req['user'] = result.user;
                    this.logger.log(`Authenticated user: ${result.user.email}`);
                }
                else {
                    this.logger.warn(`Invalid token: ${result.error}`);
                }
            }
            catch (error) {
                this.logger.error('Error validating token:', error instanceof Error ? error.message : String(error));
            }
        }
        next();
    }
};
exports.AuthMiddleware = AuthMiddleware;
exports.AuthMiddleware = AuthMiddleware = AuthMiddleware_1 = __decorate([
    (0, common_1.Injectable)()
], AuthMiddleware);
//# sourceMappingURL=auth.middleware.js.map