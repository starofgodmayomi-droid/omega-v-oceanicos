import 'fastify';
import type { VerifiedOidcIdentity } from './oidc-identity.js';

declare module 'fastify' {
  interface FastifyRequest {
    omegaAuthorization?: {
      mode: 'local' | 'required';
      principal: 'local-development' | 'read-bearer' | 'admin-bearer';
    };
    omegaIdentity?: VerifiedOidcIdentity;
  }
}

declare var persistenceEncryptionKey: string | undefined;
