/*
 * BROWSER — the limb that actually reads a page.
 *
 * This is the only OMNICOS limb that reaches the network. One bounded read:
 * one explicit http(s) URL, a public host, at most three redirects, eight
 * seconds and 512 KiB. Private, loopback, link-local and metadata hosts are
 * refused before the socket opens, so the limb cannot be used to scan the
 * machine it runs on.
 *
 * The limb returns an observation, not a claim. OMEGA still hashes the text
 * and checks the contract before the receipt may say VERIFIED.
 */
import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_BYTES = 512 * 1024;
const DEFAULT_MAX_REDIRECTS = 3;
const MAX_TEXT_CHARS = 6_000;
const ALLOWED_PORTS = new Set(['', '80', '443']);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const PRIVATE_HOST_SUFFIXES = ['.localhost', '.local', '.internal', '.home.arpa'];
const USER_AGENT = 'OMNICOS-BROWSER/1.0 (attest, do not assert)';

const URL_PATTERN = /https?:\/\/[^\s<>"'`]+/i;
const TRAILING_PUNCTUATION = /[)\]}>,.;:!?'"]+$/;

export type BrowserFetchLike = typeof fetch;

export type BrowserLimbOptions = {
  /** Test seam: a fetch with the same contract. Defaults to the global fetch. */
  fetchImpl?: BrowserFetchLike;
  /** Test seam: hostname → addresses. Defaults to `dns.lookup`. */
  resolveHost?: (hostname: string) => Promise<string[]>;
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
};

export type BrowserObservation = {
  ok: boolean;
  /** The URL the intent named. */
  url: string | null;
  /** The URL that answered after redirects. */
  finalUrl: string | null;
  status: number | null;
  contentType: string | null;
  bytes: number;
  /** Readable text with the markup removed; empty when the read failed. */
  text: string;
  /** A fail-closed reason when `ok` is false. */
  error: string | null;
};

/** The first explicit http(s) URL in the intent, trailing punctuation removed. */
export function extractUrl(intent: string): string | null {
  const match = intent.match(URL_PATTERN);
  if (!match) return null;
  const candidate = match[0].replace(TRAILING_PUNCTUATION, '');
  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

const isPrivateIpv4 = (address: string): boolean => {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
};

export const isPrivateAddress = (address: string): boolean => {
  const normalized = address.trim().toLowerCase().replace(/^\[|\]$/g, '').split('%')[0];
  if (!normalized) return true;
  if (isIP(normalized) === 4) return isPrivateIpv4(normalized);
  if (isIP(normalized) !== 6) return true;
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIpv4(mapped[1]);
  return (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb') ||
    normalized.startsWith('ff')
  );
};

const defaultResolveHost = async (hostname: string): Promise<string[]> => {
  const addresses = await dnsLookup(hostname, { all: true, verbatim: true });
  return addresses.map((entry) => entry.address);
};

type UrlDecision = { ok: true; url: URL } | { ok: false; error: string };

/** Fail-closed gate: one explicit, public http(s) URL or a declared reason. */
export async function admitUrl(raw: string, options: BrowserLimbOptions = {}): Promise<UrlDecision> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: 'INVALID_URL' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, error: 'UNSUPPORTED_SCHEME' };
  }
  if (url.username || url.password) {
    return { ok: false, error: 'URL_CREDENTIALS_REFUSED' };
  }
  if (!ALLOWED_PORTS.has(url.port)) {
    return { ok: false, error: 'UNSUPPORTED_PORT' };
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
  if (!hostname) return { ok: false, error: 'MISSING_HOST' };
  if (
    hostname === 'localhost' ||
    hostname === 'metadata.google.internal' ||
    PRIVATE_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  ) {
    return { ok: false, error: 'PRIVATE_HOST_REFUSED' };
  }

  let addresses: string[];
  if (isIP(hostname)) {
    addresses = [hostname];
  } else {
    try {
      addresses = await (options.resolveHost ?? defaultResolveHost)(hostname);
    } catch {
      return { ok: false, error: 'HOST_NOT_RESOLVED' };
    }
  }
  if (addresses.length === 0) return { ok: false, error: 'HOST_NOT_RESOLVED' };
  if (addresses.some(isPrivateAddress)) {
    return { ok: false, error: 'PRIVATE_HOST_REFUSED' };
  }
  return { ok: true, url };
}

const isReadableContentType = (contentType: string): boolean =>
  contentType.startsWith('text/') ||
  contentType === 'application/json' ||
  contentType === 'application/xml' ||
  contentType.endsWith('+json') ||
  contentType.endsWith('+xml');

const collapse = (value: string): string => value.replace(/\s+/g, ' ').trim();

const decodeEntities = (value: string): string =>
  value
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&');

/** Readable text only: scripts, styles and markup are removed, never indexed. */
export function extractReadableText(body: string, contentType: string): string {
  if (contentType !== 'text/html' && contentType !== 'application/xhtml+xml') {
    return collapse(body).slice(0, MAX_TEXT_CHARS);
  }
  const title = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '';
  const withoutShell = body
    .replace(/<(script|style|noscript|template|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, ' ');
  const visible = collapse(decodeEntities(withoutShell.replace(/<[^>]+>/g, ' ')));
  const heading = collapse(decodeEntities(title.replace(/<[^>]+>/g, ' ')));
  return (heading ? `${heading} — ${visible}` : visible).slice(0, MAX_TEXT_CHARS);
}

type BoundedRead = { ok: true; bytes: number; body: string } | { ok: false; error: string };

async function readBounded(response: Response, maxBytes: number): Promise<BoundedRead> {
  if (!response.body || typeof response.body.getReader !== 'function') {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > maxBytes) return { ok: false, error: 'PAGE_TOO_LARGE' };
    return { ok: true, bytes: buffer.byteLength, body: buffer.toString('utf8') };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return { ok: false, error: 'PAGE_TOO_LARGE' };
    }
    chunks.push(value);
  }
  return { ok: true, bytes: total, body: Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString('utf8') };
}

const failed = (
  url: string,
  error: string,
  finalUrl: string | null = null,
  status: number | null = null,
  contentType: string | null = null
): BrowserObservation => ({ ok: false, url, finalUrl, status, contentType, bytes: 0, text: '', error });

/**
 * One bounded read of one page. Never throws: a refusal is an observation with
 * `ok: false` and a declared reason, so the pass can preserve UNKNOWN.
 */
export async function observePage(
  rawUrl: string,
  options: BrowserLimbOptions = {}
): Promise<BrowserObservation> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;

  let current = rawUrl;
  try {
    for (let hop = 0; hop <= maxRedirects; hop += 1) {
      const admitted = await admitUrl(current, options);
      if (!admitted.ok) return failed(rawUrl, admitted.error, current);

      const response = await fetchImpl(admitted.url.toString(), {
        redirect: 'manual',
        headers: {
          accept: 'text/html,text/plain,application/json;q=0.9,*/*;q=0.1',
          'user-agent': USER_AGENT,
        },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (REDIRECT_STATUSES.has(response.status)) {
        const location = response.headers.get('location');
        if (!location) return failed(rawUrl, 'REDIRECT_WITHOUT_LOCATION', current, response.status);
        current = new URL(location, admitted.url).toString();
        continue;
      }
      if (response.status < 200 || response.status >= 300) {
        return failed(rawUrl, `HTTP_${response.status}`, current, response.status);
      }

      const contentType = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
      if (!isReadableContentType(contentType)) {
        return failed(
          rawUrl,
          `UNSUPPORTED_CONTENT_TYPE:${contentType || 'unknown'}`,
          current,
          response.status,
          contentType
        );
      }

      const declared = Number(response.headers.get('content-length') ?? '0');
      if (Number.isFinite(declared) && declared > maxBytes) {
        return failed(rawUrl, 'PAGE_TOO_LARGE', current, response.status, contentType);
      }

      const read = await readBounded(response, maxBytes);
      if (!read.ok) return failed(rawUrl, read.error, current, response.status, contentType);

      const text = extractReadableText(read.body, contentType);
      if (!text) return failed(rawUrl, 'PAGE_EMPTY_TEXT', current, response.status, contentType);

      return {
        ok: true,
        url: rawUrl,
        finalUrl: current,
        status: response.status,
        contentType,
        bytes: read.bytes,
        text,
        error: null,
      };
    }
    return failed(rawUrl, 'TOO_MANY_REDIRECTS', current);
  } catch (error) {
    const reason =
      error instanceof Error
        ? error.name === 'TimeoutError' || error.name === 'AbortError'
          ? 'FETCH_TIMEOUT'
          : error.message || 'FETCH_FAILED'
        : 'FETCH_FAILED';
    return failed(rawUrl, reason, current);
  }
}
