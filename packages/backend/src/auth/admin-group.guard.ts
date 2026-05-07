import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthenticatedRequest } from './cognito-auth.guard';

@Injectable()
export class AdminGroupGuard implements CanActivate {
  private readonly adminRole = process.env.ENTRA_ADMIN_ROLE || 'admin';

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const roles = request.user?.roles ?? [];

    if (!roles.includes(this.adminRole)) {
      throw new ForbiddenException('Admin role is required');
    }

    return true;
  }
}
