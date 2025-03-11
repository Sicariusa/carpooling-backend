import { JwtService } from '@nestjs/jwt';
import { UsersService } from './users.service';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    constructor(usersService: UsersService, jwtService: JwtService);
    validateUser(universityId: number, password: string): Promise<any>;
    login(universityId: number, password: string): Promise<{
        accessToken: string;
        user: any;
    }>;
    verifyToken(token: string): any;
}
