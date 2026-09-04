import { Request, Response, NextFunction } from 'express';
import { RateLimiter } from '@omega-v/runtime';

/**
 * Security headers middleware for production hardening
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Strict Transport Security (HSTS)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Content Security Policy
  res.setHeader('Content-Security-Policy', "default-src 'self'");

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
}

/**
 * Request validation middleware
 */
export function validateJSON(req: Request, res: Response, next: NextFunction): void {
  if (req.method !== 'GET' && req.method !== 'HEAD' && !req.is('application/json')) {
    res.status(400).json({
      code: 'INVALID_CONTENT_TYPE',
      message: 'Content-Type must be application/json',
      timestamp: new Date().toISOString(),
    });
    return;
  }
  next();
}

/**
 * Request size limits
 */
export function requestSizeLimits(maxJsonSize: string = '1mb') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('content-length') || '0', 10);
    const maxBytes = parseSize(maxJsonSize);

    if (contentLength > maxBytes) {
      res.status(413).json({
        code: 'PAYLOAD_TOO_LARGE',
        message: `Request payload exceeds ${maxJsonSize}`,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    next();
  };
}

/**
 * Rate limiting middleware
 */
export function createRateLimitMiddleware(
  maxRequests: number = 100,
  windowMs: number = 60000,
  keyFn: (req: Request) => string = req => req.ip || 'unknown',
) {
  const limiter = new RateLimiter(maxRequests, windowMs);

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyFn(req);
    const allowed = limiter.isAllowed(key);
    const status = limiter.getStatus(key);

    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', status.remaining.toString());
    res.setHeader('X-RateLimit-Reset', new Date(status.resetAt).toISOString());

    if (!allowed) {
      res.status(429).json({
        code: 'TOO_MANY_REQUESTS',
        message: 'Rate limit exceeded',
        retryAfter: Math.ceil((status.resetAt - Date.now()) / 1000),
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}

/**
 * Request logging middleware
 */
export function requestLogging(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const originalSend = res.send;

  res.send = function(data: any) {
    const duration = Date.now() - startTime;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`,
    );
    return originalSend.call(this, data);
  };

  next();
}

/**
 * Error handling middleware
 */
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction): void {
  console.error('[Error]', {
    message: err.message,
    code: err.code,
    statusCode: err.statusCode,
    stack: err.stack,
    path: req.path,
  });

  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    code,
    message,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Health check middleware
 */
export function healthCheckHandler(_req: Request, res: Response): void {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}

/**
 * Parse size string (e.g., '1mb' -> 1048576)
 */
function parseSize(size: string): number {
  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const match = size.toLowerCase().match(/^(\d+)(b|kb|mb|gb)$/);
  if (!match) {
    return parseInt(size, 10) || 1024 * 1024;
  }

  return parseInt(match[1], 10) * units[match[2]];
}
