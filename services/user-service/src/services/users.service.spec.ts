import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from './prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CreateUserInput } from '../dto/create-user.input';
import { UpdateUserInput } from '../dto/update-user.input.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
}));

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockUser = {
    id: 'user-uuid',
    universityId: 123456,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    password: 'hashed_password',
    role: Role.PASSENGER,
    isDriver: false,
    isApproved: false,
    gender: 'Male',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const prismaMock = {
    user: {
      create: jest.fn().mockResolvedValue(mockUser),
      findMany: jest.fn().mockResolvedValue([mockUser]),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue(mockUser),
      delete: jest.fn().mockResolvedValue(mockUser),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createUserInput: CreateUserInput = {
      universityId: 123456,
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: 'password',
      phoneNumber: 1234567890,
      role: Role.PASSENGER
    };

    it('should create a new user and hash the password', async () => {
      // Mock findUnique to return null (user doesn't exist yet)
      prismaMock.user.findUnique.mockResolvedValue(null);
      
      const result = await service.create(createUserInput);

      expect(bcrypt.hash).toHaveBeenCalledWith(createUserInput.password, 10);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: createUserInput.email }
      });
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          universityId: createUserInput.universityId,
          email: createUserInput.email,
          firstName: createUserInput.firstName,
          lastName: createUserInput.lastName,
          password: 'hashed_password',
          role: createUserInput.role,
        }
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictException if user with email already exists', async () => {
      // Mock findUnique to return a user (indicating email already exists)
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      // Use a single assertion with a try/catch block to verify both the exception type and message
      try {
        await service.create(createUserInput);
        // If we reach this line, the create method didn't throw an exception
        fail('Expected service.create to throw ConflictException');
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        expect(error.message).toBe(`User with email ${createUserInput.email} already exists`);
      }
      
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: createUserInput.email }
      });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const result = await service.findAll();

      expect(result).toEqual([mockUser]);
      expect(prisma.user.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a user if found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      
      const result = await service.findOne(123456);

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { universityId: 123456 }
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findById', () => {
    it('should return a user if found by ID', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      
      const result = await service.findById('user-uuid');

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-uuid' }
      });
    });

    it('should throw NotFoundException if user not found by ID', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateUserInput: UpdateUserInput = {
      email: 'updated@example.com',
    };

    it('should update a user', async () => {
      const result = await service.update(123456, updateUserInput);

      expect(result).toEqual(mockUser);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { universityId: 123456 },
        data: updateUserInput
      });
    });
  });

  describe('remove', () => {
    it('should return true when user is deleted', async () => {
      const result = await service.remove(123456);

      expect(result).toBe(true);
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { universityId: 123456 }
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      prismaMock.user.delete.mockRejectedValue(new Error());

      await expect(service.remove(999999)).rejects.toThrow(NotFoundException);
    });
  });
});