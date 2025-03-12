import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from './prisma.service';
import { NotFoundException } from '@nestjs/common';
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
      create: jest.fn().mockImplementation(() => Promise.resolve(mockUser)),
      findMany: jest.fn().mockImplementation(() => Promise.resolve([mockUser])),
      findUnique: jest.fn().mockImplementation(() => Promise.resolve(mockUser)),
      update: jest.fn().mockImplementation(() => Promise.resolve(mockUser)),
      delete: jest.fn().mockImplementation(() => Promise.resolve(mockUser)),
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
      const result = await service.create(createUserInput);

      expect(bcrypt.hash).toHaveBeenCalledWith(createUserInput.password, 10);
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
      const result = await service.findOne(123456);

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { universityId: 123456 }
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaMock.user.findUnique.mockImplementationOnce(() => Promise.resolve(null));

      await expect(service.findOne(999999)).rejects.toThrow(NotFoundException);
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
      prismaMock.user.delete.mockImplementationOnce(() => Promise.reject(new Error()));

      await expect(service.remove(999999)).rejects.toThrow(NotFoundException);
    });
  });
});