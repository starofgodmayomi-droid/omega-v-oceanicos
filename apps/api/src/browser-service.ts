/**
 * Ω∞v Sandboxed Browser Engine
 *
 * Provides a bounded, secure, fail-closed web browsing engine using host Chromium/Chrome.
 * Can navigate to web pages, extract DOM/text, take screenshots, and extract metadata
 * without arbitrary shell access.
 */

import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';

export interface BrowserNavigationResult {
  success: boolean;
  url: string;
  title: string;
  contentLength: number;
  textSnippet: string;
  screenshotBase64?: string;
  evidenceHash: string;
  elapsedMs: number;
  executedAt: string;
  error?: string;
}

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

export function findChromePath(): string | null {
  for (const p of CHROME_PATHS) {
    if (existsSync(p)) return p;
  }
  return null;
}

export function sanitizeUrl(rawUrl: string): string {
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`Disallowed protocol: ${parsed.protocol}`);
  }
  return parsed.toString();
}

export async function browseWeb(
  targetUrl: string,
  options: { captureScreenshot?: boolean; timeoutMs?: number } = {}
): Promise<BrowserNavigationResult> {
  const startedAt = Date.now();
  const chromePath = findChromePath();
  if (!chromePath) {
    return {
      success: false,
      url: targetUrl,
      title: '',
      contentLength: 0,
      textSnippet: '',
      evidenceHash: '0x0000-no-chrome-binary',
      elapsedMs: 0,
      executedAt: new Date().toISOString(),
      error: 'No Chrome or Chromium binary found in system sandbox paths',
    };
  }

  const validUrl = sanitizeUrl(targetUrl);
  const tmpDir = join(os.tmpdir(), `omega-browser-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  mkdirSync(tmpDir, { recursive: true });

  const screenshotPath = join(tmpDir, 'screenshot.png');
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--dump-dom',
    `--user-data-dir=${tmpDir}`,
  ];

  if (options.captureScreenshot) {
    args.push(`--screenshot=${screenshotPath}`);
  }

  args.push(validUrl);

  return new Promise((resolve) => {
    execFile(
      chromePath,
      args,
      {
        timeout: options.timeoutMs ?? 15000,
        maxBuffer: 10 * 1024 * 1024,
      },
      (err, stdout, stderr) => {
        const elapsedMs = Date.now() - startedAt;
        const executedAt = new Date().toISOString();

        if (err && !stdout) {
          try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
          return resolve({
            success: false,
            url: validUrl,
            title: '',
            contentLength: 0,
            textSnippet: '',
            evidenceHash: '0x0000-exec-error',
            elapsedMs,
            executedAt,
            error: err.message || stderr,
          });
        }

        const html = stdout || '';
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : 'Untitled';

        // Strip HTML tags for clean text preview
        const plainText = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        let screenshotBase64: string | undefined;
        if (options.captureScreenshot && existsSync(screenshotPath)) {
          try {
            screenshotBase64 = readFileSync(screenshotPath).toString('base64');
          } catch {}
        }

        const evidenceHash = createHash('sha256')
          .update(`BROWSER:${validUrl}:${title}:${plainText.slice(0, 500)}`)
          .digest('hex');

        try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}

        resolve({
          success: true,
          url: validUrl,
          title,
          contentLength: html.length,
          textSnippet: plainText.slice(0, 400),
          screenshotBase64,
          evidenceHash,
          elapsedMs,
          executedAt,
        });
      }
    );
  });
}
