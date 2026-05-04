import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from './cognito-auth.guard';
import { ViewerGroupGuard } from './viewer-group.guard';

describe('ViewerGroupGuard', () => {
  let guard: ViewerGroupGuard;

  beforeEach(async () => {
    process.env.COGNITO_ADMIN_GROUP = 'admin';
    process.env.COGNITO_VIEWER_GROUP = 'viewer';

    const module: TestingModule = await Test.createTestingModule({
      providers: [ViewerGroupGuard],
    }).compile();

    guard = module.get<ViewerGroupGuard>(ViewerGroupGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow request if user is in viewer group', () => {
      const mockRequest = {
        user: {
          sub: 'viewer-123',
          'cognito:groups': ['viewer'],
        },
      } as unknown as AuthenticatedRequest;

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('should allow request if user is in admin group', () => {
      const mockRequest = {
        user: {
          sub: 'admin-123',
          'cognito:groups': ['admin'],
        },
      } as unknown as AuthenticatedRequest;

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('should throw if user has neither viewer nor admin group', () => {
      const mockRequest = {
        user: {
          sub: 'user-123',
          'cognito:groups': ['users'],
        },
      } as unknown as AuthenticatedRequest;

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow(
        'Viewer or admin group is required',
      );
    });

    it('should respect custom viewer group environment variable', () => {
      process.env.COGNITO_VIEWER_GROUP = 'readers';
      const customGuard = new ViewerGroupGuard();

      const mockRequest = {
        user: {
          sub: 'reader-123',
          'cognito:groups': ['readers'],
        },
      } as unknown as AuthenticatedRequest;

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ExecutionContext;

      expect(customGuard.canActivate(mockContext)).toBe(true);
      process.env.COGNITO_VIEWER_GROUP = 'viewer';
    });
  });
});