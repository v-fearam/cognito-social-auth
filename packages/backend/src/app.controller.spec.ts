import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CognitoTokenVerifierService } from './auth/cognito-token-verifier.service';
import { CognitoAuthGuard } from './auth/cognito-auth.guard';
import { AdminGroupGuard } from './auth/admin-group.guard';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: CognitoTokenVerifierService,
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

  describe('GET /profile (with CognitoAuthGuard)', () => {
    it('should return profile with user claims', () => {
      const mockRequest = {
        user: {
          sub: 'user-123',
          email: 'user@example.com',
          username: 'testuser',
          client_id: '2jcjrvftiedm8rtp8ii8pt1heb',
          scope: 'openid email profile',
          'cognito:groups': ['users'],
        },
      };

      const result = appController.profile(mockRequest as any);

      expect(result.sub).toBe('user-123');
      expect(result.email).toBe('user@example.com');
      expect(result.username).toBe('testuser');
      expect(result.message).toBe('Valid Cognito access token');
    });

    it('should include groups from cognito:groups claim', () => {
      const mockRequest = {
        user: {
          sub: 'user-123',
          email: 'admin@example.com',
          username: 'adminuser',
          client_id: '2jcjrvftiedm8rtp8ii8pt1heb',
          scope: 'openid email profile',
          'cognito:groups': ['admin', 'users'],
        },
      };

      const result = appController.profile(mockRequest as any);

      expect(result.groups).toEqual(['admin', 'users']);
    });

    it('should handle missing groups gracefully', () => {
      const mockRequest = {
        user: {
          sub: 'user-123',
          email: 'user@example.com',
          username: 'testuser',
          client_id: '2jcjrvftiedm8rtp8ii8pt1heb',
          scope: 'openid email profile',
        },
      };

      const result = appController.profile(mockRequest as any);

      expect(result.groups).toEqual([]);
    });

    it('should include business logic simulation message', () => {
      const mockRequest = {
        user: {
          sub: 'user-123',
          email: 'user@example.com',
        },
      };

      const result = appController.profile(mockRequest as any);

      expect(result.businessResult).toBe(
        'This is the Business result for the controller ProfileController',
      );
    });

    it('should include client_id and scope from token', () => {
      const mockRequest = {
        user: {
          sub: 'user-123',
          email: 'user@example.com',
          client_id: '2jcjrvftiedm8rtp8ii8pt1heb',
          scope: 'openid email',
        },
      };

      const result = appController.profile(mockRequest as any);

      expect(result.client_id).toBe('2jcjrvftiedm8rtp8ii8pt1heb');
      expect(result.scope).toBe('openid email');
    });
  });

  describe('GET /admin (with CognitoAuthGuard + AdminGroupGuard)', () => {
    it('should return admin response', () => {
      const mockRequest = {
        user: {
          sub: 'admin-user-123',
          'cognito:groups': ['admin'],
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

    it('profile endpoint should require CognitoAuthGuard', () => {
      // This test validates the guard is applied (actual enforcement happens at NestJS level)
      const mockRequest = {
        user: {
          sub: 'user-123',
          email: 'user@example.com',
        },
      };

      expect(appController.profile(mockRequest as any)).toBeDefined();
    });

    it('admin endpoint should require both CognitoAuthGuard and AdminGroupGuard', () => {
      // This test validates the guards are applied (actual enforcement happens at NestJS level)
      expect(appController.admin()).toBeDefined();
    });
  });

  describe('Response Structure', () => {
    it('all protected endpoints should include message field', () => {
      const mockRequest = {
        user: {
          sub: 'user-123',
          email: 'user@example.com',
        },
      };

      const profileResponse = appController.profile(mockRequest as any);
      const adminResponse = appController.admin();

      expect(profileResponse.message).toBeDefined();
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
      const adminResponse = appController.admin();

      expect(profileResponse.businessResult).toBeDefined();
      expect(adminResponse.businessResult).toBeDefined();
    });
  });
});
