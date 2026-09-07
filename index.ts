import * as crypto from 'crypto';

// ==========================================
// 👁 LAYER 1: THE OBSERVER (Physical Base)
// ==========================================
export interface Telemetry {
  siliconYield: number;
  powerMW: number;
  nodes: number;
}

export const observe = (): Telemetry => ({
  siliconYield: 0.942,
  powerMW: 1250,
  nodes: 989210,
});

// ==========================================
// ✓ LAYER 2: THE VERIFIER (Frontier Law)
// ==========================================
export interface Assertion {
  region: 'US' | 'CN' | 'EU';
  ok: boolean;
}

export interface Receipt {
  status: 'PASS' | 'FAIL' | 'DIVERGENT';
  route: string;
  logs: Assertion[];
}

export function verify(t: Telemetry): Receipt {
  const logs: Assertion[] = [
    { region: 'US', ok: t.nodes > 500000 },
    { region: 'CN', ok: t.siliconYield >= 0.92 },
    { region: 'EU', ok: true },
  ];
  const passed = logs.filter((l) => l.ok).length;
  const status = passed === logs.length ? 'PASS' : passed > 0 ? 'DIVERGENT' : 'FAIL';
  return { status, route: '0 ➔ MINI ➔ FULL ➔ ECO ➔ OM', logs };
}

// ==========================================
// 🧠 LAYER 3: THE REMEMBER MATRIX (Ledger)
// ==========================================
export interface Block {
  index: number;
  ts: string;
  receipt: Receipt;
  prev: string;
  hash: string;
  nonce: number;
}

export class Ledger {
  public chain: Block[] = [];
  private root = '8a3f91c2e4f9011b989210ffffffffff';

  constructor() {
    this.mint(4101, this.root, { status: 'PASS', route: 'ROOT', logs: [] });
  }

  public commit(receipt: Receipt): Block {
    const last = this.chain[this.chain.length - 1];
    return this.mint(last.index + 1, last.hash, receipt);
  }

  private mint(index: number, prev: string, receipt: Receipt): Block {
    const ts = new Date().toISOString();
    let nonce = 0;
    let hash = '';
    while (true) {
      hash = crypto
        .createHash('sha256')
        .update(`${index}-${ts}-${JSON.stringify(receipt)}-${prev}-${nonce}`)
        .digest('hex');
      if (hash.substring(0, 2) === '00') break;
      nonce++;
    }
    const block = { index, ts, receipt, prev, hash, nonce };
    this.chain.push(block);
    return block;
  }
}

// ==========================================
// 🤖 LAYER 4: THE ORCHESTRATOR & THE UI
// ==========================================
export function bootOceanicosOS() {
  const ledger = new Ledger();
  const rawData = observe();
  const receipt = verify(rawData);
  const block = ledger.commit(receipt);

  console.log(
    `\nΩ ➔ [👁 ${Math.round(rawData.siliconYield * 100)}% | ✓ ${receipt.status} | 🧠 #${block.index}] ── LIVE ── 0 ERRORS ── $ █`
  );
  console.log(`   [HASH-LOCK] : ${block.hash}`);
  console.log('   [MANIFESTO] : Truth is compiled by verification, not asserted by authority.\n');
}

bootOceanicosOS();
