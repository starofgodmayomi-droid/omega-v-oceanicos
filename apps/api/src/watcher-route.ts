import { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';

export interface WatcherTelemetry {
  watcherId: string;
  status: 'ACTIVE_PROBING' | 'HARMONIZED' | 'STANDBY';
  factsCount: number;
  currentTokens: string[];
  activeDepth: string;
  corridor: {
    name: string;
    monolithCount: number;
    activeNodes: string[];
    vanishingPointRecession: number;
  };
  marketLiquidity: {
    primaryAsset: string;
    price: number;
    change: number;
    changePercent: number;
    orderBlocks: {
      bullish: Array<{ level: string; range: [number, number]; status: string }>;
      bearish: Array<{ level: string; range: [number, number]; status: string }>;
    };
    watchlist: Array<{ symbol: string; last: number; chg: number; chgPct: number }>;
    keyFacts: string;
  };
  provenanceHash: string;
  timestamp: string;
}

export function getWatcherSnapshot(): WatcherTelemetry {
  const timestamp = new Date().toISOString();
  const baseFacts = 37534;
  const elapsedSec = Math.floor(Date.now() / 3000) % 1000;
  const factsCount = baseFacts + elapsedSec;

  const tokenClusters = [
    ['get', 'invite', 'way', 'white', "i'm"],
    ['stop', 'walk', 'all', 'out', 'bounds'],
    ['landlord', 'dogs', 'more', 'boil', 'coworker'],
    ['aggressive', 'dream', 'sad', 'birthday', 'flights'],
    ['late', 'fridge', 'walk', 'friends', 'japanese'],
    ['plan', 'ideas', 'tokyo', 'talked', 'best'],
    ['mean', 'professional', 'eggs', 'screens', 'passive'],
  ];
  const currentTokens = tokenClusters[Math.floor(Date.now() / 4000) % tokenClusters.length];

  return {
    watcherId: 'WATCHER; 01',
    status: 'ACTIVE_PROBING',
    factsCount,
    currentTokens,
    activeDepth: 'HADOPELAGIC (6000m+)',
    corridor: {
      name: 'SEMANTIC_MEMORY_MONOLITH_CORRIDOR',
      monolithCount: 2,
      activeNodes: [
        '3 day trip to tokyo',
        'tell my boss',
        'how to get over someone',
        'fall asleep',
        'many calories in a cookie',
        'is it okay to cry at work',
        'to fix a squeaky door',
        'how much water should i drink',
        'my lease ends',
        'flights to tokyo',
      ],
      vanishingPointRecession: 0.85,
    },
    marketLiquidity: {
      primaryAsset: 'BTCUSD',
      price: 75400.0,
      change: -571.0,
      changePercent: -0.75,
      orderBlocks: {
        bullish: [
          { level: 'Bullish OB', range: [75200, 75400], status: 'MITIGATED_ENTRY' },
          { level: 'Bullish OB', range: [74800, 75000], status: 'UNTESTED_DEMAND' },
        ],
        bearish: [
          { level: 'Bearish OB', range: [76102, 76200], status: 'REJECTED_SUPPLY' },
          { level: 'Bearish OB', range: [75852, 75900], status: 'OVERHEAD_LIQUIDITY' },
        ],
      },
      watchlist: [
        { symbol: 'BTCUSD', last: 75400.0, chg: -571.0, chgPct: -0.75 },
        { symbol: 'XAGUSD', last: 51.5365, chg: -0.253, chgPct: -0.49 },
        { symbol: 'USDJPY', last: 158.36, chg: 0.658, chgPct: 0.42 },
        { symbol: 'GBPJPY', last: 211.571, chg: -0.535, chgPct: -0.25 },
        { symbol: 'XAUUSD', last: 4035.9, chg: -51.46, chgPct: -1.26 },
      ],
      keyFacts: "Bitcoin ETFs' year-to-date net outflows totaled about $510 million after Thursday's trading.",
    },
    provenanceHash: crypto.createHash('sha256').update(`WATCHER:01:${factsCount}:${timestamp}`).digest('hex'),
    timestamp,
  };
}

export function registerWatcherRoute(fastify: FastifyInstance): void {
  fastify.get('/v1/watcher', async () => {
    return {
      success: true,
      contract: 'Ω∞v-WATCHER-01-SEMANTIC-CORRIDOR-V1',
      steward: 'did:omega:human:starofgodmayomi',
      data: getWatcherSnapshot(),
    };
  });
}

