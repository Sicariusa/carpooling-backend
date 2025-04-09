import { Test, TestingModule } from '@nestjs/testing';
import { UsersResolver } from './users.resolver';
import { UsersService } from '../services/users.service';
import { NotFoundException } from '@nestjs/common';
import { CreateUserInput } from '../dto/create-user.input';
import { UpdateUserInput } from '../dto/update-user.input.dto';
import { Role } from '@prisma/client';

// Mock PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  })),
  Role: {
    PASSENGER: 'PASSENGER',
    DRIVER: 'DRIVER',
    ADMIN: 'ADMIN'
  }
}));

describe('UsersResolver', () => {
  let resolver: UsersResolver;
  let usersService: UsersService;

  // Mock user data
  const mockUser = {
    id: 'user-uuid',
    universityId: 123456,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    password: 'hashed_password',
    role: 'PASSENGER',
    isDriver: false,
    isApproved: false,
    gender: 'Male',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Mock UsersService
  const mockUsersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersResolver,
        { provide: UsersService, useValue: mockUsersService }
      ],
    }).compile();

    resolver = module.get<UsersResolver>(UsersResolver);
    usersService = module.get<UsersService>(UsersService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const mockUsers = [mockUser, { ...mockUser, universityId: 654321 }];
      mockUsersService.findAll.mockResolvedValue(mockUsers);

      const result = await resolver.findAll();

      expect(result).toEqual(mockUsers);
      expect(usersService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a user if found', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);

      const result = await resolver.findOne(123456);

      expect(result).toEqual(mockUser);
      expect(usersService.findOne).toHaveBeenCalledWith(123456);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersService.findOne.mockRejectedValue(
        new NotFoundException('User with university ID 999999 not found')
      );

      await expect(resolver.findOne(999999)).rejects.toThrow(NotFoundException);
      await expect(resolver.findOne(999999)).rejects.toThrow(
        'User with university ID 999999 not found'
      );
    });
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const createUserInput: CreateUserInput = {
        universityId: 123456,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'password',
        role: Role.PASSENGER,
        phoneNumber: 1234567890
      };

      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await resolver.createUser(createUserInput);

      expect(result).toEqual(mockUser);
      expect(usersService.create).toHaveBeenCalledWith(createUserInput);
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const updateUserInput: UpdateUserInput = {
        email: 'updated@example.com',
      };

      const updatedUser = { ...mockUser, ...updateUserInput };
      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await resolver.update(123456, updateUserInput);

      expect(result).toEqual(updatedUser);
      expect(usersService.update).toHaveBeenCalledWith(123456, updateUserInput);
    });

    it('should throw NotFoundException if user not found', async () => {
      const updateUserInput: UpdateUserInput = {
        email: 'updated@example.com'
      };

      mockUsersService.update.mockRejectedValue(
        new NotFoundException('User with university ID 999999 not found')
      );

      await expect(resolver.update(999999, updateUserInput)).rejects.toThrow(NotFoundException);
      await expect(resolver.update(999999, updateUserInput)).rejects.toThrow(
        'User with university ID 999999 not found'
      );
    });
  });

  describe('remove', () => {
    it('should remove a user', async () => {
      mockUsersService.remove.mockResolvedValue(true);

      const result = await resolver.remove(123456);

      expect(result).toBe(true);
      expect(usersService.remove).toHaveBeenCalledWith(123456);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersService.remove.mockRejectedValue(
        new NotFoundException('User with university ID 999999 not found')
      );

      await expect(resolver.remove(999999)).rejects.toThrow(NotFoundException);
      await expect(resolver.remove(999999)).rejects.toThrow(
        'User with university ID 999999 not found'
      );
    });
  });
});