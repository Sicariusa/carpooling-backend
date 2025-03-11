import { Role } from '@prisma/client';
export declare class UpdateUserInput {
    email?: string;
    universityId?: number;
    password?: string;
    role?: Role;
    phoneNumber?: number;
}
