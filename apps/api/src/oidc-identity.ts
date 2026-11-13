import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import {
  JOSEAlgNotAllowed,
  JWTClaimValidationFailed,
  JWTExpired,
  JWTInvalid,
  JWKSNoMatchingKey,
  JWSInvalid,
  JWSSignatureVerificationFailed,
} from 'jose/errors';

export interface OidcIdentityConfig {
  readonly issuer: string;
  readonly audience: string;
  readonly jwksUri: string;
}

export interface VerifiedOidcIdentity {
  readonly issuer: string;
  readonly subject: string;
  readonly audience: string;
  readonly groups: readonly string[];
  readonly issuedAt: number;
  readonly expiresAt: number;
}

export class OidcIdentityProviderUnavailableError extends Error {}

export class OidcTokenInvalidError extends Error {}

function configuredEndpoint(value: string, field: string): URL {
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && url.protocol === 'http:'))
  ) {
    throw new Error(`${field} must be an HTTPS URL without embedded credentials or a fragment`);
  }
  return url;
}

export function oidcIdentityConfigFromEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): OidcIdentityConfig | undefined {
  const issuer = env.OMEGA_OIDC_ISSUER?.trim();
  const audience = env.OMEGA_OIDC_AUDIENCE?.trim();
  const jwksUri = env.OMEGA_OIDC_JWKS_URI?.trim();
  if (!issuer && !audience && !jwksUri) return undefined;
  if (!issuer || !audience || !jwksUri) {
    throw new Error('OMEGA_OIDC_ISSUER, OMEGA_OIDC_AUDIENCE, and OMEGA_OIDC_JWKS_URI must be configured together');
  }
  return { issuer, audience, jwksUri };
}

export function createOidcIdentityVerifier(config: OidcIdentityConfig) {
  const issuer = config.issuer.trim();
  configuredEndpoint(issuer, 'OIDC issuer');
  const jwksUri = configuredEndpoint(config.jwksUri, 'OIDC JWKS URI');
  const jwks = createRemoteJWKSet(jwksUri);
  const audience = config.audience.trim();
  if (!audience) throw new Error('OIDC audience must be a non-empty string');

  return async (token: string): Promise<VerifiedOidcIdentity> => {
    if (!token || token.length > 16_384) throw new Error('OIDC bearer token is invalid');
    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(token, jwks, {
        algorithms: ['RS256', 'ES256'],
        issuer,
        audience,
      }));
    } catch (error) {
      if (
        error instanceof JOSEAlgNotAllowed ||
        error instanceof JWTClaimValidationFailed ||
        error instanceof JWTExpired ||
        error instanceof JWTInvalid ||
        error instanceof JWKSNoMatchingKey ||
        error instanceof JWSInvalid ||
        error instanceof JWSSignatureVerificationFailed
      ) {
        throw new OidcTokenInvalidError('OIDC bearer token validation failed', { cause: error });
      }
      throw new OidcIdentityProviderUnavailableError('OIDC signing keys could not be fetched or validated', { cause: error });
    }
    const now = Math.floor(Date.now() / 1000);
    if (
      typeof payload.sub !== 'string' ||
      !payload.sub.trim() ||
      typeof payload.iat !== 'number' ||
      payload.iat > now + 60 ||
      typeof payload.exp !== 'number'
    ) {
      throw new OidcTokenInvalidError('OIDC bearer token claims are incomplete');
    }

    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (audiences.length > 1 && payload.azp !== audience) {
      throw new OidcTokenInvalidError('OIDC authorized party does not match the API audience');
    }

    return {
      issuer,
      subject: payload.sub,
      audience,
      groups: Array.isArray(payload.groups)
        ? payload.groups.filter((group): group is string => typeof group === 'string' && Boolean(group.trim()))
        : [],
      issuedAt: payload.iat,
      expiresAt: payload.exp,
    };
  };
}
