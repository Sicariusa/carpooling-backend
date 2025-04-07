import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

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

  // Mock services
  const mockUsersService = {
    findOne: jest.fn(),
    findById: jest.fn()
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService }
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return null if user not found', async () => {
      mockUsersService.findOne.mockResolvedValue(null);

      const result = await service.validateUser(999999, 'password');

      expect(result).toBeNull();
      expect(mockUsersService.findOne).toHaveBeenCalledWith(999999);
    });

    it('should return user without password if validation succeeds', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(123456, 'password');
      const { password, ...expectedUser } = mockUser;

      expect(result).toEqual(expectedUser);
      expect(mockUsersService.findOne).toHaveBeenCalledWith(123456);
      expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashed_password');
    });

    it('should return null if password is invalid', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser(123456, 'wrong_password');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access token and user object when credentials are valid', async () => {
      // Mock validateUser to return user
      const userWithoutPassword = { ...mockUser };
      delete userWithoutPassword.password;
      
      jest.spyOn(service, 'validateUser').mockResolvedValue(userWithoutPassword);
      mockJwtService.sign.mockReturnValue('mocked_jwt_token');

      const result = await service.login(123456, 'password');

      expect(result).toEqual({
        accessToken: 'mocked_jwt_token',
        user: userWithoutPassword
      });
      
      expect(service.validateUser).toHaveBeenCalledWith(123456, 'password');
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        id: mockUser.id,
        universityId: mockUser.universityId,
        email: mockUser.email,
        role: mockUser.role,
        phoneNumber: null
      });
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValue(null);

      await expect(service.login(123456, 'wrong_password')).rejects.toThrow(UnauthorizedException);
      await expect(service.login(123456, 'wrong_password')).rejects.toThrow('Invalid credentials');
      
      expect(service.validateUser).toHaveBeenCalledWith(123456, 'wrong_password');
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });

  describe('verifyToken', () => {
    it('should return isValid true and user payload when token is valid', () => {
      const decodedToken = { 
        sub: mockUser.id, 
        universityId: mockUser.universityId 
      };
      mockJwtService.verify.mockReturnValue(decodedToken);

      const result = service.verifyToken('valid_token');

      expect(result).toEqual({
        isValid: true,
        user: decodedToken
      });
      expect(jwtService.verify).toHaveBeenCalledWith('valid_token');
    });

    it('should return isValid false and error message when token is invalid', () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = service.verifyToken('invalid_token');
      
      expect(result).toEqual({
        isValid: false,
        error: 'Invalid token'
      });
      expect(jwtService.verify).toHaveBeenCalledWith('invalid_token');
    });
  });

  describe('validateToken', () => {
    it('should strip Bearer prefix and validate token', async () => {
      const payload = { 
        sub: mockUser.id,
        id: mockUser.id,
        universityId: mockUser.universityId,
        email: mockUser.email,
        role: mockUser.role
      };
      
      mockJwtService.verify.mockReturnValue(payload);
      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await service.validateToken('Bearer valid_token');

      expect(result).toEqual({
        isValid: true,
        user: {
          id: mockUser.id,
          universityId: mockUser.universityId,
          email: mockUser.email,
          role: mockUser.role
        }
      });
      expect(jwtService.verify).toHaveBeenCalledWith('valid_token');
      expect(usersService.findById).toHaveBeenCalledWith(mockUser.id);
    });

    it('should handle tokens without Bearer prefix', async () => {
      const payload = { 
        sub: mockUser.id,
        universityId: mockUser.universityId
      };
      
      mockJwtService.verify.mockReturnValue(payload);
      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await service.validateToken('valid_token');

      expect(result.isValid).toBe(true);
      expect(jwtService.verify).toHaveBeenCalledWith('valid_token');
    });

    it('should return isValid false when user not found', async () => {
      const payload = { 
        sub: 'non-existent-id',
        universityId: 999999
      };
      
      mockJwtService.verify.mockReturnValue(payload);
      mockUsersService.findById.mockResolvedValue(null);

      const result = await service.validateToken('valid_token');

      expect(result).toEqual({
        isValid: false,
        error: 'User not found'
      });
    });

    it('should return isValid false when token is invalid', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      const result = await service.validateToken('expired_token');

      expect(result).toEqual({
        isValid: false,
        error: 'jwt expired'
      });
    });
  });
});