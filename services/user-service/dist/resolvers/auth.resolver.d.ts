import { AuthService } from '../services/auth.service';
import { User } from '../schema/user';
export declare class AuthResolver {
    private readonly authService;
    constructor(authService: AuthService);
    login(universityId: number, password: string): Promise<{
        accessToken: string;
        user: any;
    }>;
}
export declare class LoginResponse {
    accessToken: string;
    user: User;
}
