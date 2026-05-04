import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthenticatedRequest } from './cognito-auth.guard';

@Injectable()
export class ViewerGroupGuard implements CanActivate {
  private readonly viewerGroup = process.env.COGNITO_VIEWER_GROUP || 'viewer';
  private readonly adminGroup = process.env.COGNITO_ADMIN_GROUP || 'admin';

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const groups = request.user?.['cognito:groups'] ?? [];

    if (!groups.includes(this.viewerGroup) && !groups.includes(this.adminGroup)) {
      throw new ForbiddenException('Viewer or admin group is required');
    }

    return true;
  }
}