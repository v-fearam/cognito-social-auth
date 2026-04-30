import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';

export interface CognitoUser extends JWTPayload {
  sub: string;
  username?: string;
  email?: string;
  client_id?: string;
  token_use?: string;
  scope?: string;
  'cognito:groups'?: string[];
}

@Injectable()
export class CognitoTokenVerifierService {
  private readonly region = process.env.COGNITO_REGION;
  private readonly userPoolId = process.env.COGNITO_USER_POOL_ID;
  private readonly appClientId = process.env.COGNITO_APP_CLIENT_ID;

  private get issuer(): string {
    if (!this.region || !this.userPoolId) {
      throw new UnauthorizedException('Cognito environment is not configured on the backend');
    }

    return `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}`;
  }

  async verifyAccessToken(token: string): Promise<CognitoUser> {
    const jwks = createRemoteJWKSet(new URL(`${this.issuer}/.well-known/jwks.json`));

    const { payload } = await jwtVerify(token, jwks, {
      issuer: this.issuer,
    });

    const cognitoPayload = payload as CognitoUser;

    if (cognitoPayload.token_use !== 'access') {
      throw new UnauthorizedException('Expected Cognito access token');
    }

    if (this.appClientId && cognitoPayload.client_id !== this.appClientId) {
      throw new UnauthorizedException('Token was issued for a different app client');
    }

    return cognitoPayload;
  }
}
