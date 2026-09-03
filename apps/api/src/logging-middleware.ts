import { Request, Response, NextFunction } from 'express';
import { RequestLogger, AuditLogger, Logger, generateCorrelationId } from '@omega-v/runtime';

export interface LoggingContext {
  correlationId: string;
  requestLogger: RequestLogger;
  auditLogger: AuditLogger;
  systemLogger: Logger;
}

let loggingContext: LoggingContext | null = null;

export function initializeLogging(): LoggingContext {
  if (loggingContext) {
    return loggingContext;
  }

  loggingContext = {
    correlationId: generateCorrelationId(),
    requestLogger: new RequestLogger(),
    auditLogger: new AuditLogger(),
    systemLogger: new Logger('info'),
  };

  return loggingContext;
}

export function getLoggingContext(): LoggingContext {
  if (!loggingContext) {
    return initializeLogging();
  }
  return loggingContext;
}

export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const context = getLoggingContext();
  const startTime = Date.now();

  const correlationId = (req.headers['x-correlation-id'] as string) || generateCorrelationId();
  res.setHeader('x-correlation-id', correlationId);

  (req as any).locals = (req as any).locals || {};
  (req as any).locals.correlationId = correlationId;
  (req as any).locals.auditLogger = context.auditLogger;

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const bodySize = parseInt((req.headers['content-length'] as string) || '0', 10);
    const userId = (req.user?.id as string) || undefined;
    const userAgent = req.get('user-agent');

    context.requestLogger.logRequest({
      level: 'info',
      message: `${req.method} ${req.path}`,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      bodySize,
      responseSize: 0,
      correlationId,
      userId,
      userAgent,
    });
  });

  next();
}

export function auditLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  (req as any).locals = (req as any).locals || {};
  const context = getLoggingContext();
  (req as any).locals.auditLogger = context.auditLogger;
  next();
}

export function errorLoggingMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const context = getLoggingContext();
  const correlationId = res.getHeader('x-correlation-id') as string;

  context.systemLogger.error(`Error in ${req.method} ${req.path}`, err, {
    correlationId,
    statusCode: res.statusCode,
    userId: (req.user?.id as string) || undefined,
  });

  context.requestLogger.logRequest({
    level: 'error',
    message: `${req.method} ${req.path} - ${err.message}`,
    method: req.method,
    path: req.path,
    statusCode: res.statusCode || 500,
    duration: 0,
    correlationId,
    userId: (req.user?.id as string) || undefined,
  });

  next(err);
}

export function getRequestLogger(): RequestLogger {
  return getLoggingContext().requestLogger;
}

export function getAuditLogger(): AuditLogger {
  return getLoggingContext().auditLogger;
}

export function getSystemLogger(): Logger {
  return getLoggingContext().systemLogger;
}
