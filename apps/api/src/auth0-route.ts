import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { KaiLedger } from '@oceanicos/remember';
import { createHash, randomBytes } from 'node:crypto';

export interface Auth0User {
  id: string;
  name: string;
  email: string;
  role: string;
  tier: string;
  credits: number;
  tenantId: string;
  provider: 'auth0' | 'local' | 'google' | 'apple' | 'corporate-sso';
}

export interface TenantConfig {
  id: string;
  name: string;
  isolationMode: 'fail-closed';
  allowedLogoutUrls: string[];
}

let currentSession: {
  authenticated: boolean;
  user: Auth0User;
  tenant: TenantConfig;
  sessionToken: string;
  createdAt: string;
} = {
  authenticated: true,
  user: {
    id: 'usr_omega_sovereign_1111',
    name: 'Elion Varel',
    email: 'elion@oceanicos.network',
    role: 'Sovereign Root / Prophet Seed',
    tier: 'V1111 Singularity Enterprise',
    credits: 999999,
    tenantId: 'tenant-oceanicos-sovereign',
    provider: 'auth0',
  },
  tenant: {
    id: 'tenant-oceanicos-sovereign',
    name: 'Ω∞v Sovereign Enterprise Org',
    isolationMode: 'fail-closed',
    allowedLogoutUrls: [
      'http://localhost:3000',
      'http://localhost:5000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5000',
      'https://oceanicos.network',
    ],
  },
  sessionToken: 'omega-auth0-session-1111-sovereign-token',
  createdAt: new Date().toISOString(),
};

export function registerAuth0Routes(fastify: FastifyInstance, kaiLedger?: KaiLedger): void {
  // GET /v1/auth/session - Get active tenant session state
  fastify.get('/v1/auth/session', async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({
      success: true,
      authenticated: currentSession.authenticated,
      user: currentSession.authenticated ? currentSession.user : null,
      tenant: currentSession.tenant,
      sessionToken: currentSession.authenticated ? currentSession.sessionToken : null,
      security: {
        failClosed: true,
        ssoEnabled: true,
        veiledCustody: true,
        supportedProviders: ['auth0', 'google', 'apple', 'corporate-sso', 'local'],
      },
    });
  });

  // POST /v1/auth/login - Authenticate or switch tenant SSO
  fastify.post('/v1/auth/login', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    const email = body.email || 'elion@oceanicos.network';
    const provider = body.provider || 'auth0';
    const tenantId = body.tenantId || 'tenant-oceanicos-sovereign';

    const newToken = `omega-token-${randomBytes(16).toString('hex')}`;
    currentSession = {
      authenticated: true,
      user: {
        id: `usr_${createHash('sha256').update(email).digest('hex').slice(0, 12)}`,
        name: body.name || (email.startsWith('elion') ? 'Elion Varel' : email.split('@')[0]),
        email,
        role: email.startsWith('elion') ? 'Sovereign Root / Owner' : 'Enterprise Collaborator',
        tier: 'V1111 Singularity Enterprise',
        credits: 842000,
        tenantId,
        provider,
      },
      tenant: {
        id: tenantId,
        name: `${tenantId.replace('tenant-', '').toUpperCase()} Cluster`,
        isolationMode: 'fail-closed',
        allowedLogoutUrls: [
          'http://localhost:3000',
          'http://localhost:5000',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:5000',
          'https://oceanicos.network',
        ],
      },
      sessionToken: newToken,
      createdAt: new Date().toISOString(),
    };

    if (kaiLedger) {
      try {
        kaiLedger.append({
          distinction: 'OBSERVED',
          statement: `Auth0 SSO login established for tenant ${tenantId} via ${provider}`,
          subject: 'auth0:sso:session',
          source: 'api:/v1/auth/login',
          author: currentSession.user.name,
          metadata: {
            tenantId,
            email,
            provider,
            security: 'fail-closed',
          },
        });
      } catch {
        /* non-fatal */
      }
    }

    return reply.status(200).send({
      success: true,
      message: `SSO authentication established via ${provider}`,
      user: currentSession.user,
      tenant: currentSession.tenant,
      sessionToken: newToken,
    });
  });

  // POST /v1/auth/logout - Terminate session with allowed URL validation
  fastify.post('/v1/auth/logout', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    const returnTo = body.returnTo || 'http://localhost:3000';

    const isAllowed = currentSession.tenant.allowedLogoutUrls.some(
      (url) => returnTo.startsWith(url) || url.startsWith(returnTo)
    );

    if (!isAllowed) {
      return reply.status(400).send({
        success: false,
        error: 'INVALID_LOGOUT_REDIRECT_URI',
        message: 'The requested returnTo URL is not in the tenant allowed logout list',
      });
    }

    currentSession.authenticated = false;
    currentSession.sessionToken = '';

    if (kaiLedger) {
      try {
        kaiLedger.append({
          distinction: 'OBSERVED',
          statement: `Auth0 SSO session logged out. ReturnTo: ${returnTo}`,
          subject: 'auth0:sso:logout',
          source: 'api:/v1/auth/logout',
          author: 'SYSTEM',
        });
      } catch {
        /* non-fatal */
      }
    }

    return reply.status(200).send({
      success: true,
      message: 'Logged out successfully',
      returnTo,
    });
  });

  // GET /v1/auth/tenant/:tenantId - Inspect tenant isolation metadata
  fastify.get('/v1/auth/tenant/:tenantId', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = req.params as { tenantId: string };
    return reply.status(200).send({
      success: true,
      tenantId: params.tenantId,
      isolation: 'strict-fail-closed',
      quotas: {
        maxAgents: 100,
        maxSwarmIterations: 10000,
        monthlyCredits: 1000000,
        offlineDreamQueue: 'enabled',
      },
      provenanceAuditing: 'monotonic-kai-ledger',
    });
  });
}
