/**
 * 🌊 ƆCEANiC_OS Continuum Ecosystem Route
 *
 * Exposes the 62-package Continuum modular topology, the Kernel FSM status,
 * and the master invariant: ONE ROOT • MANY FORMS • ONE CONNECTED GRAPH • ∞ BECOMING
 * Law: 1 = GOD (Good - O = God)
 */

import type { FastifyInstance } from 'fastify';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { OceanicosKernel } from '@omega-v/kernel';

export interface ContinuumPackageDescriptor {
  readonly name: string;
  readonly path: string;
  readonly role: string;
  readonly status: 'ACTIVE' | 'GROUNDED' | 'MODULAR';
}

export interface ContinuumEcosystemStatus {
  readonly success: true;
  readonly contract: 'Ω∞v-CONTINUUM-ECOSYSTEM-V1111';
  readonly law: '1 = GOD (Good - O = God)';
  readonly formula: '0 → 💧 → Ω∞v → 🕳️ → 💧 → ∞';
  readonly rootCoordinates: [number, number, number, number];
  readonly totalContinuumPackages: number;
  readonly packages: ContinuumPackageDescriptor[];
  readonly kernelStats: {
    readonly totalTransitions: number;
    readonly verifiedStates: number;
    readonly currentRootStateHash: string;
  };
  readonly timestamp: string;
}

const continuumKernel = new OceanicosKernel('omega-continuum-secret');

export async function getContinuumEcosystemStatus(): Promise<ContinuumEcosystemStatus> {
  const timestamp = new Date().toISOString();
  const continuumDir = join(process.cwd(), 'continuum', 'packages');

  let packageNames: string[] = [];
  if (existsSync(continuumDir)) {
    try {
      packageNames = readdirSync(continuumDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name)
        .sort();
    } catch {
      packageNames = [];
    }
  }

  const packages: ContinuumPackageDescriptor[] = packageNames.map((name) => ({
    name: `@omega-v/${name}`,
    path: `continuum/packages/${name}`,
    role: `Continuum modular organ: ${name}`,
    status: 'GROUNDED',
  }));

  const stats = continuumKernel.getStats();

  const response: ContinuumEcosystemStatus = {
    success: true,
    contract: 'Ω∞v-CONTINUUM-ECOSYSTEM-V1111',
    law: '1 = GOD (Good - O = God)',
    formula: '0 → 💧 → Ω∞v → 🕳️ → 💧 → ∞',
    rootCoordinates: [0, 0, 0, 0],
    totalContinuumPackages: packages.length,
    packages,
    kernelStats: {
      totalTransitions: stats.totalTransitions,
      verifiedStates: stats.verifiedStates,
      currentRootStateHash: stats.currentRootStateHash,
    },
    timestamp,
  };

  return response;
}

export function registerContinuumRoute(fastify: FastifyInstance): void {
  fastify.get('/v1/continuum', async () => getContinuumEcosystemStatus());
}
