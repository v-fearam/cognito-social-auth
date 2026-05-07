import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { EntraTokenVerifierService, EntraUser } from './cognito-token-verifier.service';

export interface AuthenticatedRequest extends Request {
  user?: EntraUser;
}

@Injectable()
export class EntraAuthGuard implements CanActivate {
  constructor(private readonly tokenVerifier: EntraTokenVerifierService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;
    console.log('[AUTH] guard invoked', {
      method: request.method,
      path: request.url,
      hasAuthorizationHeader: Boolean(authHeader),
    });

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('[AUTH] missing or invalid bearer header');
      throw new UnauthorizedException('Missing Bearer token');
    }

    const token = authHeader.substring('Bearer '.length);
    try {
      request.user = await this.tokenVerifier.verifyAccessToken(token);
      console.log('[AUTH] guard success', {
        oid: request.user?.oid,
        email: request.user?.email,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown guard error';
      console.error('[AUTH] guard failure', { message });
      throw error;
    }

    return true;
  }
}
