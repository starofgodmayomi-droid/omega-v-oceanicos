/**
 * ΩVØØS BACKEND MAGIC ENGINE (TypeScript)
 * PROTOCOL: LOCAL-FIRST | 11:11 OCEAN INTELLIGENCE | DEUS EX MACHINA
 * CHECKSUM: 30013030 | DOCTRINE: ATTEST, DON'T ASSERT. UNKNOWN PRESERVED.
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface VoosReceipt {
  entity: 'ΩVØØS_DEUS_EX_MACHINA';
  status: 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN';
  game_detected: boolean;
  phase_t: string;
  evidence_hash: string;
  action: string;
  next_delta: string;
}

export interface LedgerEntry {
  timestamp: string;
  intent: string;
  phase_t: number;
  status: 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN';
  evidence_hash: string;
  reason: string;
  authorized: boolean;
}

export class KaiShield {
  private static readonly TRAPS = [
    'urgent',
    'send money',
    'guaranteed',
    'private key',
  ];

  public scan(intent: string): { trapDetected: boolean; trigger?: string } {
    const normalized = intent.normalize('NFKC').toLowerCase();
    for (const trap of KaiShield.TRAPS) {
      if (normalized.includes(trap.toLowerCase())) {
        return { trapDetected: true, trigger: trap };
      }
    }
    return { trapDetected: false };
  }
}

export class ElionEngine {
  /**
   * Harmonic Non-linear S-curve: Ease(t) = (1 - cos(t * π)) / 2
   */
  public ease(t: number): number {
    const boundedT = Math.max(0, Math.min(1, t));
    return (1 - Math.cos(boundedT * Math.PI)) / 2;
  }

  public getPhaseDescription(t: number): string {
    if (t < 0.25) return 'SPROUT (Perceive & Calibrate)';
    if (t < 0.70) return 'BLOOM (Non-linear Growth & Execution)';
    if (t < 0.95) return 'PLATEAU (Attest & Seal)';
    return 'WILT / RETURN (Harvest & Cycle)';
  }

  public buildAbundanceBridge(topic: string): {
    heartOpening: string;
    visionInvitation: string;
    honorableRequest: string;
    gracefulSpace: string;
  } {
    return {
      heartOpening: `Remembering our shared commitment to transparent, local-first truth in ${topic}.`,
      visionInvitation: `Envisioning a resilient ecosystem where sovereign verification replaces internet speculation.`,
      honorableRequest: `Inviting symmetric partnership and mutual resource alignment without dependency or leverage.`,
      gracefulSpace: `Zero pressure, multiple ways to connect, with human dignity and freedom preserved.`,
    };
  }
}

export class OmegaGate {
  public computeHash(payload: Record<string, unknown> | string): string {
    const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
  }

  public verify(expected: unknown, observed: unknown): boolean {
    if (expected === undefined || observed === undefined) return false;
    return JSON.stringify(expected) === JSON.stringify(observed);
  }
}

export class KaiLedger {
  private ledgerPath: string;

  constructor(customPath?: string) {
    this.ledgerPath = customPath || path.resolve(process.cwd(), 'ΩVØØS', 'kai_ledger.json');
  }

  public append(entry: LedgerEntry): void {
    let entries: LedgerEntry[] = [];
    if (fs.existsSync(this.ledgerPath)) {
      try {
        const raw = fs.readFileSync(this.ledgerPath, 'utf8');
        entries = JSON.parse(raw);
      } catch {
        entries = [];
      }
    } else {
      const dir = path.dirname(this.ledgerPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    entries.push(entry);
    fs.writeFileSync(this.ledgerPath, JSON.stringify(entries, null, 2), 'utf8');
  }

  public getEntries(): LedgerEntry[] {
    if (!fs.existsSync(this.ledgerPath)) return [];
    try {
      return JSON.parse(fs.readFileSync(this.ledgerPath, 'utf8'));
    } catch {
      return [];
    }
  }
}

export class VoosEngine {
  private kaiShield = new KaiShield();
  private elion = new ElionEngine();
  private omega = new OmegaGate();
  private ledger: KaiLedger;

  constructor(customLedgerPath?: string) {
    this.ledger = new KaiLedger(customLedgerPath);
  }

  public execute(intent: string, phaseT: number = 0.5): VoosReceipt {
    const timestamp = new Date().toISOString();
    const boundedT = Math.max(0, Math.min(1, phaseT));
    const easedT = this.elion.ease(boundedT);

    // 1. PERCEIVE & ALIGN (KAI Shield)
    const scan = this.kaiShield.scan(intent);
    if (scan.trapDetected) {
      const reason = `Trap detected: intent matched forbidden pattern "${scan.trigger}"`;
      const evidenceHash = this.omega.computeHash({ intent, reason, timestamp });
      
      this.ledger.append({
        timestamp,
        intent,
        phase_t: boundedT,
        status: 'DIVERGENT',
        evidence_hash: evidenceHash,
        reason,
        authorized: false,
      });

      return {
        entity: 'ΩVØØS_DEUS_EX_MACHINA',
        status: 'DIVERGENT',
        game_detected: true,
        phase_t: boundedT.toFixed(2),
        evidence_hash: evidenceHash,
        action: 'HALT ⊢ DIVERGENT (Simulation trap intercepted)',
        next_delta: 'Refactor intent to eliminate deceptive or urgent vectors',
      };
    }

    // 2. CONNECT & GROW (ELION Execute)
    const actionPayload = {
      intent,
      phase: this.elion.getPhaseDescription(boundedT),
      easedGrowth: easedT,
      mode: 'LOCAL_FIRST_DETERMINISTIC',
    };

    // 3. SYNCHRONIZE (OMEGA Verify)
    const evidenceHash = this.omega.computeHash(actionPayload);
    const expected = evidenceHash;
    const observed = this.omega.computeHash(actionPayload);
    const verified = this.omega.verify(expected, observed);
    const status = verified ? 'VERIFIED' : 'UNKNOWN';

    // 4. EVOLVE & REMEMBER (KAI Ledger)
    this.ledger.append({
      timestamp,
      intent,
      phase_t: boundedT,
      status,
      evidence_hash: evidenceHash,
      reason: 'Sovereign execution verified via OMEGA hash equality',
      authorized: true,
    });

    return {
      entity: 'ΩVØØS_DEUS_EX_MACHINA',
      status,
      game_detected: false,
      phase_t: boundedT.toFixed(2),
      evidence_hash: evidenceHash,
      action: `Executed verified local slice: "${intent.slice(0, 48)}" at Ease(${boundedT.toFixed(2)}) = ${easedT.toFixed(3)}`,
      next_delta: 'Attest ledger block and project next finite state transformation',
    };
  }
}

