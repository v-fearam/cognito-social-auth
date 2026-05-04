import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { CognitoAuthGuard } from './cognito-auth.guard';
import { CognitoTokenVerifierService, CognitoUser } from './cognito-token-verifier.service';

describe('CognitoAuthGuard', () => {
  let guard: CognitoAuthGuard;
  let tokenVerifier: CognitoTokenVerifierService;

  const mockCognitoUser: CognitoUser = {
    sub: 'user-123',
    email: 'user@example.com',
    username: 'testuser',
    client_id: '2jcjrvftiedm8rtp8ii8pt1heb',
    token_use: 'access',
    scope: 'openid email profile',
    'cognito:groups': ['users'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CognitoAuthGuard,
        {
          provide: CognitoTokenVerifierService,
          useValue: {
            verifyAccessToken: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<CognitoAuthGuard>(CognitoAuthGuard);
    tokenVerifier = module.get<CognitoTokenVerifierService>(CognitoTokenVerifierService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow request with valid Bearer token', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token',
        },
      };

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ExecutionContext;

      (tokenVerifier.verifyAccessToken as jest.Mock).mockResolvedValue(mockCognitoUser);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(tokenVerifier.verifyAccessToken).toHaveBeenCalledWith('valid-token');
      expect(mockRequest.user).toEqual(mockCognitoUser);
    });

    it('should throw UnauthorizedException if Authorization header is missing', async () => {
      const mockRequest = {
        headers: {},
      };

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Missing Bearer token',
      );
    });

    it('should throw UnauthorizedException if Authorization header does not have Bearer prefix', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Basic invalid-token',
        },
      };

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Missing Bearer token',
      );
    });

    it('should extract Bearer token and verify it', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer my-special-token',
        },
      };

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ExecutionContext;

      (tokenVerifier.verifyAccessToken as jest.Mock).mockResolvedValue(mockCognitoUser);

      await guard.canActivate(mockContext);

      expect(tokenVerifier.verifyAccessToken).toHaveBeenCalledWith('my-special-token');
    });

    it('should propagate errors from token verifier', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer expired-token',
        },
      };

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ExecutionContext;

      (tokenVerifier.verifyAccessToken as jest.Mock).mockRejectedValue(
        new UnauthorizedException('Token expired'),
      );

      await expect(guard.canActivate(mockContext)).rejects.toThrow('Token expired');
    });

    it('should attach user to request after successful verification', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token',
        },
      };

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ExecutionContext;

      (tokenVerifier.verifyAccessToken as jest.Mock).mockResolvedValue(mockCognitoUser);

      await guard.canActivate(mockContext);

      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user.sub).toBe('user-123');
      expect(mockRequest.user.email).toBe('user@example.com');
    });
  });
});
