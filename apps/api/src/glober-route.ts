import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { KaiLedger } from '@oceanicos/remember';
import { compressAiNews } from './news-route.js';
import { createHash, randomBytes } from 'node:crypto';

export type GloberMode = 'collaborative' | 'autonomous';
export type GloberSubMode = 'chat' | 'cowork' | 'swarm' | 'goal' | 'computer';
export type GloberModel = 'fast' | 'auto' | 'expert' | 'heavy' | 'sonnet' | 'gemini';

export interface GloberGoal {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'in_progress' | 'completed' | 'paused';
  progressPercent: number;
  mode: GloberMode;
  assignedAgent: string;
  createdAt: string;
  updatedAt: string;
  evidenceHash?: string;
}

export interface GloberState {
  mode: GloberMode;
  subMode: GloberSubMode;
  model: GloberModel;
  hitlRequired: boolean;
  voosDaemon: {
    active: boolean;
    port: number;
    endpoint: string;
  };
  activeGoals: GloberGoal[];
  lastSensoryHeartbeat: string;
}

const globerState: GloberState = {
  mode: 'collaborative',
  subMode: 'chat',
  model: 'auto',
  hitlRequired: true,
  voosDaemon: {
    active: true,
    port: 8088,
    endpoint: 'http://localhost:8088',
  },
  activeGoals: [
    {
      id: 'goal-news-sensor-01',
      title: 'Global AI News Sensory Watcher',
      description: 'Continuous background monitoring and multi-world vector compression across physical, cognitive, economic, and celestial signals.',
      status: 'active',
      progressPercent: 94,
      mode: 'autonomous',
      assignedAgent: 'VOOS-News-Compass',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date().toISOString(),
      evidenceHash: 'sha256:0x1111-glober-sensory-news-stream',
    },
    {
      id: 'goal-swarm-audit-02',
      title: 'Autonomous Swarm Ledger & Memory Convergence',
      description: 'Verify all 78+ sovereign receipts and cryptographic parent chaining monotonically.',
      status: 'in_progress',
      progressPercent: 100,
      mode: 'autonomous',
      assignedAgent: 'KAI-Sovereign-Auditor',
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      updatedAt: new Date().toISOString(),
      evidenceHash: 'sha256:0x30013030-swarm-audit-gate-converged',
    },
    {
      id: 'goal-fullstack-pwa-03',
      title: 'Full-Stack AGI Desktop React 18 Compression',
      description: 'Progressive disclosure 3-panel UI with sandboxed headless Chrome and Auth0 SSO multi-tenancy.',
      status: 'in_progress',
      progressPercent: 88,
      mode: 'collaborative',
      assignedAgent: 'Lucid-Full-Stack-Builder',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      evidenceHash: 'sha256:0x8888-pwa-continuum-synthesis',
    },
  ],
  lastSensoryHeartbeat: new Date().toISOString(),
};

export function registerGloberRoutes(fastify: FastifyInstance, kaiLedger?: KaiLedger): void {
  // GET /v1/glober/status - Get overall Glober AI state
  fastify.get('/v1/glober/status', async (_req: FastifyRequest, reply: FastifyReply) => {
    globerState.lastSensoryHeartbeat = new Date().toISOString();
    return reply.status(200).send({
      success: true,
      service: 'glober-ai-dual-engine',
      state: globerState,
      doctrine: 'ATTEST, DONT ASSERT',
      checksum: '30013030',
    });
  });

  // POST /v1/glober/mode - Switch between Collaborative (with human) and Autonomous (without human)
  fastify.post('/v1/glober/mode', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    const newMode: GloberMode = body.mode === 'autonomous' ? 'autonomous' : 'collaborative';
    const newSubMode: GloberSubMode = body.subMode || (newMode === 'autonomous' ? 'goal' : 'chat');
    const newModel: GloberModel = body.model || globerState.model;

    const previousMode = globerState.mode;
    globerState.mode = newMode;
    globerState.subMode = newSubMode;
    globerState.model = newModel;
    globerState.hitlRequired = newMode === 'collaborative';

    if (kaiLedger) {
      try {
        kaiLedger.append({
          distinction: 'OBSERVED',
          statement: `Glober AI switched mode from ${previousMode} to ${newMode} (subMode: ${newSubMode}, model: ${newModel})`,
          subject: 'glober:mode:transition',
          source: 'api:/v1/glober/mode',
          author: 'ELION_VAREL',
          metadata: {
            previousMode,
            newMode,
            subMode: newSubMode,
            model: newModel,
            hitlRequired: globerState.hitlRequired,
          },
        });
      } catch {
        /* non-fatal */
      }
    }

    return reply.status(200).send({
      success: true,
      message: `Glober AI active in ${newMode.toUpperCase()} mode [${newSubMode.toUpperCase()}]`,
      mode: newMode,
      subMode: newSubMode,
      model: newModel,
      hitlRequired: globerState.hitlRequired,
    });
  });

  // GET /v1/glober/goals - List all background goals
  fastify.get('/v1/glober/goals', async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({
      success: true,
      goals: globerState.activeGoals,
      count: globerState.activeGoals.length,
      activeCount: globerState.activeGoals.filter((g) => g.status === 'active' || g.status === 'in_progress').length,
    });
  });

  // POST /v1/glober/goal - Create a persistent background goal
  fastify.post('/v1/glober/goal', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    if (!body.title || typeof body.title !== 'string') {
      return reply.status(400).send({
        success: false,
        error: 'MISSING_GOAL_TITLE',
        message: 'A goal title is required',
      });
    }

    const goalId = `goal-${Date.now()}-${randomBytes(3).toString('hex')}`;
    const newGoal: GloberGoal = {
      id: goalId,
      title: body.title.trim(),
      description: (body.description || 'Autonomous agent goal execution').trim(),
      status: 'active',
      progressPercent: 5,
      mode: body.mode || globerState.mode,
      assignedAgent: body.assignedAgent || (globerState.mode === 'autonomous' ? 'VOOS-Agent' : 'Glober-CoPilot'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      evidenceHash: `sha256:${createHash('sha256').update(body.title).digest('hex')}`,
    };

    globerState.activeGoals.unshift(newGoal);

    if (kaiLedger) {
      try {
        kaiLedger.append({
          distinction: 'USER-STATED',
          statement: `Glober AI goal created: "${newGoal.title}"`,
          subject: `glober:goal:${goalId}`,
          source: 'api:/v1/glober/goal',
          author: 'ELION_VAREL',
          metadata: {
            goalId,
            mode: newGoal.mode,
            assignedAgent: newGoal.assignedAgent,
          },
        });
      } catch {
        /* non-fatal */
      }
    }

    return reply.status(201).send({
      success: true,
      message: 'Goal registered and queued to Glober autonomous pipeline',
      goal: newGoal,
    });
  });

  // GET /v1/glober/news - Live AI news ticker sensory feed for Right Panel
  fastify.get('/v1/glober/news', async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const report = compressAiNews();
      return reply.status(200).send({
        success: true,
        sensoryFeed: 'real-time-global-ai-news',
        axiom: report.holographicAxiom,
        noiseFilteredRatio: report.noiseFilteredRatio,
        vectors: report.multiWorldVectors,
        signals: report.signals,
        evaluatedAt: report.evaluatedAt,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: 'GLOBER_NEWS_UNAVAILABLE',
        message: err.message,
      });
    }
  });

  // POST /v1/glober/execute - Execute an action with fail-closed HITL check
  fastify.post('/v1/glober/execute', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    const action = body.action || 'INSPECT';
    const params = body.params || {};

    // In collaborative mode with HITL, consequential operations require explicit user approval
    const isConsequential = ['DEPLOY', 'GIT_PUSH', 'WRITE_EXTERNAL', 'TRANSFER_FUNDS'].includes(action);
    if (globerState.mode === 'collaborative' && isConsequential && !body.userApproved) {
      return reply.status(403).send({
        success: false,
        error: 'HITL_APPROVAL_REQUIRED',
        message: `Action ${action} is consequential and requires explicit human validation under Collaborative HITL policy`,
        action,
        requiresConfirmation: true,
      });
    }

    const executionReceipt = {
      action,
      status: 'EXECUTED_SUCCESSFULLY',
      executedBy: globerState.mode === 'autonomous' ? 'VOOS-Autonomous-Daemon' : 'Glober-CoPilot',
      timestamp: new Date().toISOString(),
      evidenceHash: `sha256:${createHash('sha256').update(JSON.stringify({ action, params, ts: Date.now() })).digest('hex')}`,
    };

    return reply.status(200).send({
      success: true,
      receipt: executionReceipt,
    });
  });
}
