/**
 * Structured logging and audit trail system
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId?: string;
  traceId?: string;
  spanId?: string;
  metadata?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

export interface AuditEntry extends LogEntry {
  type: 'observation' | 'verification' | 'attestation' | 'access' | 'config-change';
  actor?: string;
  resource?: {
    id: string;
    type: string;
  };
  action: string;
  result: 'success' | 'failure' | 'partial';
}

export interface RequestLog extends LogEntry {
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  bodySize?: number;
  responseSize?: number;
  userId?: string;
  userAgent?: string;
}

/**
 * Logger for structured logging
 */
export class Logger {
  private level: LogLevel;
  private handlers: Array<(entry: LogEntry) => void> = [];
  private minLevel: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(level: LogLevel = 'info') {
    this.level = level;
    this.addConsoleHandler();
  }

  /**
   * Log a message
   */
  log(level: LogLevel, message: string, metadata?: Record<string, any>, error?: Error): void {
    if (this.minLevel[level] < this.minLevel[this.level]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata,
      error: error ? {
        message: error.message,
        stack: error.stack,
      } : undefined,
    };

    this.handlers.forEach(handler => handler(entry));
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.log('debug', message, metadata);
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.log('info', message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.log('warn', message, metadata);
  }

  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log('error', message, metadata, error);
  }

  /**
   * Add a log handler
   */
  addHandler(handler: (entry: LogEntry) => void): void {
    this.handlers.push(handler);
  }

  /**
   * Add console handler
   */
  private addConsoleHandler(): void {
    this.addHandler((entry: LogEntry) => {
      const logFn = console[entry.level === 'debug' ? 'log' : entry.level];
      logFn(JSON.stringify(entry));
    });
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Add context to all logs
   */
  withContext(context: Record<string, any>): ContextualLogger {
    return new ContextualLogger(this, context);
  }
}

/**
 * Contextual logger with automatic metadata injection
 */
export class ContextualLogger {
  constructor(private logger: Logger, private context: Record<string, any>) {}

  debug(message: string, metadata?: Record<string, any>): void {
    this.logger.debug(message, { ...this.context, ...metadata });
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.logger.info(message, { ...this.context, ...metadata });
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.logger.warn(message, { ...this.context, ...metadata });
  }

  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.logger.error(message, error, { ...this.context, ...metadata });
  }
}

/**
 * Audit logger for tracking important events
 */
export class AuditLogger {
  private entries: AuditEntry[] = [];
  private maxSize: number;
  private logger: Logger;

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;
    this.logger = new Logger('info');
  }

  /**
   * Log an audit entry
   */
  audit(entry: Omit<AuditEntry, 'timestamp'>): void {
    const auditEntry: AuditEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    this.entries.push(auditEntry);
    if (this.entries.length > this.maxSize) {
      this.entries.shift();
    }

    this.logger.info(`[AUDIT] ${entry.type}: ${entry.action}`, {
      type: entry.type,
      action: entry.action,
      result: entry.result,
      actor: entry.actor,
      resource: entry.resource,
    });
  }

  /**
   * Log observation audit
   */
  auditObservation(
    observationId: string,
    actor: string,
    result: 'success' | 'failure',
    details?: Record<string, any>,
  ): void {
    this.audit({
      level: 'info',
      message: `Observation recorded: ${observationId}`,
      type: 'observation',
      action: 'record',
      actor,
      resource: { id: observationId, type: 'observation' },
      result,
      metadata: details,
    });
  }

  /**
   * Log verification audit
   */
  auditVerification(
    verificationId: string,
    observationId: string,
    passed: boolean,
    actor: string,
    details?: Record<string, any>,
  ): void {
    this.audit({
      level: 'info',
      message: `Verification ${passed ? 'passed' : 'failed'}: ${verificationId}`,
      type: 'verification',
      action: passed ? 'pass' : 'fail',
      actor,
      resource: { id: verificationId, type: 'verification' },
      result: passed ? 'success' : 'failure',
      metadata: { observationId, ...details },
    });
  }

  /**
   * Log attestation audit
   */
  auditAttestation(
    attestationId: string,
    verificationId: string,
    verified: boolean,
    actor: string,
    details?: Record<string, any>,
  ): void {
    this.audit({
      level: 'info',
      message: `Attestation created: ${attestationId}`,
      type: 'attestation',
      action: 'create',
      actor,
      resource: { id: attestationId, type: 'attestation' },
      result: verified ? 'success' : 'failure',
      metadata: { verificationId, verified, ...details },
    });
  }

  /**
   * Get audit entries
   */
  getEntries(limit?: number): AuditEntry[] {
    if (limit) {
      return this.entries.slice(-limit);
    }
    return [...this.entries];
  }

  /**
   * Get entries by type
   */
  getEntriesByType(type: AuditEntry['type'], limit?: number): AuditEntry[] {
    const filtered = this.entries.filter(e => e.type === type);
    if (limit) {
      return filtered.slice(-limit);
    }
    return filtered;
  }

  /**
   * Clear audit entries
   */
  clear(): void {
    this.entries = [];
  }
}

/**
 * Request logger for HTTP requests
 */
export class RequestLogger {
  private logger: Logger;
  private entries: RequestLog[] = [];
  private maxSize: number;

  constructor(maxSize: number = 5000) {
    this.logger = new Logger('info');
    this.maxSize = maxSize;
  }

  /**
   * Log HTTP request
   */
  logRequest(entry: Omit<RequestLog, 'timestamp'>): void {
    const requestLog: RequestLog = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    this.entries.push(requestLog);
    if (this.entries.length > this.maxSize) {
      this.entries.shift();
    }

    const logLevel = requestLog.statusCode >= 500 ? 'error' : requestLog.statusCode >= 400 ? 'warn' : 'info';
    this.logger.log(logLevel, `${requestLog.method} ${requestLog.path} ${requestLog.statusCode}`, {
      method: requestLog.method,
      path: requestLog.path,
      statusCode: requestLog.statusCode,
      duration: requestLog.duration,
      correlationId: requestLog.correlationId,
      userId: requestLog.userId,
    });
  }

  /**
   * Get request logs
   */
  getEntries(limit?: number): RequestLog[] {
    if (limit) {
      return this.entries.slice(-limit);
    }
    return [...this.entries];
  }

  /**
   * Get slow requests
   */
  getSlowRequests(thresholdMs: number = 1000, limit?: number): RequestLog[] {
    const filtered = this.entries.filter(e => e.duration > thresholdMs);
    if (limit) {
      return filtered.slice(-limit);
    }
    return filtered;
  }

  /**
   * Get failed requests
   */
  getFailedRequests(limit?: number): RequestLog[] {
    const filtered = this.entries.filter(e => e.statusCode >= 400);
    if (limit) {
      return filtered.slice(-limit);
    }
    return filtered;
  }

  /**
   * Clear request logs
   */
  clear(): void {
    this.entries = [];
  }
}

/**
 * Create a correlation ID for request tracking
 */
export function generateCorrelationId(): string {
  return `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
