import { Role } from '@prisma/client';
export declare class CreateUserInput {
    email: string;
    universityId: number;
    password: string;
    role?: Role;
    phoneNumber?: number;
}
