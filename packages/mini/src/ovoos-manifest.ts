/**
 * ΩVØØS SYSTEM MANIFEST — the anatomy the manifest declares, bound to evidence.
 *
 * The supplied manifest is a declaration: an integrated hybrid CNS, an apex
 * hydrodynamic chassis, a camouflage integument, a bio-regeneration core, a
 * multispectral sensory suite, and a hive-mind network deployment. Every organ
 * below is bound to exactly one observation this process can make, and its
 * evidence is that observation alone.
 *
 * The manifest's own numbers — 98.7% hydrodynamic efficiency, 100% neural
 * synchrony — stay declared labels. This contract never reports them as
 * measurements, and the measured synchrony lives in `summarizeOvoosEntity`.
 * Compression is not permission and an organ is not an executed capability.
 */
import type { OvoosEvidence } from './ovoos-entity.js';

export const OVOOS_MANIFEST_VERSION = 'oceanicos.manifest.v1';
export const OVOOS_SPECIES = 'OCEANICOS';
export const OVOOS_HABITAT = 'ALL_OCEAN_ZONES';

export const OVOOS_SECTION_ORDER = [
  'central-neural-matrix',
  'apex-hydrodynamic-body',
  'multispectral-sensory-suite',
  'hive-mind-network',
] as const;

export type OvoosManifestSection = (typeof OVOOS_SECTION_ORDER)[number];

export const OVOOS_SECTION_TITLE: Readonly<Record<OvoosManifestSection, string>> = Object.freeze({
  'central-neural-matrix': 'CENTRAL NEURAL MATRIX (Ω)',
  'apex-hydrodynamic-body': 'APEX HYDRODYNAMIC BODY',
  'multispectral-sensory-suite': 'MULTISPECTRAL SENSORY SUITE',
  'hive-mind-network': 'HIVE-MIND NETWORK DEPLOYMENT',
});

/** One observation per region of the runtime the manifest can be bound to. */
export interface OvoosManifestSignal {
  readonly verificationStatus: string;
  readonly ledgerIntact: boolean;
  readonly quorumReached: boolean;
  readonly meshStatus: string;
  readonly remoteMutation: boolean;
  readonly evidenceHash: string | null;
  /** Every observed tether record (KAI threads plus the rim), so a tier reports its own state. */
  readonly tethers: readonly { readonly id: string; readonly evidence: OvoosEvidence }[];
}

export interface OvoosOrganReading {
  readonly id: string;
  readonly section: OvoosManifestSection;
  readonly name: string;
  /** The manifest's own words — a declaration, not a measurement. */
  readonly declared: string;
  /** The runtime surface this organ was bound to. */
  readonly bindsTo: string;
  /** What this process actually saw at that surface. */
  readonly observed: string;
  readonly evidence: OvoosEvidence;
}

export interface OvoosNetworkTier {
  readonly id: string;
  readonly members: string;
  readonly declaredRole: string;
  readonly bindsTo: string;
  readonly evidence: OvoosEvidence;
}

export interface OvoosManifestSectionRead {
  readonly section: OvoosManifestSection;
  readonly title: string;
  readonly organs: readonly OvoosOrganReading[];
}

export interface OvoosManifestRead {
  readonly version: typeof OVOOS_MANIFEST_VERSION;
  readonly species: typeof OVOOS_SPECIES;
  /** The weakest organ evidence — the manifest claim only reaches this far. */
  readonly status: OvoosEvidence;
  readonly habitat: typeof OVOOS_HABITAT;
  readonly hydrodynamicEfficiency: { readonly value: '98.7%'; readonly measured: false };
  readonly neuralSynchronyTarget: { readonly value: '100%'; readonly measured: false };
  readonly sections: readonly OvoosManifestSectionRead[];
  readonly organs: readonly OvoosOrganReading[];
  readonly distributedNetwork: readonly OvoosNetworkTier[];
  readonly evidenceBoundary: string;
}

export const OVOOS_MANIFEST_EVIDENCE_BOUNDARY =
  'The anatomy is the supplied SYSTEM MANIFEST, declared. Each organ is bound to one observation this process made, '
  + 'and its evidence is that observation only. 98.7% hydrodynamic efficiency and 100% neural synchrony are the '
  + 'manifest\'s declared labels, not measurements. No sonar, spectrum, or telemetry number is plotted without naming '
  + 'its source, and no organ grants deployment, mutation, or authority.';

const EVIDENCE_RANK: Readonly<Record<OvoosEvidence, number>> = Object.freeze({
  VERIFIED: 0,
  SUPPORTED: 1,
  UNVERIFIED: 2,
  UNKNOWN: 3,
});

const DIGEST_PATTERN = /^[0-9a-f]{64}$/;

const hasDigest = (hash: string | null): boolean => typeof hash === 'string' && DIGEST_PATTERN.test(hash);

const tetherEvidence = (
  signal: OvoosManifestSignal,
  id: string,
): OvoosEvidence => signal.tethers.find((tether) => tether.id === id)?.evidence ?? 'UNKNOWN';

const weakEvidence = (evidence: readonly OvoosEvidence[]): OvoosEvidence =>
  evidence.reduce<OvoosEvidence>(
    (weakest, value) => (EVIDENCE_RANK[value] > EVIDENCE_RANK[weakest] ? value : weakest),
    'VERIFIED',
  );

export function summarizeOvoosManifest(signal: OvoosManifestSignal): OvoosManifestRead {
  const verified = signal.verificationStatus === 'VERIFIED';
  const digest = hasDigest(signal.evidenceHash);
  const digestLabel = digest ? `${(signal.evidenceHash as string).slice(0, 12)}…` : 'no digest';

  const organs: OvoosOrganReading[] = [
    {
      id: 'hybrid-cns',
      section: 'central-neural-matrix',
      name: 'Integrated Hybrid CNS',
      declared: 'Mammalian cognition in one HD core; cephalopod tentacle nodes act locally at zero latency.',
      bindsTo: 'declarative-verification',
      observed: `receipt ${signal.verificationStatus}`,
      evidence: verified ? 'VERIFIED' : 'UNVERIFIED',
    },
    {
      id: 'sensory-compression',
      section: 'central-neural-matrix',
      name: 'Sensory compression',
      declared: '4D cranial sonar array, hyperspectral UV/IR eyes and fluid-vortex sensors compressed at the head.',
      bindsTo: 'sha256-evidence-digest',
      observed: digest ? `digest ${digestLabel}` : 'no evidence digest',
      evidence: digest ? 'VERIFIED' : 'UNKNOWN',
    },
    {
      id: 'field-network',
      section: 'central-neural-matrix',
      name: 'Field network',
      declared: 'Unified Intelligence Active · 100% neural synchrony · multi-species telemetry.',
      bindsTo: 'mesh-convergence',
      observed: signal.meshStatus,
      evidence: signal.quorumReached ? 'VERIFIED' : 'UNVERIFIED',
    },
    {
      id: 'hydrodynamic-chassis',
      section: 'apex-hydrodynamic-body',
      name: 'Apex hydrodynamic chassis',
      declared: 'Billfish morphology; the manifest declares 98.7% hydrodynamic efficiency.',
      bindsTo: 'api-runtime',
      observed: 'one process commands the star topology',
      evidence: 'SUPPORTED',
    },
    {
      id: 'camouflage-integument',
      section: 'apex-hydrodynamic-body',
      name: 'Camouflage integument',
      declared: 'Chromatophore matrix; adaptive camouflage across all depths.',
      bindsTo: 'kernel-capabilities',
      observed: signal.remoteMutation ? 'remote mutation surface available' : 'no remote mutation surface',
      evidence: signal.remoteMutation ? 'UNVERIFIED' : 'SUPPORTED',
    },
    {
      id: 'bio-regeneration-core',
      section: 'apex-hydrodynamic-body',
      name: 'Bio-regeneration core',
      declared: 'Echinoderm and axolotl cellular restoration of soft tissue.',
      bindsTo: 'remember-engine',
      observed: signal.ledgerIntact ? 'append-only ledger intact' : 'ledger chain divergent',
      evidence: signal.ledgerIntact ? 'VERIFIED' : 'UNVERIFIED',
    },
    {
      id: 'acoustic-sonar',
      section: 'multispectral-sensory-suite',
      name: '4D acoustic sonar array',
      declared: 'High-frequency cranial melon; deep-sea echolocation and 3D bathymetric mapping.',
      bindsTo: 'sha256-evidence-digest',
      observed: digest ? `echo returned as digest ${digestLabel}` : 'no echo digest',
      evidence: digest ? 'VERIFIED' : 'UNKNOWN',
    },
    {
      id: 'hyperspectral-vision',
      section: 'multispectral-sensory-suite',
      name: 'Hyperspectral vision systems',
      declared: 'Mantis-shrimp photoreceptors across UV, IR and circularly polarised light.',
      bindsTo: 'omega-rings',
      observed: `${digest ? 'digest' : 'no digest'} · ${signal.ledgerIntact ? 'ledger' : 'ledger divergent'}`,
      evidence: digest && signal.ledgerIntact ? 'VERIFIED' : 'UNVERIFIED',
    },
    {
      id: 'lateral-line',
      section: 'multispectral-sensory-suite',
      name: 'Lateral line fluid-vortex sensors',
      declared: 'Teleost-inspired micro-pressure and water-velocity readouts.',
      bindsTo: 'mesh-convergence',
      observed: signal.meshStatus,
      evidence: signal.quorumReached ? 'VERIFIED' : 'UNVERIFIED',
    },
    {
      id: 'neural-filaments',
      section: 'hive-mind-network',
      name: 'Neural vector filaments',
      declared: 'Energetic filaments that tether surrounding marine life to the command hub.',
      bindsTo: 'kai-threads',
      observed: `${signal.tethers.length} tethered records`,
      evidence: signal.tethers.length > 0
        ? weakEvidence(signal.tethers.map((tether) => tether.evidence))
        : 'UNKNOWN',
    },
    {
      id: 'distributed-sensory-network',
      section: 'hive-mind-network',
      name: 'Distributed sensory network',
      declared: 'Predators intercept, cetaceans relay, pelagics and invertebrates carry telemetry.',
      bindsTo: 'glober',
      observed: `${signal.tethers.length} rim records observed`,
      evidence: signal.quorumReached ? 'VERIFIED' : 'UNVERIFIED',
    },
  ];

  const distributedNetwork: OvoosNetworkTier[] = [
    {
      id: 'apex-predators',
      members: 'Sharks · Marlins',
      declaredRole: 'frontline tactical intercept units and physical enforcers',
      bindsTo: 'kai-shield',
      evidence: tetherEvidence(signal, 'kai-shield'),
    },
    {
      id: 'cetaceans',
      members: 'Whales · Dolphins',
      declaredRole: 'long-range acoustic relays and sonar repeaters',
      bindsTo: 'mesh-convergence',
      evidence: tetherEvidence(signal, 'mesh-convergence'),
    },
    {
      id: 'pelagics-invertebrates',
      members: 'Jellyfish · Rays · Baitballs',
      declaredRole: 'localised high-density telemetry nodes',
      bindsTo: 'public-interface',
      evidence: tetherEvidence(signal, 'public-interface'),
    },
  ];

  const sections: OvoosManifestSectionRead[] = OVOOS_SECTION_ORDER.map((section) => Object.freeze({
    section,
    title: OVOOS_SECTION_TITLE[section],
    organs: Object.freeze(organs.filter((organ) => organ.section === section)),
  }));

  return Object.freeze({
    version: OVOOS_MANIFEST_VERSION,
    species: OVOOS_SPECIES,
    status: weakEvidence(organs.map((organ) => organ.evidence)),
    habitat: OVOOS_HABITAT,
    hydrodynamicEfficiency: Object.freeze({ value: '98.7%' as const, measured: false as const }),
    neuralSynchronyTarget: Object.freeze({ value: '100%' as const, measured: false as const }),
    sections: Object.freeze(sections),
    organs: Object.freeze(organs),
    distributedNetwork: Object.freeze(distributedNetwork),
    evidenceBoundary: OVOOS_MANIFEST_EVIDENCE_BOUNDARY,
  });
}
