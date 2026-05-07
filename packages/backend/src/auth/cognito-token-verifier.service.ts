import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, decodeJwt, jwtVerify, JWTPayload } from 'jose';

export interface EntraUser extends JWTPayload {
  oid: string;
  email?: string;
  preferred_username?: string;
  azp?: string;
  scp?: string;
  tier?: string;
  roles?: string[];
}

@Injectable()
export class EntraTokenVerifierService {
  private readonly tenantId = process.env.ENTRA_TENANT_ID;
  private readonly tenantSubdomain = process.env.ENTRA_TENANT_SUBDOMAIN;
  private readonly tenantDomain =
    process.env.ENTRA_TENANT_DOMAIN ||
    (this.tenantSubdomain ? `${this.tenantSubdomain}.onmicrosoft.com` : undefined);
  private readonly apiClientId = process.env.ENTRA_API_CLIENT_ID;

  private get expectedIssuers(): string[] {
    if (!this.tenantId || !this.tenantDomain) {
      throw new UnauthorizedException('Entra environment is not configured on the backend');
    }

    const hostCandidates = [this.tenantSubdomain, this.tenantId].filter(
      (value): value is string => Boolean(value),
    );

    const issuers = hostCandidates.flatMap((host) => {
      const baseWithTenantId = `https://${host}.ciamlogin.com/${this.tenantId}/v2.0`;
      const baseWithTenantDomain = `https://${host}.ciamlogin.com/${this.tenantDomain}/v2.0`;

      return [
        baseWithTenantId,
        `${baseWithTenantId}/`,
        baseWithTenantDomain,
        `${baseWithTenantDomain}/`,
      ];
    });

    return [...new Set(issuers)];
  }

  private getJwksUriFromIssuer(issuer: string): string {
    const issuerUrl = new URL(issuer);
    const normalizedPath = issuerUrl.pathname.replace(/\/v2\.0\/?$/, '');
    return `${issuerUrl.origin}${normalizedPath}/discovery/v2.0/keys`;
  }

  async verifyAccessToken(token: string): Promise<EntraUser> {
    const tokenPreview = token.length > 25 ? `${token.slice(0, 25)}...` : token;
    const tokenClaims = decodeJwt(token);
    const tokenIssuer = typeof tokenClaims.iss === 'string' ? tokenClaims.iss : undefined;

    if (!tokenIssuer) {
      throw new UnauthorizedException('Token is missing iss claim');
    }

    if (!this.expectedIssuers.includes(tokenIssuer)) {
      console.error('[AUTH] token issuer not allowed', {
        tokenIssuer,
        expectedIssuers: this.expectedIssuers,
      });
      throw new UnauthorizedException('Token issuer is not allowed for this API');
    }

    const jwksUri = this.getJwksUriFromIssuer(tokenIssuer);
    console.log('[AUTH] verifyAccessToken start', {
      expectedIssuers: this.expectedIssuers,
      jwksUri,
      audience: this.apiClientId,
      tokenIssuer,
      tokenAudience: tokenClaims.aud,
      tokenPreview,
    });

    const jwks = createRemoteJWKSet(new URL(jwksUri));

    let payload: JWTPayload;
    try {
      const result = await jwtVerify(token, jwks, {
        issuer: tokenIssuer,
        audience: this.apiClientId,
      });
      payload = result.payload;
      console.log('[AUTH] token verified', {
        aud: payload.aud,
        iss: payload.iss,
        oid: (payload as EntraUser).oid,
        scp: (payload as EntraUser).scp,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Token verification failed';
      console.error('[AUTH] token verification error', {
        message,
        expectedIssuers: this.expectedIssuers,
        tokenIssuer,
        tokenAudience: tokenClaims.aud,
        audience: this.apiClientId,
      });
      throw new UnauthorizedException(`Token verification failed: ${message}`);
    }

    const entraPayload = payload as EntraUser;

    if (!entraPayload.oid) {
      throw new UnauthorizedException('Token is missing oid claim');
    }

    return entraPayload;
  }
}
