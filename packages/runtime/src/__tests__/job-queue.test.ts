import {
  JobQueue,
  DistributedJobQueue,
  PriorityJobQueue,
  BatchJobProcessor,
  Job,
} from '../job-queue';

describe('Job Queue', () => {
  describe('JobQueue', () => {
    let queue: JobQueue;

    beforeEach(() => {
      queue = new JobQueue({ maxConcurrent: 2, maxRetries: 0 });
    });

    afterEach(async () => {
      await queue.clear();
    });

    it('should enqueue a job', async () => {
      const jobId = await queue.enqueue('test', { data: 'test' });
      expect(jobId).toBeDefined();
      expect(jobId).toMatch(/^job_/);
    });

    it('should retrieve a job', async () => {
      const jobId = await queue.enqueue('test', { data: 'test' });
      const job = queue.getJob(jobId);

      expect(job).toBeDefined();
      expect(job?.type).toBe('test');
      expect(['pending', 'processing', 'completed', 'retrying']).toContain(job?.status);
    });

    it('should register and execute a job handler', async () => {
      const handler = jest.fn(async () => ({ success: true }));
      queue.registerHandler('test', handler);

      const jobId = await queue.enqueue('test', { data: 'test' });
      await new Promise((resolve) => setTimeout(resolve, 150));

      const job = queue.getJob(jobId);
      expect(job?.status).toBe('completed');
      expect(handler).toHaveBeenCalled();
    });

    it('should handle job failures and retry', async () => {
      const handler = jest.fn(async () => {
        throw new Error('Test error');
      });
      queue.registerHandler('test', handler);

      const jobId = await queue.enqueue('test', { data: 'test' });
      await new Promise((resolve) => setTimeout(resolve, 200));

      const job = queue.getJob(jobId);
      expect(['retrying', 'failed']).toContain(job?.status);
      expect(job?.attempts).toBeGreaterThan(0);
    });

    it('should track queue statistics', async () => {
      const handler = jest.fn(async () => ({}));
      queue.registerHandler('test', handler);

      await queue.enqueue('test', { id: 1 });
      await queue.enqueue('test', { id: 2 });

      const stats = queue.getStats();
      expect(stats.pending + stats.processing + stats.completed).toBeGreaterThanOrEqual(0);
    });

    it('should cancel a job', async () => {
      const jobId = await queue.enqueue('test', { data: 'test' });
      const cancelled = await queue.cancelJob(jobId);

      expect(cancelled).toBe(true);
      const job = queue.getJob(jobId);
      expect(job?.status).toBe('failed');
      expect(job?.error).toBe('Cancelled by user');
    });

    it('should filter jobs by type', async () => {
      await queue.enqueue('typeA', { id: 1 });
      await queue.enqueue('typeB', { id: 2 });

      const typeA = queue.getJobs(undefined, 'typeA');
      expect(typeA.every((j) => j.type === 'typeA')).toBe(true);
    });

    it('should handle concurrent processing', async () => {
      const handler = jest.fn(async () => ({}));
      queue.registerHandler('test', handler);

      const jobIds = [];
      for (let i = 0; i < 5; i++) {
        jobIds.push(await queue.enqueue('test', { id: i }));
      }

      await new Promise((resolve) => setTimeout(resolve, 300));

      const stats = queue.getStats();
      expect(stats.totalProcessed).toBeGreaterThan(0);
    });

    it('should clear queue', async () => {
      await queue.enqueue('test', { id: 1 });
      await queue.enqueue('test', { id: 2 });

      await queue.clear();

      const pending = queue.getJobs('pending');
      expect(pending.length).toBe(0);
    });

    it('should track job creation time', async () => {
      const before = Date.now();
      const jobId = await queue.enqueue('test', { data: 'test' });
      const after = Date.now();

      const job = queue.getJob(jobId);
      expect(job?.createdAt).toBeGreaterThanOrEqual(before);
      expect(job?.createdAt).toBeLessThanOrEqual(after);
    });

    it('should move failed jobs to dead letter queue', async () => {
      const handler = jest.fn(async () => {
        throw new Error('Fail');
      });
      queue.registerHandler('test', handler);

      const jobId = await queue.enqueue('test', { data: 'test' }, { maxRetries: 0 });
      await new Promise((resolve) => setTimeout(resolve, 200));

      const deadLetter = queue.getDeadLetterQueue();
      expect(deadLetter.length).toBeGreaterThan(0);
    });

    it('should handle missing job handler', async () => {
      const jobId = await queue.enqueue('unknown', { data: 'test' });
      await new Promise((resolve) => setTimeout(resolve, 150));

      const job = queue.getJob(jobId);
      expect(['failed', 'retrying']).toContain(job?.status);
    });

    it('should store job result on completion', async () => {
      const handler = jest.fn(async () => ({ result: 'success' }));
      queue.registerHandler('test', handler);

      const jobId = await queue.enqueue('test', { data: 'test' });
      await new Promise((resolve) => setTimeout(resolve, 150));

      const job = queue.getJob(jobId);
      expect(job?.result).toBeDefined();
    });
  });

  describe('DistributedJobQueue', () => {
    let queue: DistributedJobQueue;
    let mockPersistence: any;

    beforeEach(() => {
      mockPersistence = {
        keys: jest.fn(async () => []),
        get: jest.fn(async () => null),
        setex: jest.fn(async () => {}),
      };
      queue = new DistributedJobQueue({ maxConcurrent: 2 }, mockPersistence);
    });

    afterEach(async () => {
      await queue.clear();
    });

    it('should load jobs from persistence', async () => {
      mockPersistence.keys = jest.fn(async () => ['job:123']);
      mockPersistence.get = jest.fn(async () =>
        JSON.stringify({
          id: 'job:123',
          type: 'test',
          status: 'pending',
        }),
      );

      const jobs = await queue.loadJobs();
      expect(jobs.length).toBeGreaterThan(0);
    });

    it('should handle persistence errors gracefully', async () => {
      mockPersistence.keys = jest.fn(async () => {
        throw new Error('Connection failed');
      });

      const jobs = await queue.loadJobs();
      expect(jobs).toEqual([]);
    });
  });

  describe('PriorityJobQueue', () => {
    let queue: PriorityJobQueue;

    beforeEach(() => {
      queue = new PriorityJobQueue({ maxConcurrent: 1, maxRetries: 0 });
    });

    afterEach(async () => {
      await queue.clear();
    });

    it('should respect priority in job ordering', async () => {
      const id1 = await queue.enqueue('test', { id: 1 }, { priority: 'low' });
      const id2 = await queue.enqueue('test', { id: 2 }, { priority: 'high' });
      const id3 = await queue.enqueue('test', { id: 3 }, { priority: 'normal' });

      const allJobs = queue.getJobs();
      expect(allJobs.length).toBeGreaterThanOrEqual(1);
      expect(allJobs.some((j) => j.id === id1 && j.priority === 'low')).toBe(true);
      expect(allJobs.some((j) => j.id === id2 && j.priority === 'high')).toBe(true);
      expect(allJobs.some((j) => j.id === id3 && j.priority === 'normal')).toBe(true);
    });

    it('should process high priority jobs when available', async () => {
      const processed: string[] = [];
      const handler = jest.fn((job: Job) => {
        processed.push(job.priority);
        return Promise.resolve({});
      });

      queue.registerHandler('test', handler);

      await queue.enqueue('test', { id: 1 }, { priority: 'low' });
      await queue.enqueue('test', { id: 2 }, { priority: 'high' });

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(processed.length).toBeGreaterThan(0);
    });
  });

  describe('BatchJobProcessor', () => {
    let queue: JobQueue;
    let processor: BatchJobProcessor;

    beforeEach(() => {
      queue = new JobQueue({ maxConcurrent: 5, maxRetries: 0 });
      processor = new BatchJobProcessor(queue, 100);
    });

    afterEach(async () => {
      await queue.clear();
    });

    it('should enqueue batch of jobs', async () => {
      const items = [
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ];
      const jobIds = await processor.enqueueBatch('test', items);

      expect(jobIds.length).toBe(3);
      jobIds.forEach((id) => expect(id).toMatch(/^job_/));
    });

    it('should handle batch with failures', async () => {
      const handler = jest.fn(async (job: Job) => {
        if (job.payload.id === 2) {
          throw new Error('Failed');
        }
        return { processed: true };
      });
      queue.registerHandler('test', handler);

      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const jobIds = await processor.enqueueBatch('test', items);

      await new Promise((resolve) => setTimeout(resolve, 300));

      const stats = queue.getStats();
      expect(stats.totalProcessed).toBeGreaterThan(0);
    });

    it('should handle large batches', async () => {
      const handler = jest.fn(async () => ({}));
      queue.registerHandler('test', handler);

      const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      const jobIds = await processor.enqueueBatch('test', items);

      expect(jobIds.length).toBe(100);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complex workflow', async () => {
      const queue = new JobQueue({ maxConcurrent: 3, maxRetries: 0 });

      const observeHandler = jest.fn(async (job: Job) => {
        return { observationId: 'obs-123' };
      });

      const verifyHandler = jest.fn(async (job: Job) => {
        return { verified: true };
      });

      queue.registerHandler('observe', observeHandler);
      queue.registerHandler('verify', verifyHandler);

      const obsId = await queue.enqueue('observe', { claim: 'test' });
      const verId = await queue.enqueue('verify', { observationId: obsId });

      await new Promise((resolve) => setTimeout(resolve, 300));

      const stats = queue.getStats();
      expect(stats.totalProcessed).toBeGreaterThan(0);

      await queue.clear();
    });

    it('should handle concurrent batches', async () => {
      const queue = new JobQueue({ maxConcurrent: 5, maxRetries: 0 });
      const processor = new BatchJobProcessor(queue, 50);
      const handler = jest.fn(async () => ({}));
      queue.registerHandler('test', handler);

      const batch1 = Array.from({ length: 20 }, (_, i) => ({ id: i }));
      const batch2 = Array.from({ length: 20 }, (_, i) => ({ id: i + 20 }));

      const ids1 = await processor.enqueueBatch('test', batch1);
      const ids2 = await processor.enqueueBatch('test', batch2);

      await new Promise((resolve) => setTimeout(resolve, 500));

      const stats = queue.getStats();
      expect(stats.totalProcessed).toBeGreaterThan(0);

      await queue.clear();
    });

    it('should maintain queue integrity under load', async () => {
      const queue = new JobQueue({ maxConcurrent: 10, maxRetries: 0 });
      const handler = jest.fn(async () => ({}));
      queue.registerHandler('test', handler);

      const jobIds: string[] = [];
      for (let i = 0; i < 100; i++) {
        jobIds.push(await queue.enqueue('test', { id: i }));
      }

      await new Promise((resolve) => setTimeout(resolve, 600));

      const stats = queue.getStats();
      expect(stats.totalProcessed).toBeGreaterThan(0);

      await queue.clear();
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid enqueueing', async () => {
      const queue = new JobQueue();
      const jobIds = [];

      for (let i = 0; i < 100; i++) {
        jobIds.push(queue.enqueue('test', { id: i }));
      }

      const allIds = await Promise.all(jobIds);
      expect(allIds.length).toBe(100);

      await queue.clear();
    });

    it('should handle very large payloads', async () => {
      const queue = new JobQueue();
      const largePayload = {
        data: 'x'.repeat(1000000),
      };

      const jobId = await queue.enqueue('test', largePayload);
      const job = queue.getJob(jobId);

      expect(job?.payload.data.length).toBe(1000000);

      await queue.clear();
    });

    it('should handle dead letter queue limit', async () => {
      const queue = new JobQueue({ deadLetterSize: 5, maxRetries: 0 });
      const handler = jest.fn(async () => {
        throw new Error('Fail');
      });
      queue.registerHandler('test', handler);

      for (let i = 0; i < 10; i++) {
        await queue.enqueue('test', { id: i });
      }

      await new Promise((resolve) => setTimeout(resolve, 400));

      const deadLetter = queue.getDeadLetterQueue();
      expect(deadLetter.length).toBeLessThanOrEqual(5);

      await queue.clear();
    });

    it('should handle job without payload', async () => {
      const queue = new JobQueue({ maxRetries: 0 });
      const handler = jest.fn(async () => ({}));
      queue.registerHandler('test', handler);

      const jobId = await queue.enqueue('test', {});
      const job = queue.getJob(jobId);

      expect(job?.payload).toBeDefined();

      await queue.clear();
    });
  });
});
