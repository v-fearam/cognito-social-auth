import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { CognitoTokenVerifierService, CognitoUser } from './cognito-token-verifier.service';

// Mock jose library
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
}));

import { createRemoteJWKSet, jwtVerify } from 'jose';

describe('CognitoTokenVerifierService', () => {
  let service: CognitoTokenVerifierService;

  const mockEnv = {
    COGNITO_REGION: 'us-east-2',
    COGNITO_USER_POOL_ID: 'us-east-2_EZsrSxHBb',
    COGNITO_APP_CLIENT_ID: '2jcjrvftiedm8rtp8ii8pt1heb',
  };

  beforeEach(() => {
    // Set environment variables
    process.env.COGNITO_REGION = mockEnv.COGNITO_REGION;
    process.env.COGNITO_USER_POOL_ID = mockEnv.COGNITO_USER_POOL_ID;
    process.env.COGNITO_APP_CLIENT_ID = mockEnv.COGNITO_APP_CLIENT_ID;

    jest.clearAllMocks();
  });

  it('should be defined', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CognitoTokenVerifierService],
    }).compile();

    service = module.get<CognitoTokenVerifierService>(CognitoTokenVerifierService);
    expect(service).toBeDefined();
  });

  describe('verifyAccessToken', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [CognitoTokenVerifierService],
      }).compile();
      service = module.get<CognitoTokenVerifierService>(CognitoTokenVerifierService);
    });

    it('should verify a valid access token', async () => {
      const mockPayload: CognitoUser = {
        sub: 'user-123',
        email: 'user@example.com',
        username: 'testuser',
        client_id: mockEnv.COGNITO_APP_CLIENT_ID,
        token_use: 'access',
        scope: 'openid email profile',
        'custom:tier': 'pro',
        'cognito:groups': ['users'],
      };

      (createRemoteJWKSet as jest.Mock).mockReturnValue(jest.fn());
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: mockPayload,
      });

      const token = 'valid-token';
      const result = await service.verifyAccessToken(token);

      expect(result).toEqual(mockPayload);
      expect(jwtVerify).toHaveBeenCalled();
      expect(result['custom:tier']).toBe('pro');
    });

    it('should throw UnauthorizedException if token_use is not "access"', async () => {
      const mockPayload: CognitoUser = {
        sub: 'user-123',
        token_use: 'id',
        client_id: mockEnv.COGNITO_APP_CLIENT_ID,
      };

      (createRemoteJWKSet as jest.Mock).mockReturnValue(jest.fn());
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: mockPayload,
      });

      const token = 'id-token';
      await expect(service.verifyAccessToken(token)).rejects.toThrow(
        'Expected Cognito access token',
      );
    });

    it('should throw UnauthorizedException if client_id does not match', async () => {
      const mockPayload: CognitoUser = {
        sub: 'user-123',
        token_use: 'access',
        client_id: 'different-client-id',
      };

      (createRemoteJWKSet as jest.Mock).mockReturnValue(jest.fn());
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: mockPayload,
      });

      const token = 'token-for-different-client';
      await expect(service.verifyAccessToken(token)).rejects.toThrow(
        'Token was issued for a different app client',
      );
    });

    it('should throw UnauthorizedException if Cognito is not configured', async () => {
      delete process.env.COGNITO_REGION;

      const module: TestingModule = await Test.createTestingModule({
        providers: [CognitoTokenVerifierService],
      }).compile();

      const serviceWithoutEnv = module.get<CognitoTokenVerifierService>(
        CognitoTokenVerifierService,
      );

      await expect(serviceWithoutEnv.verifyAccessToken('any-token')).rejects.toThrow(
        'Cognito environment is not configured on the backend',
      );

      // Restore env
      process.env.COGNITO_REGION = mockEnv.COGNITO_REGION;
    });

    it('should include cognito:groups in the returned payload', async () => {
      const mockPayload: CognitoUser = {
        sub: 'user-123',
        email: 'admin@example.com',
        token_use: 'access',
        client_id: mockEnv.COGNITO_APP_CLIENT_ID,
        'cognito:groups': ['admin', 'users'],
      };

      (createRemoteJWKSet as jest.Mock).mockReturnValue(jest.fn());
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: mockPayload,
      });

      const token = 'admin-token';
      const result = await service.verifyAccessToken(token);

      expect(result['cognito:groups']).toEqual(['admin', 'users']);
    });

    it('should preserve custom tier claim when present', async () => {
      const mockPayload: CognitoUser = {
        sub: 'user-123',
        token_use: 'access',
        client_id: mockEnv.COGNITO_APP_CLIENT_ID,
        'custom:tier': 'enterprise',
      };

      (createRemoteJWKSet as jest.Mock).mockReturnValue(jest.fn());
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: mockPayload,
      });

      const result = await service.verifyAccessToken('tier-token');

      expect(result['custom:tier']).toBe('enterprise');
    });
  });
});
