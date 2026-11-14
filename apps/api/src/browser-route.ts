import type { FastifyInstance } from 'fastify';
import { browseWeb, findChromePath, type BrowserNavigationResult } from './browser-service.js';

export function registerBrowserRoute(fastify: FastifyInstance, kaiLedger?: any): void {
  // GET /v1/browser/status - Report sandbox Chrome availability
  fastify.get('/v1/browser/status', async () => {
    const chromePath = findChromePath();
    return {
      success: true,
      service: 'omega-sandboxed-browser',
      available: Boolean(chromePath),
      binaryPath: chromePath,
      sandbox: 'isolated-headless',
      policy: 'fail-closed-http-https-only',
    };
  });

  // POST /v1/browser/navigate - Browse a target URL in the sandbox
  fastify.post<{
    Body: {
      url?: string;
      captureScreenshot?: boolean;
      timeoutMs?: number;
    };
  }>('/v1/browser/navigate', async (request, reply) => {
    const { url, captureScreenshot, timeoutMs } = request.body || {};

    if (!url || typeof url !== 'string') {
      return reply.status(400).send({
        success: false,
        error: 'INVALID_URL',
        message: 'A target URL string is required',
      });
    }

    try {
      const result: BrowserNavigationResult = await browseWeb(url, {
        captureScreenshot: Boolean(captureScreenshot),
        timeoutMs: timeoutMs ? Number(timeoutMs) : 15000,
      });

      if (kaiLedger && result.success) {
        try {
          kaiLedger.append({
            distinction: 'VERIFIED',
            statement: `Sandboxed Browser visited: ${result.url} ("${result.title}")`,
            subject: 'browser:navigation',
            source: 'api:/v1/browser/navigate',
            author: 'OMEGA_SANDBOX_BROWSER',
            evidenceRef: result.evidenceHash,
            metadata: {
              url: result.url,
              title: result.title,
              elapsedMs: result.elapsedMs,
              contentLength: result.contentLength,
            },
          });
        } catch {
          // best effort
        }
      }

      return reply.status(result.success ? 200 : 502).send(result);
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: 'NAVIGATION_FAILED',
        message: err.message,
      });
    }
  });
}
