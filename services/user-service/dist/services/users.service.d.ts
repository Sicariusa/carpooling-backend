import { User } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { CreateUserInput } from 'src/dto/create-user.input';
import { UpdateUserInput } from 'src/dto/update-user.input.dto';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(input: CreateUserInput): Promise<{
        email: string;
        universityId: number;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        phoneNumber: number | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findAll(): Promise<{
        email: string;
        universityId: number;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        phoneNumber: number | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    findOne(universityId: number): Promise<User>;
    update(universityId: number, input: UpdateUserInput): Promise<{
        email: string;
        universityId: number;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        phoneNumber: number | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(universityId: number): Promise<boolean>;
}
