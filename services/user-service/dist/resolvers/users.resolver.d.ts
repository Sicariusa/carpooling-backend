import { CreateUserInput } from 'src/dto/create-user.input';
import { UpdateUserInput } from 'src/dto/update-user.input.dto';
import { UsersService } from 'src/services/users.service';
export declare class UsersResolver {
    private readonly usersService;
    constructor(usersService: UsersService);
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
    findOne(universityId: number): Promise<{
        email: string;
        universityId: number;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        phoneNumber: number | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    createUser(input: CreateUserInput): Promise<{
        email: string;
        universityId: number;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        phoneNumber: number | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
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
