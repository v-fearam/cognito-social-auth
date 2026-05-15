import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { EntraTokenVerifierService, EntraUser } from './cognito-token-verifier.service';

// Mock jose library
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  decodeJwt: jest.fn(),
  jwtVerify: jest.fn(),
}));

import { createRemoteJWKSet, decodeJwt, jwtVerify } from 'jose';

describe('EntraTokenVerifierService', () => {
  let service: EntraTokenVerifierService;

  const mockEnv = {
    ENTRA_TENANT_ID: '0a3af0e3-416b-4a6b-97e9-cb3a9a094449',
    ENTRA_TENANT_SUBDOMAIN: 'cognitomigration',
    ENTRA_API_CLIENT_ID: '6c959c17-63ba-4477-b66e-928d7d9ba937',
  };

  beforeEach(() => {
    process.env.ENTRA_TENANT_ID = mockEnv.ENTRA_TENANT_ID;
    process.env.ENTRA_TENANT_SUBDOMAIN = mockEnv.ENTRA_TENANT_SUBDOMAIN;
    process.env.ENTRA_API_CLIENT_ID = mockEnv.ENTRA_API_CLIENT_ID;

    jest.clearAllMocks();
  });

  it('should be defined', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EntraTokenVerifierService],
    }).compile();

    service = module.get<EntraTokenVerifierService>(EntraTokenVerifierService);
    expect(service).toBeDefined();
  });

  describe('verifyAccessToken', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [EntraTokenVerifierService],
      }).compile();
      service = module.get<EntraTokenVerifierService>(EntraTokenVerifierService);
    });

    it('should verify a valid access token', async () => {
      const mockPayload: EntraUser = {
        oid: 'user-123',
        email: 'user@example.com',
        preferred_username: 'testuser',
        iss: `https://${mockEnv.ENTRA_TENANT_SUBDOMAIN}.ciamlogin.com/${mockEnv.ENTRA_TENANT_ID}/v2.0`,
        aud: mockEnv.ENTRA_API_CLIENT_ID,
        scp: 'read',
        tier: 'pro',
        roles: ['viewer'],
      };

      (decodeJwt as jest.Mock).mockReturnValue({
        iss: mockPayload.iss,
        aud: mockPayload.aud,
      });
      (createRemoteJWKSet as jest.Mock).mockReturnValue(jest.fn());
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: mockPayload,
      });

      const token = 'valid-token';
      const result = await service.verifyAccessToken(token);

      expect(result).toEqual(mockPayload);
      expect(jwtVerify).toHaveBeenCalled();
      expect(result.tier).toBe('pro');
    });

    it('should throw UnauthorizedException if oid is missing', async () => {
      const mockPayload = {
        iss: `https://${mockEnv.ENTRA_TENANT_SUBDOMAIN}.ciamlogin.com/${mockEnv.ENTRA_TENANT_ID}/v2.0`,
        aud: mockEnv.ENTRA_API_CLIENT_ID,
      };

      (decodeJwt as jest.Mock).mockReturnValue({
        iss: mockPayload.iss,
        aud: mockPayload.aud,
      });
      (createRemoteJWKSet as jest.Mock).mockReturnValue(jest.fn());
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: mockPayload,
      });

      const token = 'invalid-token';
      await expect(service.verifyAccessToken(token)).rejects.toThrow(
        'Token is missing oid claim',
      );
    });

    it('should throw UnauthorizedException if audience does not match', async () => {
      const tokenIssuer =
        `https://${mockEnv.ENTRA_TENANT_SUBDOMAIN}.ciamlogin.com/${mockEnv.ENTRA_TENANT_ID}/v2.0`;

      (decodeJwt as jest.Mock).mockReturnValue({
        iss: tokenIssuer,
        aud: 'different-audience',
      });
      (createRemoteJWKSet as jest.Mock).mockReturnValue(jest.fn());
      (jwtVerify as jest.Mock).mockRejectedValue(new Error('unexpected "aud" claim value'));

      const token = 'token-for-different-client';
      await expect(service.verifyAccessToken(token)).rejects.toThrow(
        'Token verification failed',
      );
    });

    it('should throw UnauthorizedException if Entra is not configured', async () => {
      delete process.env.ENTRA_TENANT_ID;

      (decodeJwt as jest.Mock).mockReturnValue({
        iss: `https://${mockEnv.ENTRA_TENANT_SUBDOMAIN}.ciamlogin.com/${mockEnv.ENTRA_TENANT_ID}/v2.0`,
        aud: mockEnv.ENTRA_API_CLIENT_ID,
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [EntraTokenVerifierService],
      }).compile();

      const serviceWithoutEnv = module.get<EntraTokenVerifierService>(
        EntraTokenVerifierService,
      );

      await expect(serviceWithoutEnv.verifyAccessToken('any-token')).rejects.toThrow(
        'Entra environment is not configured on the backend',
      );

      process.env.ENTRA_TENANT_ID = mockEnv.ENTRA_TENANT_ID;
    });

    it('should include roles in the returned payload', async () => {
      const mockPayload: EntraUser = {
        oid: 'user-123',
        email: 'admin@example.com',
        iss: `https://${mockEnv.ENTRA_TENANT_SUBDOMAIN}.ciamlogin.com/${mockEnv.ENTRA_TENANT_ID}/v2.0`,
        aud: mockEnv.ENTRA_API_CLIENT_ID,
        roles: ['admin', 'viewer'],
      };

      (decodeJwt as jest.Mock).mockReturnValue({
        iss: mockPayload.iss,
        aud: mockPayload.aud,
      });
      (createRemoteJWKSet as jest.Mock).mockReturnValue(jest.fn());
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: mockPayload,
      });

      const token = 'admin-token';
      const result = await service.verifyAccessToken(token);

      expect(result.roles).toEqual(['admin', 'viewer']);
    });

    it('should preserve tier claim when present', async () => {
      const mockPayload: EntraUser = {
        oid: 'user-123',
        iss: `https://${mockEnv.ENTRA_TENANT_SUBDOMAIN}.ciamlogin.com/${mockEnv.ENTRA_TENANT_ID}/v2.0`,
        aud: mockEnv.ENTRA_API_CLIENT_ID,
        tier: 'enterprise',
      };

      (decodeJwt as jest.Mock).mockReturnValue({
        iss: mockPayload.iss,
        aud: mockPayload.aud,
      });
      (createRemoteJWKSet as jest.Mock).mockReturnValue(jest.fn());
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: mockPayload,
      });

      const result = await service.verifyAccessToken('tier-token');

      expect(result.tier).toBe('enterprise');
    });
  });
});
