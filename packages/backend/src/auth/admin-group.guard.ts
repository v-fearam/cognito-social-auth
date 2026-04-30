import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthenticatedRequest } from './cognito-auth.guard';

@Injectable()
export class AdminGroupGuard implements CanActivate {
  private readonly adminGroup = process.env.COGNITO_ADMIN_GROUP || 'admin';

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const groups = request.user?.['cognito:groups'] ?? [];

    if (!groups.includes(this.adminGroup)) {
      throw new ForbiddenException('Admin group is required');
    }

    return true;
  }
}
