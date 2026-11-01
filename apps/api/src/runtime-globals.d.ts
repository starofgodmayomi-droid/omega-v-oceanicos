import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    omegaAuthorization?: {
      mode: 'local' | 'required';
      principal: 'local-development' | 'read-bearer' | 'admin-bearer';
    };
  }
}

declare var persistenceEncryptionKey: string | undefined;
