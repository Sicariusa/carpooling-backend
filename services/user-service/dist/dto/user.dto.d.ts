import { Role } from '@prisma/client';
export declare class User {
    id: string;
    email: string;
    universityId: number;
    role: Role;
    phoneNumber?: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare class CreateUserInput {
    email: string;
    universityId: number;
    password: string;
    role?: Role;
    phoneNumber?: number;
}
export declare class UpdateUserInput {
    email?: string;
    universityId?: number;
    password?: string;
    role?: Role;
    phoneNumber?: number;
}
