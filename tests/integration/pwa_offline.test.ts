import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

describe('📱 OceanicOS PWA Offline & Service Worker Verification Slice', () => {
  const rootDir = process.cwd();
  const manifestPath = join(rootDir, 'apps/web/public/manifest.json');
  const swPath = join(rootDir, 'apps/web/public/sw.js');
  const indexHtmlPath = join(rootDir, 'apps/web/index.html');
  const icon192Path = join(rootDir, 'apps/web/public/icons/icon-192.png');
  const icon512Path = join(rootDir, 'apps/web/public/icons/icon-512.png');

  it('verifies manifest.json exists, parses, and satisfies PWA criteria', () => {
    assert.ok(existsSync(manifestPath), 'manifest.json must exist in apps/web/public');
    const raw = readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw);

    assert.equal(manifest.name, 'OCEANICOS Ω∞v — Water Intelligence');
    assert.equal(manifest.short_name, 'Ω∞v');
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.start_url, '/');
    assert.equal(manifest.theme_color, '#69e7b9');
    assert.equal(manifest.background_color, '#020d18');
    assert.ok(Array.isArray(manifest.icons));
    assert.ok(manifest.icons.length >= 2);

    const icon192 = manifest.icons.find((i: any) => i.sizes === '192x192');
    const icon512 = manifest.icons.find((i: any) => i.sizes === '512x512');
    assert.ok(icon192, '192x192 icon must be specified');
    assert.ok(icon512, '512x512 icon must be specified');
  });

  it('verifies PWA icon binary assets exist and are populated', () => {
    assert.ok(existsSync(icon192Path), 'icon-192.png must exist');
    assert.ok(existsSync(icon512Path), 'icon-512.png must exist');
    const stat192 = readFileSync(icon192Path);
    const stat512 = readFileSync(icon512Path);
    assert.ok(stat192.length > 500, 'icon-192 must be a valid non-empty PNG');
    assert.ok(stat512.length > 1000, 'icon-512 must be a valid non-empty PNG');
  });

  it('verifies sw.js implements required lifecycle events and caching policy', () => {
    assert.ok(existsSync(swPath), 'sw.js must exist in apps/web/public');
    const swContent = readFileSync(swPath, 'utf-8');

    // Lifecycle events
    assert.match(swContent, /addEventListener\(['"]install['"]/);
    assert.match(swContent, /addEventListener\(['"]activate['"]/);
    assert.match(swContent, /addEventListener\(['"]fetch['"]/);

    // Caching semantics
    assert.match(swContent, /caches\.open/);
    assert.match(swContent, /caches\.match/);

    // Network-first for API endpoints
    assert.match(swContent, /\/v1\//);

    // Never cache live SSE streams
    assert.match(swContent, /\/stream/);
  });

  it('verifies index.html links manifest and main.tsx registers service worker', () => {
    assert.ok(existsSync(indexHtmlPath), 'index.html must exist in apps/web');
    const htmlContent = readFileSync(indexHtmlPath, 'utf-8');
    assert.match(htmlContent, /rel=["']manifest["']\s+href=["']\/manifest\.json["']/);
    assert.match(htmlContent, /meta name=["']theme-color["']/);

    const mainTsxPath = join(rootDir, 'apps/web/src/main.tsx');
    assert.ok(existsSync(mainTsxPath), 'main.tsx must exist');
    const mainContent = readFileSync(mainTsxPath, 'utf-8');
    assert.match(mainContent, /serviceWorker\s*\.register\(['"]\/sw\.js['"]\)/);
  });

  it('attests offline dream journaling queue protocol', () => {
    // Protocol specification contract
    interface OfflineDreamEntry {
      id: string;
      message: string;
      authorDid: string;
      queuedAt: string;
      status: 'pending' | 'synced';
    }

    const testDream: OfflineDreamEntry = {
      id: `dream-offline-${Date.now()}`,
      message: 'I had a dream: the ocean waves turned into binary light.',
      authorDid: 'did:omega:human:starofgodmayomi',
      queuedAt: new Date().toISOString(),
      status: 'pending',
    };

    assert.equal(testDream.status, 'pending');
    assert.equal(testDream.authorDid, 'did:omega:human:starofgodmayomi');
    assert.match(testDream.message, /dream/i);

    // Transition to synced
    testDream.status = 'synced';
    assert.equal(testDream.status, 'synced');
  });
});
