import 'fastify';
import type { VerifiedOidcIdentity } from './oidc-identity.js';

declare module 'fastify' {
  interface FastifyRequest {
    omegaAuthorization?: {
      mode: 'local' | 'required';
      principal: 'local-development' | 'read-bearer' | 'admin-bearer' | 'oidc-user' | 'oidc-approver';
    };
    omegaIdentity?: VerifiedOidcIdentity;
    omegaOperatorId?: string;
  }
}

declare var persistenceEncryptionKey: string | undefined;
