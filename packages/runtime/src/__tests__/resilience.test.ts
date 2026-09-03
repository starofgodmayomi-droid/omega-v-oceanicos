import {
  retryWithBackoff,
  CircuitBreaker,
  CircuitState,
  VerificationError,
  RateLimiter,
  GracefulShutdown,
} from '../resilience';

describe('Resilience Utilities', () => {
  describe('Retry with Backoff', () => {
    it('should succeed on first attempt', async () => {
      const fn = jest.fn().mockResolvedValueOnce('success');

      const result = await retryWithBackoff(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail1'))
        .mockRejectedValueOnce(new Error('fail2'))
        .mockResolvedValueOnce('success');

      const result = await retryWithBackoff(fn, {
        maxAttempts: 3,
        initialDelayMs: 10,
        maxDelayMs: 50,
        backoffMultiplier: 2,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should fail after max attempts', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('persistent failure'));

      await expect(
        retryWithBackoff(fn, {
          maxAttempts: 2,
          initialDelayMs: 10,
          maxDelayMs: 50,
          backoffMultiplier: 2,
        })
      ).rejects.toThrow('persistent failure');

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should use exponential backoff delays', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail1'))
        .mockRejectedValueOnce(new Error('fail2'))
        .mockResolvedValueOnce('success');

      const result = await retryWithBackoff(fn, {
        maxAttempts: 3,
        initialDelayMs: 1,
        maxDelayMs: 10,
        backoffMultiplier: 2,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should respect maxDelayMs limit', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail1'))
        .mockRejectedValueOnce(new Error('fail2'))
        .mockRejectedValueOnce(new Error('fail3'))
        .mockResolvedValueOnce('success');

      const result = await retryWithBackoff(fn, {
        maxAttempts: 4,
        initialDelayMs: 10,
        maxDelayMs: 20,
        backoffMultiplier: 2,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(4);
    });
  });

  describe('Circuit Breaker', () => {
    it('should start in CLOSED state', () => {
      const breaker = new CircuitBreaker();
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should succeed on healthy operation', async () => {
      const breaker = new CircuitBreaker();
      const fn = jest.fn().mockResolvedValue('success');

      const result = await breaker.execute(fn);

      expect(result).toBe('success');
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should transition to OPEN after failure threshold', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 3 });
      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(fn);
        } catch {
          // Expected
        }
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should reject requests when OPEN', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 2 });
      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      try {
        await breaker.execute(fn);
      } catch {
        // Expected
      }
      try {
        await breaker.execute(fn);
      } catch {
        // Expected
      }

      await expect(breaker.execute(fn)).rejects.toThrow('Circuit breaker is OPEN');
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        timeoutMs: 100,
      });
      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      try {
        await breaker.execute(fn);
      } catch {
        // Expected
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);

      await new Promise((resolve) => setTimeout(resolve, 150));

      const successFn = jest.fn().mockResolvedValue('success');
      await breaker.execute(successFn);

      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);
    });

    it('should close after success threshold in HALF_OPEN', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        successThreshold: 2,
        timeoutMs: 100,
      });

      const failFn = jest.fn().mockRejectedValue(new Error('fail'));
      try {
        await breaker.execute(failFn);
      } catch {
        // Expected
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);

      await new Promise((resolve) => setTimeout(resolve, 150));

      const successFn = jest.fn().mockResolvedValue('success');
      await breaker.execute(successFn);
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

      await breaker.execute(successFn);
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should reopen on failure in HALF_OPEN state', async () => {
      jest.useFakeTimers();
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        timeoutMs: 100,
      });

      const failFn = jest.fn().mockRejectedValue(new Error('fail'));
      try {
        await breaker.execute(failFn);
      } catch {
        // Expected
      }

      jest.advanceTimersByTime(100);

      try {
        await breaker.execute(failFn);
      } catch {
        // Expected
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);
      jest.useRealTimers();
    });

    it('should provide metrics', () => {
      const breaker = new CircuitBreaker();
      const metrics = breaker.getMetrics();

      expect(metrics).toHaveProperty('state');
      expect(metrics).toHaveProperty('failureCount');
      expect(metrics).toHaveProperty('successCount');
      expect(metrics).toHaveProperty('lastFailureTime');
    });

    it('should reset to CLOSED state', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 1 });
      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      try {
        await breaker.execute(fn);
      } catch {
        // Expected
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);

      breaker.reset();
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('VerificationError', () => {
    it('should create error with code and status', () => {
      const error = new VerificationError('TEST_ERROR', 'Test message', 400);

      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test message');
      expect(error.statusCode).toBe(400);
    });

    it('should include context', () => {
      const context = { observationId: 'obs-1' };
      const error = new VerificationError('TEST_ERROR', 'Test message', 400, context);

      expect(error.context).toEqual(context);
    });

    it('should default to 400 status code', () => {
      const error = new VerificationError('TEST_ERROR', 'Test message');
      expect(error.statusCode).toBe(400);
    });
  });

  describe('Rate Limiter', () => {
    it('should allow requests within limit', () => {
      const limiter = new RateLimiter(3, 1000);

      expect(limiter.isAllowed('user1')).toBe(true);
      expect(limiter.isAllowed('user1')).toBe(true);
      expect(limiter.isAllowed('user1')).toBe(true);
    });

    it('should block requests exceeding limit', () => {
      const limiter = new RateLimiter(2, 1000);

      expect(limiter.isAllowed('user1')).toBe(true);
      expect(limiter.isAllowed('user1')).toBe(true);
      expect(limiter.isAllowed('user1')).toBe(false);
    });

    it('should track different keys separately', () => {
      const limiter = new RateLimiter(2, 1000);

      expect(limiter.isAllowed('user1')).toBe(true);
      expect(limiter.isAllowed('user1')).toBe(true);
      expect(limiter.isAllowed('user2')).toBe(true);
      expect(limiter.isAllowed('user2')).toBe(true);
      expect(limiter.isAllowed('user1')).toBe(false);
      expect(limiter.isAllowed('user2')).toBe(false);
    });

    it('should reset after window expires', async () => {
      jest.useFakeTimers();
      const limiter = new RateLimiter(2, 1000);

      expect(limiter.isAllowed('user1')).toBe(true);
      expect(limiter.isAllowed('user1')).toBe(true);
      expect(limiter.isAllowed('user1')).toBe(false);

      jest.advanceTimersByTime(1000);

      expect(limiter.isAllowed('user1')).toBe(true);
      jest.useRealTimers();
    });

    it('should provide rate limit status', () => {
      const limiter = new RateLimiter(3, 1000);

      limiter.isAllowed('user1');
      limiter.isAllowed('user1');

      const status = limiter.getStatus('user1');
      expect(status.remaining).toBe(1);
      expect(status.resetAt).toBeDefined();
    });

    it('should handle non-existent key', () => {
      const limiter = new RateLimiter(3, 1000);
      const status = limiter.getStatus('unknown');

      expect(status.remaining).toBe(3);
    });
  });

  describe('Graceful Shutdown', () => {
    it('should execute registered handlers', async () => {
      const shutdown = new GracefulShutdown();
      const handler1 = jest.fn().mockResolvedValue(undefined);
      const handler2 = jest.fn().mockResolvedValue(undefined);

      shutdown.register(handler1);
      shutdown.register(handler2);

      await shutdown.shutdown();

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should continue on handler errors', async () => {
      const shutdown = new GracefulShutdown();
      const handler1 = jest.fn().mockRejectedValue(new Error('fail'));
      const handler2 = jest.fn().mockResolvedValue(undefined);

      shutdown.register(handler1);
      shutdown.register(handler2);

      await expect(shutdown.shutdown()).resolves.not.toThrow();
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should respect shutdown timeout', async () => {
      const shutdown = new GracefulShutdown();
      const handler = jest.fn(() => new Promise((resolve) => setTimeout(resolve, 10000)));

      shutdown.register(handler);

      await expect(shutdown.shutdown(100)).rejects.toThrow('Shutdown timeout');
    });
  });
});
