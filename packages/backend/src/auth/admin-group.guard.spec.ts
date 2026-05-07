import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminGroupGuard } from './admin-group.guard';
import { AuthenticatedRequest } from './cognito-auth.guard';

describe('AdminGroupGuard', () => {
  let guard: AdminGroupGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminGroupGuard],
    }).compile();

    guard = module.get<AdminGroupGuard>(AdminGroupGuard);
    process.env.ENTRA_ADMIN_ROLE = 'admin';
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow request if user is in admin group', () => {
      const mockRequest = {
        user: {
          oid: 'user-123',
          roles: ['admin', 'viewer'],
        },
      } as unknown as AuthenticatedRequest;

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ExecutionContext;

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException if user is not in admin group', () => {
      const mockRequest = {
        user: {
          oid: 'user-456',
          roles: ['viewer'],
        },
      } as unknown as AuthenticatedRequest;

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow(
        'Admin role is required',
      );
    });

    it('should throw ForbiddenException if user has no groups', () => {
      const mockRequest = {
        user: {
          oid: 'user-789',
          roles: [],
        },
      } as unknown as AuthenticatedRequest;

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow(
        'Admin role is required',
      );
    });

    it('should throw ForbiddenException if user object is missing', () => {
      const mockRequest = {} as unknown as AuthenticatedRequest;

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow(
        'Admin role is required',
      );
    });

    it('should throw ForbiddenException if roles are undefined', () => {
      const mockRequest = {
        user: {
          oid: 'user-123',
          roles: undefined,
        },
      } as unknown as AuthenticatedRequest;

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow(
        'Admin role is required',
      );
    });

    it('should respect custom ENTRA_ADMIN_ROLE environment variable', () => {
      process.env.ENTRA_ADMIN_ROLE = 'superuser';

      const module = Test.createTestingModule({
        providers: [AdminGroupGuard],
      });

      // Recreate guard with new env var
      const testGuard = new AdminGroupGuard();

      const mockRequest = {
        user: {
          oid: 'user-123',
          roles: ['superuser'],
        },
      } as unknown as AuthenticatedRequest;

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ExecutionContext;

      const result = testGuard.canActivate(mockContext);

      expect(result).toBe(true);

      // Restore
      process.env.ENTRA_ADMIN_ROLE = 'admin';
    });

    it('should allow request if user has multiple roles including admin', () => {
      const mockRequest = {
        user: {
          oid: 'user-123',
          roles: ['reader', 'writer', 'admin'],
        },
      } as unknown as AuthenticatedRequest;

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ExecutionContext;

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });
  });
});
