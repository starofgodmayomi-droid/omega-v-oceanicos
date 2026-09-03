import {
  Logger,
  ContextualLogger,
  AuditLogger,
  RequestLogger,
  LogLevel,
  generateCorrelationId,
} from '../logging';

describe('Logging System', () => {
  describe('Logger', () => {
    let logger: Logger;
    let handlers: Array<any> = [];

    beforeEach(() => {
      logger = new Logger('info');
      handlers = [];
      logger.addHandler((entry) => handlers.push(entry));
    });

    it('should create logger instance with default level', () => {
      const defaultLogger = new Logger();
      expect(defaultLogger).toBeDefined();
    });

    it('should filter logs by level', () => {
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(handlers).toHaveLength(3);
      expect(handlers.map((h) => h.level)).toEqual(['info', 'warn', 'error']);
    });

    it('should log debug when level is debug', () => {
      const debugLogger = new Logger('debug');
      const debugHandlers: any[] = [];
      debugLogger.addHandler((entry) => debugHandlers.push(entry));

      debugLogger.debug('debug message');
      expect(debugHandlers).toHaveLength(1);
      expect(debugHandlers[0].message).toBe('debug message');
    });

    it('should log message with metadata', () => {
      logger.info('test message', { userId: 123, action: 'create' });

      expect(handlers[0].message).toBe('test message');
      expect(handlers[0].metadata).toEqual({ userId: 123, action: 'create' });
    });

    it('should include timestamp in log entry', () => {
      logger.info('test');

      expect(handlers[0].timestamp).toBeDefined();
      expect(new Date(handlers[0].timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should log error with stack trace', () => {
      const error = new Error('Test error');
      logger.error('An error occurred', error);

      expect(handlers[0].level).toBe('error');
      expect(handlers[0].error).toBeDefined();
      expect(handlers[0].error.message).toBe('Test error');
      expect(handlers[0].error.stack).toBeDefined();
    });

    it('should set log level', () => {
      const errorOnlyLogger = new Logger('error');
      const errorHandlers: any[] = [];
      errorOnlyLogger.addHandler((entry) => errorHandlers.push(entry));

      errorOnlyLogger.info('info');
      errorOnlyLogger.warn('warn');
      errorOnlyLogger.error('error');

      expect(errorHandlers).toHaveLength(1);
      expect(errorHandlers[0].message).toBe('error');
    });

    it('should call multiple handlers', () => {
      const handler1: any[] = [];
      const handler2: any[] = [];

      logger.addHandler((entry) => handler1.push(entry));
      logger.addHandler((entry) => handler2.push(entry));

      logger.info('test message');

      expect(handler1).toHaveLength(1);
      expect(handler2).toHaveLength(1);
      expect(handler1[0].message).toBe('test message');
      expect(handler2[0].message).toBe('test message');
    });

    it('should create contextual logger', () => {
      const contextLogger = logger.withContext({ userId: 'user-123' });
      expect(contextLogger).toBeInstanceOf(ContextualLogger);
    });
  });

  describe('ContextualLogger', () => {
    let logger: Logger;
    let contextLogger: ContextualLogger;
    let handlers: any[] = [];

    beforeEach(() => {
      logger = new Logger('debug');
      handlers = [];
      logger.addHandler((entry) => handlers.push(entry));
      contextLogger = logger.withContext({ userId: 'user-123', requestId: 'req-456' });
    });

    it('should merge context into metadata', () => {
      contextLogger.info('action performed');

      expect(handlers[0].metadata).toEqual({
        userId: 'user-123',
        requestId: 'req-456',
      });
    });

    it('should merge additional metadata with context', () => {
      contextLogger.info('action performed', { action: 'create' });

      expect(handlers[0].metadata).toEqual({
        userId: 'user-123',
        requestId: 'req-456',
        action: 'create',
      });
    });

    it('should override context with explicit metadata', () => {
      contextLogger.info('action performed', { userId: 'user-999' });

      expect(handlers[0].metadata.userId).toBe('user-999');
    });

    it('should log debug through contextual logger', () => {
      contextLogger.debug('debug message', { detail: 'info' });

      expect(handlers[0].level).toBe('debug');
      expect(handlers[0].message).toBe('debug message');
      expect(handlers[0].metadata.detail).toBe('info');
    });

    it('should log error through contextual logger', () => {
      const error = new Error('Test error');
      contextLogger.error('error occurred', error, { action: 'delete' });

      expect(handlers[0].level).toBe('error');
      expect(handlers[0].error.message).toBe('Test error');
      expect(handlers[0].metadata.action).toBe('delete');
    });
  });

  describe('AuditLogger', () => {
    let auditLogger: AuditLogger;
    let handlers: any[] = [];

    beforeEach(() => {
      auditLogger = new AuditLogger();
      const logger = auditLogger['logger'];
      logger.addHandler((entry) => handlers.push(entry));
    });

    it('should create audit logger instance', () => {
      expect(auditLogger).toBeDefined();
    });

    it('should log audit observation', () => {
      auditLogger.auditObservation('obs-123', 'user-456', 'success', { claim: 'test' });

      expect(handlers.length).toBeGreaterThan(0);
      const entry = handlers[handlers.length - 1];
      expect(entry.message).toContain('[AUDIT]');
      expect(entry.metadata.type).toBe('observation');
      expect(entry.metadata.actor).toBe('user-456');

      const storedEntry = auditLogger.getEntries()[0];
      expect(storedEntry.resource?.id).toBe('obs-123');
      expect(storedEntry.message).toContain('obs-123');
      expect(storedEntry.metadata.claim).toBe('test');
    });

    it('should log audit verification', () => {
      auditLogger.auditVerification('ver-123', 'obs-456', true, 'user-789', { rules: 5 });

      expect(handlers.length).toBeGreaterThan(0);
      const entry = handlers[handlers.length - 1];
      expect(entry.message).toContain('[AUDIT]');
      expect(entry.metadata.type).toBe('verification');
      expect(entry.metadata.actor).toBe('user-789');

      const storedEntry = auditLogger.getEntries()[0];
      expect(storedEntry.message).toContain('ver-123');
      expect(storedEntry.metadata.observationId).toBe('obs-456');
      expect(storedEntry.metadata.rules).toBe(5);
    });

    it('should log audit attestation', () => {
      auditLogger.auditAttestation('att-123', 'ver-456', true, 'user-789', { algorithm: 'RSA' });

      expect(handlers.length).toBeGreaterThan(0);
      const entry = handlers[handlers.length - 1];
      expect(entry.message).toContain('[AUDIT]');
      expect(entry.metadata.type).toBe('attestation');
      expect(entry.metadata.actor).toBe('user-789');

      const storedEntry = auditLogger.getEntries()[0];
      expect(storedEntry.message).toContain('att-123');
      expect(storedEntry.metadata.verificationId).toBe('ver-456');
      expect(storedEntry.metadata.algorithm).toBe('RSA');
    });

    it('should store audit entries', () => {
      auditLogger.auditObservation('obs-123', 'user-456', 'success');
      auditLogger.auditVerification('ver-123', 'obs-123', true, 'user-456');

      const entries = auditLogger.getEntries();
      expect(entries.length).toBeGreaterThanOrEqual(2);
    });

    it('should limit audit entries by size', () => {
      const smallAuditLogger = new AuditLogger(5);
      const logger = smallAuditLogger['logger'];
      logger.addHandler(() => {});

      for (let i = 0; i < 10; i++) {
        smallAuditLogger.auditObservation(`obs-${i}`, 'user', 'success');
      }

      const entries = smallAuditLogger.getEntries();
      expect(entries.length).toBeLessThanOrEqual(5);
    });

    it('should get entries by type', () => {
      auditLogger.auditObservation('obs-1', 'user', 'success');
      auditLogger.auditObservation('obs-2', 'user', 'success');
      auditLogger.auditVerification('ver-1', 'obs-1', true, 'user');

      const observations = auditLogger.getEntriesByType('observation');
      expect(observations.length).toBeGreaterThanOrEqual(2);
      observations.forEach((entry) => {
        expect(entry.type).toBe('observation');
      });
    });

    it('should get limited entries', () => {
      for (let i = 0; i < 10; i++) {
        auditLogger.auditObservation(`obs-${i}`, 'user', 'success');
      }

      const entries = auditLogger.getEntries(5);
      expect(entries.length).toBeLessThanOrEqual(5);
    });

    it('should clear audit entries', () => {
      auditLogger.auditObservation('obs-123', 'user', 'success');
      expect(auditLogger.getEntries().length).toBeGreaterThan(0);

      auditLogger.clear();
      expect(auditLogger.getEntries().length).toBe(0);
    });
  });

  describe('RequestLogger', () => {
    let requestLogger: RequestLogger;
    let handlers: any[] = [];

    beforeEach(() => {
      requestLogger = new RequestLogger();
      const logger = requestLogger['logger'];
      logger.addHandler((entry) => handlers.push(entry));
    });

    it('should create request logger instance', () => {
      expect(requestLogger).toBeDefined();
    });

    it('should log HTTP request', () => {
      requestLogger.logRequest({
        level: 'info',
        message: 'GET request',
        method: 'GET',
        path: '/api/users',
        statusCode: 200,
        duration: 50,
        correlationId: 'corr-123',
      });

      expect(handlers.length).toBeGreaterThan(0);
      const entry = handlers[handlers.length - 1];
      expect(entry.metadata.method).toBe('GET');
      expect(entry.metadata.path).toBe('/api/users');
      expect(entry.metadata.statusCode).toBe(200);
      expect(entry.metadata.duration).toBe(50);
    });

    it('should determine log level based on status code', () => {
      requestLogger.logRequest({
        level: 'info',
        message: 'request',
        method: 'GET',
        path: '/api',
        statusCode: 200,
        duration: 10,
      });

      requestLogger.logRequest({
        level: 'info',
        message: 'request',
        method: 'GET',
        path: '/api',
        statusCode: 400,
        duration: 10,
      });

      requestLogger.logRequest({
        level: 'info',
        message: 'request',
        method: 'GET',
        path: '/api',
        statusCode: 500,
        duration: 10,
      });

      expect(handlers[handlers.length - 3].level).toBe('info');
      expect(handlers[handlers.length - 2].level).toBe('warn');
      expect(handlers[handlers.length - 1].level).toBe('error');
    });

    it('should store request logs', () => {
      requestLogger.logRequest({
        level: 'info',
        message: 'request',
        method: 'POST',
        path: '/api/create',
        statusCode: 201,
        duration: 100,
      });

      const entries = requestLogger.getEntries();
      expect(entries.length).toBeGreaterThan(0);
    });

    it('should limit request logs by size', () => {
      const smallLogger = new RequestLogger(5);
      const logger = smallLogger['logger'];
      logger.addHandler(() => {});

      for (let i = 0; i < 10; i++) {
        smallLogger.logRequest({
          level: 'info',
          message: 'request',
          method: 'GET',
          path: '/api',
          statusCode: 200,
          duration: 10,
        });
      }

      const entries = smallLogger.getEntries();
      expect(entries.length).toBeLessThanOrEqual(5);
    });

    it('should get slow requests', () => {
      requestLogger.logRequest({
        level: 'info',
        message: 'request',
        method: 'GET',
        path: '/fast',
        statusCode: 200,
        duration: 50,
      });

      requestLogger.logRequest({
        level: 'info',
        message: 'request',
        method: 'GET',
        path: '/slow',
        statusCode: 200,
        duration: 2000,
      });

      const slowRequests = requestLogger.getSlowRequests(1000);
      expect(slowRequests.length).toBeGreaterThan(0);
      expect(slowRequests.some((r) => r.path === '/slow')).toBe(true);
    });

    it('should get failed requests', () => {
      requestLogger.logRequest({
        level: 'info',
        message: 'request',
        method: 'GET',
        path: '/success',
        statusCode: 200,
        duration: 50,
      });

      requestLogger.logRequest({
        level: 'info',
        message: 'request',
        method: 'GET',
        path: '/not-found',
        statusCode: 404,
        duration: 50,
      });

      requestLogger.logRequest({
        level: 'info',
        message: 'request',
        method: 'GET',
        path: '/error',
        statusCode: 500,
        duration: 50,
      });

      const failedRequests = requestLogger.getFailedRequests();
      expect(failedRequests.length).toBeGreaterThanOrEqual(2);
      expect(failedRequests.every((r) => r.statusCode >= 400)).toBe(true);
    });

    it('should clear request logs', () => {
      requestLogger.logRequest({
        level: 'info',
        message: 'request',
        method: 'GET',
        path: '/api',
        statusCode: 200,
        duration: 10,
      });

      expect(requestLogger.getEntries().length).toBeGreaterThan(0);

      requestLogger.clear();
      expect(requestLogger.getEntries().length).toBe(0);
    });

    it('should track request size and response size', () => {
      requestLogger.logRequest({
        level: 'info',
        message: 'request',
        method: 'POST',
        path: '/api/data',
        statusCode: 200,
        duration: 100,
        bodySize: 1024,
        responseSize: 2048,
        userId: 'user-123',
        userAgent: 'Mozilla/5.0',
      });

      const entries = requestLogger.getEntries();
      expect(entries[0].bodySize).toBe(1024);
      expect(entries[0].responseSize).toBe(2048);
      expect(entries[0].userId).toBe('user-123');
      expect(entries[0].userAgent).toBe('Mozilla/5.0');
    });
  });

  describe('Correlation ID', () => {
    it('should generate unique correlation IDs', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });

    it('should generate correlation ID with correct format', () => {
      const id = generateCorrelationId();

      expect(id).toMatch(/^corr-\d+-[a-z0-9]+$/);
    });

    it('should include timestamp in correlation ID', () => {
      const before = Date.now();
      const id = generateCorrelationId();
      const after = Date.now();

      const match = id.match(/^corr-(\d+)-/);
      expect(match).not.toBeNull();
      const timestamp = parseInt(match![1], 10);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete observation workflow', () => {
      const auditLogger = new AuditLogger();
      const handlers: any[] = [];
      const logger = auditLogger['logger'];
      logger.addHandler((entry) => handlers.push(entry));

      const observationId = 'obs-123';
      const userId = 'user-456';

      auditLogger.auditObservation(observationId, userId, 'success', { claim: 'test claim' });
      auditLogger.auditVerification('ver-123', observationId, true, userId, { rules: 3 });
      auditLogger.auditAttestation('att-123', 'ver-123', true, userId, { algorithm: 'RSA' });

      expect(auditLogger.getEntries().length).toBeGreaterThanOrEqual(3);
      expect(auditLogger.getEntriesByType('observation').length).toBeGreaterThan(0);
      expect(auditLogger.getEntriesByType('verification').length).toBeGreaterThan(0);
      expect(auditLogger.getEntriesByType('attestation').length).toBeGreaterThan(0);
    });

    it('should handle mixed request and audit logging', () => {
      const requestLogger = new RequestLogger();
      const auditLogger = new AuditLogger();
      const allHandlers: any[] = [];

      const rlogger = requestLogger['logger'];
      const alogger = auditLogger['logger'];
      rlogger.addHandler((entry) => allHandlers.push(entry));
      alogger.addHandler((entry) => allHandlers.push(entry));

      requestLogger.logRequest({
        level: 'info',
        message: 'request',
        method: 'POST',
        path: '/complete-loop',
        statusCode: 201,
        duration: 150,
        userId: 'user-123',
      });

      auditLogger.auditObservation('obs-123', 'user-123', 'success');
      auditLogger.auditVerification('ver-123', 'obs-123', true, 'user-123');

      expect(allHandlers.length).toBeGreaterThan(2);
    });

    it('should support context propagation through logging', () => {
      const logger = new Logger('debug');
      const handlers: any[] = [];
      logger.addHandler((entry) => handlers.push(entry));

      const contextLogger = logger.withContext({
        userId: 'user-123',
        requestId: 'req-456',
        traceId: 'trace-789',
      });

      contextLogger.info('operation started');
      contextLogger.info('operation processing', { step: 1 });
      contextLogger.info('operation completed', { result: 'success' });

      expect(handlers).toHaveLength(3);
      handlers.forEach((entry) => {
        expect(entry.metadata.userId).toBe('user-123');
        expect(entry.metadata.requestId).toBe('req-456');
        expect(entry.metadata.traceId).toBe('trace-789');
      });
    });
  });
});
