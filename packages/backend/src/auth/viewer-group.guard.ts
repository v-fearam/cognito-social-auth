import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthenticatedRequest } from './cognito-auth.guard';

@Injectable()
export class ViewerGroupGuard implements CanActivate {
  private readonly viewerRole = process.env.ENTRA_VIEWER_ROLE || 'viewer';
  private readonly adminRole = process.env.ENTRA_ADMIN_ROLE || 'admin';

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const roles = request.user?.roles ?? [];

    if (!roles.includes(this.viewerRole) && !roles.includes(this.adminRole)) {
      throw new ForbiddenException('Viewer or admin role is required');
    }

    return true;
  }
}