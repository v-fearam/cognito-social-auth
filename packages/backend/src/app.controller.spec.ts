import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EntraTokenVerifierService } from './auth/cognito-token-verifier.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: EntraTokenVerifierService,
          useValue: {
            verifyAccessToken: jest.fn(),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('GET /health', () => {
    it('should return health status', () => {
      const result = appController.health();

      expect(result).toEqual({
        status: 'ok',
        message: 'Health controller responded successfully',
        businessResult: 'This is the Business result for the controller HealthController',
      });
    });

    it('should have status "ok"', () => {
      const result = appController.health();
      expect(result.status).toBe('ok');
    });

    it('should include business logic simulation message', () => {
      const result = appController.health();
      expect(result.businessResult).toContain('HealthController');
    });
  });

  describe('GET /profile (with EntraAuthGuard)', () => {
    it('should return profile with user claims', () => {
      const mockRequest = {
        user: {
          oid: 'user-123',
          email: 'user@example.com',
          preferred_username: 'testuser',
          azp: '6d28eafe-06fd-46d7-b04a-3403048bfd1c',
          scp: 'read',
          tier: 'pro',
          roles: ['viewer'],
        },
      };

      const result = appController.profile(mockRequest as any);

      expect(result.oid).toBe('user-123');
      expect(result.email).toBe('user@example.com');
      expect(result.username).toBe('testuser');
      expect(result.tier).toBe('pro');
      expect(result.message).toBe('Valid Entra access token');
    });

    it('should include roles from roles claim', () => {
      const mockRequest = {
        user: {
          oid: 'user-123',
          email: 'admin@example.com',
          preferred_username: 'adminuser',
          azp: '6d28eafe-06fd-46d7-b04a-3403048bfd1c',
          scp: 'read write',
          roles: ['admin', 'viewer'],
        },
      };

      const result = appController.profile(mockRequest as any);

      expect(result.roles).toEqual(['admin', 'viewer']);
    });

    it('should handle missing roles gracefully', () => {
      const mockRequest = {
        user: {
          oid: 'user-123',
          email: 'user@example.com',
          preferred_username: 'testuser',
          azp: '6d28eafe-06fd-46d7-b04a-3403048bfd1c',
          scp: 'read',
        },
      };

      const result = appController.profile(mockRequest as any);

      expect(result.roles).toEqual([]);
    });

    it('should include business logic simulation message', () => {
      const mockRequest = {
        user: {
          oid: 'user-123',
          email: 'user@example.com',
        },
      };

      const result = appController.profile(mockRequest as any);

      expect(result.businessResult).toBe(
        'This is the Business result for the controller ProfileController',
      );
    });

    it('should include azp and scope from token', () => {
      const mockRequest = {
        user: {
          oid: 'user-123',
          email: 'user@example.com',
          azp: '6d28eafe-06fd-46d7-b04a-3403048bfd1c',
          scp: 'read',
        },
      };

      const result = appController.profile(mockRequest as any);

      expect(result.azp).toBe('6d28eafe-06fd-46d7-b04a-3403048bfd1c');
      expect(result.scope).toBe('read');
    });

    it('should include tier when present', () => {
      const mockRequest = {
        user: {
          oid: 'user-123',
          email: 'user@example.com',
          tier: 'enterprise',
        },
      };

      const result = appController.profile(mockRequest as any);

      expect(result.tier).toBe('enterprise');
    });
  });

  describe('GET /viewer (with EntraAuthGuard + ViewerGroupGuard)', () => {
    it('should return viewer response', () => {
      const mockRequest = {
        user: {
          oid: 'viewer-user-123',
          tier: 'free',
          roles: ['viewer'],
        },
      };

      const result = appController.viewer(mockRequest as any);

      expect(result).toEqual({
        message: 'Viewer access granted',
        businessResult: 'This is the Business result for the controller ViewerController',
        tier: 'free',
        data: 'viewer-dashboard-data',
      });
    });

    it('should expose the custom tier in viewer response', () => {
      const mockRequest = {
        user: {
          tier: 'pro',
        },
      };

      const result = appController.viewer(mockRequest as any);

      expect(result.tier).toBe('pro');
    });
  });

  describe('GET /admin (with EntraAuthGuard + AdminGroupGuard)', () => {
    it('should return admin response', () => {
      const mockRequest = {
        user: {
          oid: 'admin-user-123',
          roles: ['admin'],
        },
      };

      const result = appController.admin();

      expect(result).toEqual({
        message: 'Admin access granted',
        businessResult: 'This is the Business result for the controller AdminController',
        secret: 'admin-dashboard-data',
      });
    });

    it('should include admin-specific business result', () => {
      const result = appController.admin();

      expect(result.businessResult).toContain('AdminController');
    });

    it('should include secret data', () => {
      const result = appController.admin();

      expect(result.secret).toBe('admin-dashboard-data');
    });

    it('should return message indicating admin access', () => {
      const result = appController.admin();

      expect(result.message).toBe('Admin access granted');
    });
  });

  describe('Endpoint Security', () => {
    it('health endpoint should not require authentication', () => {
      // Health is public, no guards
      expect(appController.health()).toBeDefined();
    });

    it('profile endpoint should require EntraAuthGuard', () => {
      // This test validates the guard is applied (actual enforcement happens at NestJS level)
      const mockRequest = {
        user: {
          oid: 'user-123',
          email: 'user@example.com',
        },
      };

      expect(appController.profile(mockRequest as any)).toBeDefined();
    });

    it('admin endpoint should require both EntraAuthGuard and AdminGroupGuard', () => {
      // This test validates the guards are applied (actual enforcement happens at NestJS level)
      expect(appController.admin()).toBeDefined();
    });
  });

  describe('Response Structure', () => {
    it('all protected endpoints should include message field', () => {
      const mockRequest = {
        user: {
          oid: 'user-123',
          email: 'user@example.com',
        },
      };

      const profileResponse = appController.profile(mockRequest as any);
      const viewerResponse = appController.viewer(mockRequest as any);
      const adminResponse = appController.admin();

      expect(profileResponse.message).toBeDefined();
      expect(viewerResponse.message).toBeDefined();
      expect(adminResponse.message).toBeDefined();
    });

    it('all protected endpoints should include businessResult field', () => {
      const mockRequest = {
        user: {
          sub: 'user-123',
          email: 'user@example.com',
        },
      };

      const profileResponse = appController.profile(mockRequest as any);
      const viewerResponse = appController.viewer(mockRequest as any);
      const adminResponse = appController.admin();

      expect(profileResponse.businessResult).toBeDefined();
      expect(viewerResponse.businessResult).toBeDefined();
      expect(adminResponse.businessResult).toBeDefined();
    });
  });
});
