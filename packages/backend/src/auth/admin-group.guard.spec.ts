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
    process.env.COGNITO_ADMIN_GROUP = 'admin';
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow request if user is in admin group', () => {
      const mockRequest = {
        user: {
          sub: 'user-123',
          'cognito:groups': ['admin', 'users'],
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
          sub: 'user-456',
          'cognito:groups': ['users'],
        },
      } as unknown as AuthenticatedRequest;

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow(
        'Admin group is required',
      );
    });

    it('should throw ForbiddenException if user has no groups', () => {
      const mockRequest = {
        user: {
          sub: 'user-789',
          'cognito:groups': [],
        },
      } as unknown as AuthenticatedRequest;

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow(
        'Admin group is required',
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
        'Admin group is required',
      );
    });

    it('should throw ForbiddenException if groups are undefined', () => {
      const mockRequest = {
        user: {
          sub: 'user-123',
          'cognito:groups': undefined,
        },
      } as unknown as AuthenticatedRequest;

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow(
        'Admin group is required',
      );
    });

    it('should respect custom COGNITO_ADMIN_GROUP environment variable', () => {
      process.env.COGNITO_ADMIN_GROUP = 'superuser';

      const module = Test.createTestingModule({
        providers: [AdminGroupGuard],
      });

      // Recreate guard with new env var
      const testGuard = new AdminGroupGuard();

      const mockRequest = {
        user: {
          sub: 'user-123',
          'cognito:groups': ['superuser'],
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
      process.env.COGNITO_ADMIN_GROUP = 'admin';
    });

    it('should allow request if user has multiple groups including admin', () => {
      const mockRequest = {
        user: {
          sub: 'user-123',
          'cognito:groups': ['users', 'developers', 'admin', 'viewers'],
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
