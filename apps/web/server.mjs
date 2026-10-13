import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const DEFAULT_PORT = 3000;
const DEFAULT_API_BASE_URL = 'http://api:5000';
const READ_ONLY_METHODS = new Set(['GET', 'HEAD']);

const CONTENT_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.woff2', 'font/woff2'],
]);

const PROXY_RESPONSE_HEADERS = [
  'cache-control',
  'content-disposition',
  'content-length',
  'content-type',
  'etag',
  'last-modified',
];

/**
 * Browser-facing API gateway contract:
 * - browser never supplies the API service credential;
 * - only GET/HEAD are proxied;
 * - browser Authorization/Cookie are not forwarded upstream;
 * - mutations fail closed until an authenticated session/CSRF boundary exists.
 */
export function buildReadOnlyUpstreamHeaders(requestHeaders, readToken) {
  const headers = new Headers();
  const accept = requestHeaders.accept;
  const lastEventId = requestHeaders['last-event-id'];

  if (typeof accept === 'string' && accept.trim()) headers.set('accept', accept);
  if (typeof lastEventId === 'string' && lastEventId.trim()) headers.set('last-event-id', lastEventId);
  headers.set('authorization', `Bearer ${readToken}`);
  headers.set('x-oceanicos-web-gateway', 'read-only-v1');
  return headers;
}

export function isReadOnlyProxyMethod(method) {
  return READ_ONLY_METHODS.has(String(method || 'GET').toUpperCase());
}

export function apiTargetUrl(requestUrl, apiBaseUrl = DEFAULT_API_BASE_URL) {
  const source = new URL(requestUrl || '/', 'http://web.local');
  const upstreamPath = source.pathname.replace(/^\/api(?=\/|$)/, '') || '/';
  const target = new URL(apiBaseUrl);
  target.pathname = `${target.pathname.replace(/\/$/, '')}${upstreamPath}`;
  target.search = source.search;
  return target;
}

function json(reply, statusCode, body) {
  const payload = Buffer.from(JSON.stringify(body));
  reply.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(payload.length),
    'cache-control': 'no-store',
  });
  reply.end(payload);
}

function safeStaticPath(distDir, requestPathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(requestPathname);
  } catch {
    return null;
  }
  const relative = normalize(decoded).replace(/^([/\\])+/, '');
  const candidate = resolve(distDir, relative);
  const root = resolve(distDir);
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) return null;
  return candidate;
}

async function sendStatic(reply, distDir, requestPathname, method) {
  const candidate = safeStaticPath(distDir, requestPathname);
  if (!candidate) {
    json(reply, 400, { success: false, error: 'INVALID_STATIC_PATH' });
    return;
  }

  let filePath = candidate;
  try {
    const details = await stat(filePath);
    if (details.isDirectory()) filePath = join(filePath, 'index.html');
  } catch {
    filePath = join(distDir, 'index.html');
  }

  if (!existsSync(filePath)) {
    json(reply, 404, { success: false, error: 'WEB_ASSET_NOT_FOUND' });
    return;
  }

  const details = await stat(filePath);
  const contentType = CONTENT_TYPES.get(extname(filePath).toLowerCase()) || 'application/octet-stream';
  reply.writeHead(200, {
    'content-type': contentType,
    'content-length': String(details.size),
    'cache-control': filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'same-origin',
  });
  if (method === 'HEAD') {
    reply.end();
    return;
  }
  createReadStream(filePath).pipe(reply);
}

async function proxyReadOnlyApi(request, reply, { apiBaseUrl, readToken }) {
  if (!isReadOnlyProxyMethod(request.method)) {
    json(reply, 403, {
      success: false,
      error: 'WEB_SESSION_REQUIRED',
      message: 'Browser mutations remain disabled until an authenticated session and CSRF boundary is configured.',
    });
    return;
  }

  const target = apiTargetUrl(request.url, apiBaseUrl);
  let upstream;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers: buildReadOnlyUpstreamHeaders(request.headers, readToken),
      redirect: 'manual',
    });
  } catch {
    json(reply, 502, { success: false, error: 'API_GATEWAY_UNREACHABLE' });
    return;
  }

  const responseHeaders = {};
  for (const name of PROXY_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders[name] = value;
  }
  responseHeaders['x-oceanicos-web-gateway'] = 'read-only-v1';
  responseHeaders['x-content-type-options'] = 'nosniff';

  reply.writeHead(upstream.status, responseHeaders);
  if (request.method === 'HEAD' || !upstream.body) {
    reply.end();
    return;
  }

  Readable.fromWeb(upstream.body).pipe(reply);
}

export function createWebGateway(options = {}) {
  const distDir = resolve(options.distDir || fileURLToPath(new URL('./dist', import.meta.url)));
  const apiBaseUrl = String(
    options.apiBaseUrl !== undefined
      ? options.apiBaseUrl
      : process.env.OMEGA_API_INTERNAL_URL || DEFAULT_API_BASE_URL,
  ).trim();
  const readToken = String(
    options.readToken !== undefined ? options.readToken : process.env.OMEGA_READ_TOKEN || '',
  ).trim();

  if (!readToken) throw new Error('OMEGA_READ_TOKEN is required by the production web gateway');
  if (!/^https?:\/\//.test(apiBaseUrl)) throw new Error('OMEGA_API_INTERNAL_URL must be an http(s) URL');

  return createServer(async (request, reply) => {
    try {
      const pathname = new URL(request.url || '/', 'http://web.local').pathname;
      if (pathname === '/web-health') {
        json(reply, 200, { success: true, gateway: 'read-only-v1' });
        return;
      }
      if (pathname === '/api' || pathname.startsWith('/api/')) {
        await proxyReadOnlyApi(request, reply, { apiBaseUrl, readToken });
        return;
      }
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        json(reply, 405, { success: false, error: 'METHOD_NOT_ALLOWED' });
        return;
      }
      await sendStatic(reply, distDir, pathname, request.method);
    } catch {
      if (!reply.headersSent) json(reply, 500, { success: false, error: 'WEB_GATEWAY_FAILURE' });
      else reply.destroy();
    }
  });
}

function isDirectExecution() {
  return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isDirectExecution()) {
  const port = Number(process.env.WEB_PORT || DEFAULT_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('WEB_PORT must be a valid TCP port');
  const server = createWebGateway();
  server.listen(port, '0.0.0.0', () => {
    console.log(`[oceanicos-web] read-only gateway listening on :${port}`);
  });
}
