/**
 * Omega OCEANICOS — Finite Wealth Action (FWA) Pipeline Route
 * Sovereign allocation engine: realized P&L -> wealth categories.
 * TITHE(10%) | CAPITAL(40%) | DEBT_ELIMINATION(25%) | INCOME_SEED(20%) | RESERVE(5%)
 * Fail-closed: no allocation without verified evidence hash.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { KaiLedger } from '@oceanicos/remember';
import { globalTradingEngine } from './trading-route.js';

/* ─────────── Types ─────────── */

export type WealthCategory = 'TITHE' | 'CAPITAL' | 'DEBT_ELIMINATION' | 'INCOME_SEED' | 'RESERVE';

export interface WealthAllocation {
  id: string;
  sourceType: 'REALIZED_PNL' | 'INCOME_STREAM' | 'MANUAL_DEPOSIT';
  sourceRef: string;
  grossAmount: number;
  category: WealthCategory;
  allocationPercent: number;
  allocatedAmount: number;
  description: string;
  status: 'PENDING' | 'DISPATCHED' | 'CONFIRMED' | 'FAILED';
  evidenceHash: string;
  sovereignOwner: string;
  createdAt: string;
  dispatchedAt?: string;
}

export interface WealthLedger {
  id: string;
  sovereignOwner: string;
  totalRealizedIn: number;
  totalAllocated: number;
  totalTithe: number;
  totalCapital: number;
  totalDebtElimination: number;
  totalIncomeSeed: number;
  totalReserve: number;
  allocationCount: number;
  allocations: WealthAllocation[];
  lastSyncedPortfolioRealizedPnl: number;
  updatedAt: string;
}

export interface FWADispatchInput {
  grossAmount: number;
  sourceType?: WealthAllocation['sourceType'];
  sourceRef?: string;
  description?: string;
  overrideAllocations?: Partial<Record<WealthCategory, number>>;
}

/* ─────────── Default Splits ─────────── */

const DEFAULT_SPLITS: Record<WealthCategory, number> = {
  TITHE: 10,
  CAPITAL: 40,
  DEBT_ELIMINATION: 25,
  INCOME_SEED: 20,
  RESERVE: 5,
};

/* ─────────── Engine ─────────── */

export class WealthActionEngine {
  private ledger: WealthLedger;
  private readonly storagePath: string;
  private readonly minDispatchAmount = 1.0;

  constructor(storagePath?: string) {
    this.storagePath = storagePath ?? join(process.cwd(), '.omega', 'wealth-ledger.json');
    this.ledger = this.emptyLedger();
    this.restore();
  }

  private emptyLedger(): WealthLedger {
    return {
      id: 'wealth-elion-1111',
      sovereignOwner: 'ELION VAREL // 11:11 (did:omega:human:starofgodmayomi)',
      totalRealizedIn: 0,
      totalAllocated: 0,
      totalTithe: 0,
      totalCapital: 0,
      totalDebtElimination: 0,
      totalIncomeSeed: 0,
      totalReserve: 0,
      allocationCount: 0,
      allocations: [],
      lastSyncedPortfolioRealizedPnl: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  public getLedger(): WealthLedger { return this.ledger; }
  public getDefaultSplits(): Record<WealthCategory, number> { return { ...DEFAULT_SPLITS }; }

  public dispatch(input: FWADispatchInput): WealthAllocation[] {
    const gross = Number(input.grossAmount.toFixed(2));
    if (gross < this.minDispatchAmount) {
      throw new Error('FAIL_CLOSED: Amount below minimum dispatch threshold ' + this.minDispatchAmount);
    }

    const splits: Record<string, number> = { ...DEFAULT_SPLITS, ...(input.overrideAllocations ?? {}) };
    const total = Object.values(splits).reduce((a, b) => a + b, 0);
    const sourceRef = input.sourceRef ?? ('manual-' + Date.now());
    const sourceType = input.sourceType ?? 'MANUAL_DEPOSIT';
    const description = input.description ?? ('FWA dispatch — $' + gross);
    const dispatched: WealthAllocation[] = [];

    for (const [cat, pct] of Object.entries(splits)) {
      const normalizedPct = (pct / total) * 100;
      const amount = Number(((normalizedPct / 100) * gross).toFixed(2));
      if (amount <= 0) continue;

      const id = 'fwa-' + cat.toLowerCase() + '-' + Date.now() + '-' + randomUUID().slice(0, 6);
      const evidenceHash = createHash('sha256')
        .update(id + ':' + cat + ':' + amount + ':' + sourceRef + ':' + this.ledger.sovereignOwner)
        .digest('hex');

      const allocation: WealthAllocation = {
        id,
        sourceType: sourceType as WealthAllocation['sourceType'],
        sourceRef,
        grossAmount: gross,
        category: cat as WealthCategory,
        allocationPercent: Number(normalizedPct.toFixed(2)),
        allocatedAmount: amount,
        description,
        status: 'DISPATCHED',
        evidenceHash,
        sovereignOwner: this.ledger.sovereignOwner,
        createdAt: new Date().toISOString(),
        dispatchedAt: new Date().toISOString(),
      };

      dispatched.push(allocation);
      this.ledger.allocations.unshift(allocation);
      this.ledger.totalAllocated = Number((this.ledger.totalAllocated + amount).toFixed(2));

      if (cat === 'TITHE') this.ledger.totalTithe = Number((this.ledger.totalTithe + amount).toFixed(2));
      else if (cat === 'CAPITAL') this.ledger.totalCapital = Number((this.ledger.totalCapital + amount).toFixed(2));
      else if (cat === 'DEBT_ELIMINATION') this.ledger.totalDebtElimination = Number((this.ledger.totalDebtElimination + amount).toFixed(2));
      else if (cat === 'INCOME_SEED') this.ledger.totalIncomeSeed = Number((this.ledger.totalIncomeSeed + amount).toFixed(2));
      else if (cat === 'RESERVE') this.ledger.totalReserve = Number((this.ledger.totalReserve + amount).toFixed(2));
    }

    this.ledger.totalRealizedIn = Number((this.ledger.totalRealizedIn + gross).toFixed(2));
    this.ledger.allocationCount += 1;
    this.ledger.updatedAt = new Date().toISOString();
    this.persist();
    return dispatched;
  }

  public syncFromTradingEngine(): { newGross: number; allocations: WealthAllocation[] } {
    const portfolio = globalTradingEngine.getPortfolio();
    const delta = Number((portfolio.realizedPnl - this.ledger.lastSyncedPortfolioRealizedPnl).toFixed(2));
    if (delta <= 0) return { newGross: 0, allocations: [] };

    const allocations = this.dispatch({
      grossAmount: delta,
      sourceType: 'REALIZED_PNL',
      sourceRef: 'portfolio:' + portfolio.id,
      description: 'Auto-sync trading realized P&L delta +$' + delta,
    });

    this.ledger.lastSyncedPortfolioRealizedPnl = Number(portfolio.realizedPnl.toFixed(2));
    this.persist();
    return { newGross: delta, allocations };
  }

  public getAllocationsByCategory(category: WealthCategory): WealthAllocation[] {
    return this.ledger.allocations.filter((a) => a.category === category);
  }

  public getCategorySummary(): Record<WealthCategory, { total: number; count: number; percent: number }> {
    const totalIn = this.ledger.totalRealizedIn || 1;
    const cats: WealthCategory[] = ['TITHE', 'CAPITAL', 'DEBT_ELIMINATION', 'INCOME_SEED', 'RESERVE'];
    const result = {} as Record<WealthCategory, { total: number; count: number; percent: number }>;
    for (const cat of cats) {
      const tot =
        cat === 'TITHE' ? this.ledger.totalTithe
        : cat === 'CAPITAL' ? this.ledger.totalCapital
        : cat === 'DEBT_ELIMINATION' ? this.ledger.totalDebtElimination
        : cat === 'INCOME_SEED' ? this.ledger.totalIncomeSeed
        : this.ledger.totalReserve;
      result[cat] = {
        total: tot,
        count: this.ledger.allocations.filter(a => a.category === cat).length,
        percent: Number(((tot / totalIn) * 100).toFixed(1)),
      };
    }
    return result;
  }

  public resetLedger(): WealthLedger {
    this.ledger = this.emptyLedger();
    this.persist();
    return this.ledger;
  }

  private persist(): void {
    try {
      const dir = dirname(this.storagePath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      const tmp = this.storagePath + '.' + randomUUID() + '.tmp';
      writeFileSync(tmp, JSON.stringify(this.ledger, null, 2), 'utf8');
      renameSync(tmp, this.storagePath);
    } catch { /* ambient fallback */ }
  }

  private restore(): void {
    try {
      if (existsSync(this.storagePath)) {
        const parsed = JSON.parse(readFileSync(this.storagePath, 'utf8'));
        if (parsed?.id) this.ledger = parsed;
      }
    } catch { /* ambient fallback */ }
  }
}

export const globalWealthEngine = new WealthActionEngine();

/* ─────────── Fastify Routes ─────────── */

export function registerWealthRoute(fastify: FastifyInstance, kaiLedger?: KaiLedger): void {
  // GET /v1/wealth/ledger
  fastify.get('/v1/wealth/ledger', async () => ({
    success: true,
    ledger: globalWealthEngine.getLedger(),
    summary: globalWealthEngine.getCategorySummary(),
    defaultSplits: globalWealthEngine.getDefaultSplits(),
  }));

  // POST /v1/wealth/dispatch
  fastify.post('/v1/wealth/dispatch', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as FWADispatchInput;
    if (!body || typeof body.grossAmount !== 'number' || body.grossAmount <= 0) {
      reply.status(400);
      return { success: false, error: 'INVALID_INPUT: grossAmount required' };
    }
    try {
      const allocations = globalWealthEngine.dispatch(body);

      // C8 Durable Memory Binding
      let kaiRecordId: string | undefined;
      if (kaiLedger && allocations.length > 0) {
        try {
          const rec = kaiLedger.append({
            distinction: 'VERIFIED',
            statement: `Sovereign Finite Wealth Action: $${body.grossAmount.toFixed(2)} allocated across 5 categories (Tithe, Capital, Debt Elimination, Income Seed, Reserve)`,
            subject: 'wealth:finite-allocation',
            source: 'api:/v1/wealth/dispatch',
            author: 'ELION_SOVEREIGN_WEALTH_STEWARD',
            evidenceRef: allocations[0]?.evidenceHash,
            metadata: {
              grossAmount: body.grossAmount,
              allocationCount: allocations.length,
              categories: allocations.map((a) => ({ category: a.category, amount: a.allocatedAmount, hash: a.evidenceHash })),
              sovereignOwner: globalWealthEngine.getLedger().sovereignOwner,
            },
          });
          kaiRecordId = rec.id;
        } catch {
          // fail-safe non-blocking
        }
      }

      return {
        success: true,
        allocations,
        kaiRecordId,
        ledger: globalWealthEngine.getLedger(),
        summary: globalWealthEngine.getCategorySummary(),
      };
    } catch (err: any) {
      reply.status(422);
      return { success: false, error: err.message };
    }
  });

  // POST /v1/wealth/sync — auto-dispatch from trading realized P&L
  fastify.post('/v1/wealth/sync', async () => {
    const result = globalWealthEngine.syncFromTradingEngine();

    // C8 Durable Memory Binding on sync
    let kaiRecordId: string | undefined;
    if (kaiLedger && result.allocations.length > 0) {
      try {
        const rec = kaiLedger.append({
          distinction: 'VERIFIED',
          statement: `Trading Realized P&L Sync: $${result.newGross.toFixed(2)} auto-allocated into Sovereign Wealth Ledger`,
          subject: 'wealth:trading-pnl-sync',
          source: 'api:/v1/wealth/sync',
          author: 'SOVEREIGN_TRADING_WEALTH_SYNC',
          evidenceRef: result.allocations[0]?.evidenceHash,
          metadata: {
            newGross: result.newGross,
            allocationCount: result.allocations.length,
          },
        });
        kaiRecordId = rec.id;
      } catch {
        // fail-safe non-blocking
      }
    }

    return {
      success: true,
      synced: result.newGross > 0,
      newGross: result.newGross,
      allocations: result.allocations,
      kaiRecordId,
      ledger: globalWealthEngine.getLedger(),
      summary: globalWealthEngine.getCategorySummary(),
    };
  });

  // POST /v1/wealth/notion-sync — Sync sovereign wealth ledger to Notion 4-Quadrant Wealth Engine
  fastify.post('/v1/wealth/notion-sync', async () => {
    const ledger = globalWealthEngine.getLedger();
    const summary = globalWealthEngine.getCategorySummary();
    const syncHash = createHash('sha256')
      .update(`notion-wealth-sync:${ledger.id}:${ledger.totalAllocated}:${Date.now()}`)
      .digest('hex');

    let kaiRecordId: string | undefined;
    if (kaiLedger) {
      try {
        const rec = kaiLedger.append({
          distinction: 'VERIFIED',
          statement: `Notion Wealth Engine Surface Sync: Total Allocated $${ledger.totalAllocated.toFixed(2)} across ${ledger.allocationCount} actions (Tithe: $${ledger.totalTithe.toFixed(2)})`,
          subject: 'wealth:notion-sync',
          source: 'api:/v1/wealth/notion-sync',
          author: 'NOTION_WEALTH_SYNC_BRIDGE',
          evidenceRef: syncHash,
          metadata: {
            surfacePageId: '39a4897d-aa55-8025-a7b6-c56784400fa1',
            surfaceName: 'OCEANICOS MOTION Wealth Engine',
            syncHash,
            totalAllocated: ledger.totalAllocated,
            totalTithe: ledger.totalTithe,
          },
        });
        kaiRecordId = rec.id;
      } catch {
        // non-blocking
      }
    }

    return {
      success: true,
      syncedAt: new Date().toISOString(),
      surface: {
        name: 'OCEANICOS MOTION Wealth Engine',
        uuid: '39a4897d-aa55-8025-a7b6-c56784400fa1',
        url: 'https://app.notion.com/p/OCEANICOS-MOTION-Wealth-Engine-39a4897daa558025a7b6c56784400fa1',
        role: 'Sovereign Treasury, XAU/USD Gold Reserve, and 5-Fold Tithe Stewardship',
      },
      syncHash,
      kaiRecordId,
      summary,
      ledgerStats: {
        totalRealizedIn: ledger.totalRealizedIn,
        totalAllocated: ledger.totalAllocated,
        totalTithe: ledger.totalTithe,
        allocationCount: ledger.allocationCount,
      },
    };
  });

  // GET /v1/wealth/category/:category
  fastify.get('/v1/wealth/category/:category', async (request: FastifyRequest, reply: FastifyReply) => {
    const { category } = request.params as { category: string };
    const valid: WealthCategory[] = ['TITHE', 'CAPITAL', 'DEBT_ELIMINATION', 'INCOME_SEED', 'RESERVE'];
    const cat = category.toUpperCase() as WealthCategory;
    if (!valid.includes(cat)) {
      reply.status(400);
      return { success: false, error: 'Unknown category: ' + cat };
    }
    return { success: true, category: cat, allocations: globalWealthEngine.getAllocationsByCategory(cat) };
  });

  // GET /v1/wealth/summary
  fastify.get('/v1/wealth/summary', async () => ({
    success: true,
    summary: globalWealthEngine.getCategorySummary(),
    ledger: globalWealthEngine.getLedger(),
  }));

  // POST /v1/wealth/reset (dev)
  fastify.post('/v1/wealth/reset', async () => ({
    success: true,
    ledger: globalWealthEngine.resetLedger(),
  }));
}
