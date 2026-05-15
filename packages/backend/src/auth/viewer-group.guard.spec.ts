import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from './cognito-auth.guard';
import { ViewerGroupGuard } from './viewer-group.guard';

describe('ViewerGroupGuard', () => {
  let guard: ViewerGroupGuard;

  beforeEach(async () => {
    process.env.ENTRA_ADMIN_ROLE = 'admin';
    process.env.ENTRA_VIEWER_ROLE = 'viewer';

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
          oid: 'viewer-123',
          roles: ['viewer'],
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
          oid: 'admin-123',
          roles: ['admin'],
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
          oid: 'user-123',
          roles: ['reader'],
        },
      } as unknown as AuthenticatedRequest;

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow(
        'Viewer or admin role is required',
      );
    });

    it('should respect custom viewer group environment variable', () => {
      process.env.ENTRA_VIEWER_ROLE = 'readers';
      const customGuard = new ViewerGroupGuard();

      const mockRequest = {
        user: {
          oid: 'reader-123',
          roles: ['readers'],
        },
      } as unknown as AuthenticatedRequest;

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ExecutionContext;

      expect(customGuard.canActivate(mockContext)).toBe(true);
      process.env.ENTRA_VIEWER_ROLE = 'viewer';
    });
  });
});