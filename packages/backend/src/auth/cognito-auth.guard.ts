import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { CognitoTokenVerifierService, CognitoUser } from './cognito-token-verifier.service';

export interface AuthenticatedRequest extends Request {
  user?: CognitoUser;
}

@Injectable()
export class CognitoAuthGuard implements CanActivate {
  constructor(private readonly tokenVerifier: CognitoTokenVerifierService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Bearer token');
    }

    const token = authHeader.substring('Bearer '.length);
    request.user = await this.tokenVerifier.verifyAccessToken(token);
    return true;
  }
}
