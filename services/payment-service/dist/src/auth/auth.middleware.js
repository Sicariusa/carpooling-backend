"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthMiddleware = void 0;
const common_1 = require("@nestjs/common");
const node_fetch_1 = __importDefault(require("node-fetch")); // Ensure you have the 'node-fetch' module installed for server-side fetching
let AuthMiddleware = class AuthMiddleware {
    async use(req, res, next) {
        const authHeader = req.headers.authorization;
        if (req.originalUrl === '/graphql' && req.method === 'GET') {
            return next();
        }
        if (!authHeader) {
            return res.status(401).json({ message: 'Authorization token is missing.' });
        }
        try {
            // Extract the token
            const token = authHeader.split(' ')[1];
            // Fetch the token validation from your user service
            const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3000';
            const response = await (0, node_fetch_1.default)(`${userServiceUrl}/auth/validate?token=${token}`);
            const result = await response.json();
            // If valid, attach the user to the request and proceed to the next middleware
            if (result.isValid && result.user) {
                req['user'] = result.user;
                next();
            }
            else {
                return res.status(401).json({ message: 'Invalid or expired token.' });
            }
        }
        catch (error) {
            console.error('❌ Error validating token:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
};
exports.AuthMiddleware = AuthMiddleware;
exports.AuthMiddleware = AuthMiddleware = __decorate([
    (0, common_1.Injectable)()
], AuthMiddleware);
//# sourceMappingURL=auth.middleware.js.map