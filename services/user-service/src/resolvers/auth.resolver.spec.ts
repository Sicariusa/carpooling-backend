import { Test, TestingModule } from '@nestjs/testing';
import { AuthResolver } from './auth.resolver';
import { AuthService } from '../services/auth.service';
import { UnauthorizedException } from '@nestjs/common';

// Mock Kafka producer
jest.mock('src/utils/kafka', () => ({
  producer: {
    send: jest.fn().mockResolvedValue(true)
  }
}));

import { producer } from 'src/utils/kafka';

describe('AuthResolver', () => {
  let resolver: AuthResolver;
  let authService: AuthService;

  const mockUser = {
    id: 'user-uuid',
    universityId: 123456,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'PASSENGER',
    isDriver: false,
    isApproved: false,
    gender: 'Male',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockLoginResponse = {
    accessToken: 'jwt_token',
    user: mockUser
  };

  const mockAuthService = {
    login: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthResolver,
        { provide: AuthService, useValue: mockAuthService }
      ],
    }).compile();

    resolver = module.get<AuthResolver>(AuthResolver);
    authService = module.get<AuthService>(AuthService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('login', () => {
    it('should return access token and user on successful login', async () => {
      mockAuthService.login.mockResolvedValue(mockLoginResponse);

      const result = await resolver.login(123456, 'password');

      expect(result).toEqual(mockLoginResponse);
      expect(authService.login).toHaveBeenCalledWith(123456, 'password');
      expect(producer.send).toHaveBeenCalledWith({
        topic: 'user-events',
        messages: [
          {
            value: JSON.stringify({
              event: 'USER_VERIFIED',
              userId: 123456
            })
          }
        ]
      });
    });

    it('should handle unauthorized exception', async () => {
      mockAuthService.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'));

      await expect(resolver.login(123456, 'wrong_password'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should handle other errors properly', async () => {
      const error = new Error('Internal server error');
      mockAuthService.login.mockRejectedValue(error);

      await expect(resolver.login(123456, 'password'))
        .rejects.toThrow('Internal server error');
    });
  });
});