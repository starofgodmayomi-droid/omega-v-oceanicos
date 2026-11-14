import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { resolve } from 'path';

const ledgerPath = resolve(process.cwd(), 'kai_ledger.json');
const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));

const prevTip = ledger.entries.length > 0
  ? ledger.entries[ledger.entries.length - 1].hash
  : '0000000000000000000000000000000000000000000000000000000000000000';

const payload = {
  receipt: 78,
  agent: 'antigravity',
  action: 'SANDBOXED_BROWSER_ENGINE_INTEGRATION',
  scope: [
    'apps/api/src/browser-service.ts',
    'apps/api/src/browser-route.ts',
    'apps/api/src/index.ts',
    'apps/api/src/chat-route.ts'
  ],
  evidence: {
    browser_status: { available: true, binaryPath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' },
    navigate_test: { url: 'https://example.com', title: 'Example Domain', elapsedMs: 1560 },
    chat_trigger: { action: 'EXECUTE_SANDBOXED_BROWSER', kaiRecord: 'kai-1794688253474-630' },
    tests: { chat: '11/11 PASS', typescript: '0 errors' }
  },
  timestamp: new Date().toISOString(),
  prevHash: prevTip
};

const hash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
ledger.entries.push({ ...payload, hash });

writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
console.log(`✓ Receipt #78 appended. Hash: sha256:${hash}`);
console.log(`✓ Total ledger entries: ${ledger.entries.length}`);
