/**
 * Express middleware for job queue integration
 * Provides async processing endpoints and status monitoring
 */

import { Request, Response, NextFunction } from 'express';
import { JobQueue, BatchJobProcessor, Job, JobStatus, QueueStats } from '@omega-v/runtime';

export interface QueueMiddlewareOptions {
  queue: JobQueue;
  enableJobEndpoints?: boolean;
  maxPayloadSize?: number;
}

declare global {
  namespace Express {
    interface Request {
      queue?: JobQueue;
      jobId?: string;
    }
  }
}

/**
 * Attach job queue to request
 */
export function attachQueueMiddleware(queue: JobQueue) {
  return (req: Request, res: Response, next: NextFunction) => {
    req.queue = queue;
    next();
  };
}

/**
 * Async job endpoint
 */
export function asyncJobEndpoint(queue: JobQueue) {
  return async (req: Request, res: Response) => {
    const { type, payload, priority = 'normal', tags } = req.body;

    if (!type) {
      return res.status(400).json({
        error: 'Missing job type',
      });
    }

    try {
      const jobId = await queue.enqueue(type, payload, {
        priority,
        tags,
      });

      res.status(202).json({
        jobId,
        status: 'queued',
        statusUrl: `/api/jobs/${jobId}`,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to enqueue job',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Get job status endpoint
 */
export function getJobStatusEndpoint(queue: JobQueue) {
  return (req: Request, res: Response) => {
    const { jobId } = req.params;
    const job = queue.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        error: 'Job not found',
        jobId,
      });
    }

    res.json({
      id: job.id,
      type: job.type,
      status: job.status,
      priority: job.priority,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      attempts: job.attempts,
      maxRetries: job.maxRetries,
      error: job.error,
      result: job.result,
      tags: job.tags,
    });
  };
}

/**
 * List jobs endpoint
 */
export function listJobsEndpoint(queue: JobQueue) {
  return (req: Request, res: Response) => {
    const { status, type, limit = 50, offset = 0 } = req.query;

    const jobs = queue.getJobs(
      status as JobStatus | undefined,
      type as string | undefined,
    );

    const paginated = jobs.slice(
      Number(offset),
      Number(offset) + Number(limit),
    );

    res.json({
      total: jobs.length,
      limit: Number(limit),
      offset: Number(offset),
      jobs: paginated.map((job) => ({
        id: job.id,
        type: job.type,
        status: job.status,
        priority: job.priority,
        createdAt: job.createdAt,
        attempts: job.attempts,
      })),
    });
  };
}

/**
 * Cancel job endpoint
 */
export function cancelJobEndpoint(queue: JobQueue) {
  return async (req: Request, res: Response) => {
    const { jobId } = req.params;
    const cancelled = await queue.cancelJob(jobId);

    if (!cancelled) {
      return res.status(400).json({
        error: 'Cannot cancel job',
        jobId,
        message: 'Job is already completed or cannot be cancelled',
      });
    }

    res.json({
      success: true,
      message: 'Job cancelled',
      jobId,
    });
  };
}

/**
 * Retry job endpoint
 */
export function retryJobEndpoint(queue: JobQueue) {
  return async (req: Request, res: Response) => {
    const { jobId } = req.params;
    const retried = await queue.retryJob(jobId);

    if (!retried) {
      return res.status(400).json({
        error: 'Cannot retry job',
        jobId,
        message: 'Job must be in failed state to retry',
      });
    }

    res.json({
      success: true,
      message: 'Job queued for retry',
      jobId,
    });
  };
}

/**
 * Queue statistics endpoint
 */
export function queueStatsEndpoint(queue: JobQueue) {
  return (req: Request, res: Response) => {
    const stats = queue.getStats();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      queue: stats,
      health: {
        isHealthy: stats.successRate > 0.9 || stats.pending === 0,
        pendingJobs: stats.pending,
        processingJobs: stats.processing,
        failureRate: 1 - stats.successRate,
      },
    });
  };
}

/**
 * Dead letter queue endpoint
 */
export function deadLetterQueueEndpoint(queue: JobQueue) {
  return (req: Request, res: Response) => {
    const { limit = 50, offset = 0 } = req.query;
    const deadLetter = queue.getDeadLetterQueue();

    const paginated = deadLetter.slice(
      Number(offset),
      Number(offset) + Number(limit),
    );

    res.json({
      total: deadLetter.length,
      limit: Number(limit),
      offset: Number(offset),
      jobs: paginated.map((job) => ({
        id: job.id,
        type: job.type,
        status: job.status,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        error: job.error,
        attempts: job.attempts,
      })),
    });
  };
}

/**
 * Batch job endpoint
 */
export function batchJobEndpoint(
  queue: JobQueue,
  processor: BatchJobProcessor,
) {
  return async (req: Request, res: Response) => {
    const { type, items, priority = 'normal', waitForCompletion = false } = req.body;

    if (!type || !Array.isArray(items)) {
      return res.status(400).json({
        error: 'Missing required fields: type, items',
      });
    }

    try {
      const jobIds = await processor.enqueueBatch(type, items, { priority });

      if (waitForCompletion) {
        const results = await processor.waitForBatch(jobIds);
        return res.json({
          batchSize: jobIds.length,
          status: 'completed',
          results: Object.fromEntries(results),
        });
      }

      res.status(202).json({
        batchSize: jobIds.length,
        status: 'queued',
        jobIds,
        statusUrl: `/api/batch-jobs/${jobIds[0]}`,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to enqueue batch',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Initialize job queue middleware stack
 */
export function initializeJobQueueMiddleware(
  queue: JobQueue,
  options: { enableEndpoints?: boolean } = {},
) {
  const endpoints = [];

  if (options.enableEndpoints !== false) {
    endpoints.push((req: Request, res: Response, next: NextFunction) => {
      if (req.method === 'GET' && req.path === '/api/jobs') {
        return listJobsEndpoint(queue)(req, res);
      }
      if (req.method === 'GET' && req.path.match(/^\/api\/jobs\/[^\/]+$/)) {
        return getJobStatusEndpoint(queue)(req, res);
      }
      if (req.method === 'POST' && req.path === '/api/jobs') {
        return asyncJobEndpoint(queue)(req, res);
      }
      if (req.method === 'POST' && req.path.match(/^\/api\/jobs\/[^\/]+\/cancel$/)) {
        const jobId = req.path.split('/')[3];
        req.params.jobId = jobId;
        return cancelJobEndpoint(queue)(req, res);
      }
      if (req.method === 'POST' && req.path.match(/^\/api\/jobs\/[^\/]+\/retry$/)) {
        const jobId = req.path.split('/')[3];
        req.params.jobId = jobId;
        return retryJobEndpoint(queue)(req, res);
      }
      if (req.method === 'GET' && req.path === '/api/queue/stats') {
        return queueStatsEndpoint(queue)(req, res);
      }
      if (req.method === 'GET' && req.path === '/api/queue/dead-letter') {
        return deadLetterQueueEndpoint(queue)(req, res);
      }
      next();
    });
  }

  return [attachQueueMiddleware(queue), ...endpoints];
}

/**
 * Job status polling utility
 */
export async function pollJobStatus(
  jobId: string,
  queue: JobQueue,
  timeout: number = 300000,
  interval: number = 100,
): Promise<Job | null> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const job = queue.getJob(jobId);

    if (!job) return null;

    if (job.status === 'completed' || job.status === 'failed') {
      return job;
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  return null;
}

/**
 * Webhook job completion notification
 */
export function setupJobWebhooks(queue: JobQueue, webhookUrl: string) {
  // Implementation would poll queue and send webhooks
  // This is a placeholder for the concept
  return setInterval(async () => {
    const completedJobs = queue.getJobs('completed');
    const failedJobs = queue.getJobs('failed');

    for (const job of [...completedJobs, ...failedJobs]) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(job),
        });
      } catch {
        // Webhook delivery failed
      }
    }
  }, 5000);
}
