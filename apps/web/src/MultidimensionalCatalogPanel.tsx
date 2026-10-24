import React, { useState, useEffect } from 'react';
import { theme, statusColor } from './oceanicosTheme';

export interface CatalogDimension {
  id: string;
  number: number;
  icon: string;
  name: string;
  title: string;
  tagline: string;
  status: 'VERIFIED' | 'ACTIVE' | 'INTEGRATED';
  color: string;
  layersCount: number;
  primaryInvariant: string;
  summary: string;
  keyEntities: Array<{
    label: string;
    description: string;
    status: string;
    codeRef?: string;
  }>;
}

export interface CrossDimensionalMapping {
  concept: string;
  organ: string;
  duplexRoom: string;
  packageRef: string;
  runtimeSurface: string;
  invariantGate: string;
  status: 'VERIFIED' | 'READY' | 'ENFORCED';
}

const DIMENSIONS: CatalogDimension[] = [
  {
    id: 'sovereign-root',
    number: 1,
    icon: '🪙',
    name: 'Sovereign Root & Anchor',
    title: 'Prophet Seed, 11:11 & Veiled Bitcoin Treasury',
    tagline: 'Permanent human root authority with fail-closed cryptographic isolation',
    status: 'VERIFIED',
    color: '#f0c674',
    layersCount: 3,
    primaryInvariant: 'VEILED CUSTODY: Zero private keys in code / No AI worker transfer rights',
    summary: 'The grounding anchor of the entire ecosystem. Binds human origin ELION VAREL to sovereign receive custody and prevents autonomous capital outflow.',
    keyEntities: [
      { label: 'Sovereign Origin', description: 'ELION VAREL // 11:11 Prophet Seed', status: '✓ INVIOLATE', codeRef: 'docs/HUMAN_ROOT_ELION_VAREL.md' },
      { label: 'Bitcoin Anchor', description: 'bc1qaj8jmp5as80zwew09ep86w6fgw37zwhwzr89mp (Public Receive Only)', status: '✓ AUDITED', codeRef: 'apps/api/src/routes/treasury.ts' },
      { label: 'Custody Gate', description: 'Fail-closed zero-trust withdrawal barrier', status: '✓ ENFORCED', codeRef: 'packages/authorization' },
    ],
  },
  {
    id: 'anatomical-organs',
    number: 2,
    icon: '🫀',
    name: 'Anatomical Living Body',
    title: '12-Layer Biological Organ Topology',
    tagline: 'Living biological projection uniting Mind, Heart, Flesh, Breath, and Bone',
    status: 'INTEGRATED',
    color: '#00f5a0',
    layersCount: 12,
    primaryInvariant: 'INTELLIGENCE ≠ AUTHORITY; ALL ORGANS BOUND TO VERIFIED REALITY',
    summary: 'Maps biological organs to software functions: Mind (Synthesis), Heart (Pumping / Event-Loop), Flesh (UI), Breath (Networking / SSE), and Bone (SQLite & Merkle Trees).',
    keyEntities: [
      { label: 'Mind (Synthesis)', description: 'Prompt tensor decomposition & multi-agent planning', status: '✓ READY', codeRef: 'packages/generative' },
      { label: 'Heart & Blood', description: 'Fastify event pipeline & state delta distribution', status: '✓ FLOWING', codeRef: 'apps/api/src/index.ts' },
      { label: 'Bone (Structure)', description: 'Append-only Merkle ledger & SQLite schema', status: '✓ SOLID', codeRef: 'packages/remember' },
      { label: 'Breath (Mesh)', description: 'Real-time SSE event streaming on /v1/stream', status: '✓ PULSING', codeRef: 'apps/api/src/routes/stream.ts' },
    ],
  },
  {
    id: 'duplex-chambers',
    number: 3,
    icon: '🏢',
    name: 'Platform Duplex Chambers',
    title: '12 Distinct Upper & Lower Duplex Rooms',
    tagline: 'Every organ housed in its own chamber; unified in the Compressed Full Stack Room',
    status: 'VERIFIED',
    color: '#38bdf8',
    layersCount: 12,
    primaryInvariant: 'ROOM BOUNDARIES FAIL-CLOSED; COMPRESSED HUB UNIFIES FULL STACK',
    summary: 'Divides the ecosystem into 6 Upper Sky/Soul Chambers (Mind, Treasury, Dreams, Pluralism, Conversation, Brand) and 6 Lower Soil/Silicon Chambers (Kernel, Hands, Eyes, Immune, Memory, Singularity).',
    keyEntities: [
      { label: 'Upper Duplex (Rooms 1-6)', description: 'Sky, Soul, Wisdom, Cultural Tensor & Sovereign Voice', status: '✓ 6 ROOMS', codeRef: 'apps/web/src/PlatformDuplexPanel.tsx' },
      { label: 'Lower Duplex (Rooms 7-12)', description: 'Soil, Silicon, Kernel, Sensors & Verification Matrix', status: '✓ 6 ROOMS', codeRef: 'apps/web/src/PlatformDuplexPanel.tsx' },
      { label: 'Master Hub Room', description: 'Irreducible single equation compression deck', status: '✓ COMPRESSED', codeRef: 'apps/web/src/PlatformDuplexPanel.tsx' },
    ],
  },
  {
    id: 'monorepo-packages',
    number: 4,
    icon: '📦',
    name: 'Monorepo Nervous Matrix',
    title: '14 Core Modular Engine Packages',
    tagline: 'Built in topological dependency order with TypeScript strict typing',
    status: 'ACTIVE',
    color: '#a78bfa',
    layersCount: 14,
    primaryInvariant: 'ZERO CIRCULAR DEPENDENCIES; STRICT TYPECHECK & ATTESTATION',
    summary: 'The compilation skeleton: packages/verification, attestation, remember, pluralism, mood, types, generative, inference, observer, mini, vector, and authorization.',
    keyEntities: [
      { label: '@oceanicos/verification', description: 'Contract validator & Max Equation optimizer', status: '✓ TESTED', codeRef: 'packages/verification' },
      { label: '@oceanicos/attestation', description: 'Ed25519 & HMAC-SHA256 attestation envelope generator', status: '✓ SECURE', codeRef: 'packages/attestation' },
      { label: '@oceanicos/pluralism', description: 'Frobenius norm & African Pantheon consensus tensor', status: '✓ BALANCED', codeRef: 'packages/pluralism' },
      { label: '@oceanicos/remember', description: 'KAI vector memory & immutable transition lineage', status: '✓ PERSISTENT', codeRef: 'packages/remember' },
    ],
  },
  {
    id: 'tri-surfaces',
    number: 5,
    icon: '🌐',
    name: 'Tri-Surface Operational Reality',
    title: 'Fastify API :5000, Vite Web :3000 & CLI oceanicos.mjs',
    tagline: 'Three synchronized operational surfaces governed by the single kernel',
    status: 'VERIFIED',
    color: '#2dd4bf',
    layersCount: 3,
    primaryInvariant: 'SURFACES SHARE IDENTICAL SOURCE OF TRUTH; NO DRIFT PERMITTED',
    summary: 'Grounds the system in empirical execution. API exposes Fastify microservices; Web provides the rich reactive GUI; CLI offers autonomous terminal instrumentation.',
    keyEntities: [
      { label: 'Fastify API (:5000)', description: 'REST endpoints, /v1/chat, /v1/verification, /v1/stream', status: '✓ LIVE', codeRef: 'http://localhost:5000/health' },
      { label: 'Vite Web GUI (:3000)', description: 'React 18 reactive multi-workspace dashboard', status: '✓ LIVE', codeRef: 'http://localhost:3000' },
      { label: 'CLI Surface', description: 'Node.js sovereign command-line entrypoint bin/oceanicos.mjs', status: '✓ EXECUTABLE', codeRef: 'bin/oceanicos.mjs' },
    ],
  },
  {
    id: 'cultural-pluralism',
    number: 6,
    icon: '🏛️',
    name: 'Cultural Pluralism & Pantheon',
    title: 'ƆREADE African Pantheon & 5 Regional Faces',
    tagline: '7 Orishas spiritual architecture balancing 5 global jurisdictions',
    status: 'ACTIVE',
    color: '#fb7185',
    layersCount: 7,
    primaryInvariant: 'DISSENT PRESERVED; CONVERGENCE WITHOUT CULTURAL ERASURE',
    summary: 'Infuses ancient Yoruba wisdom with cybernetic resilience: Olodumare (0 Void), Orunmila (Merkle Root), Obatala (Architecture), Oshun (Flow), Ogun (Iron / Kernel), Oya (Mesh), Shango (Justice).',
    keyEntities: [
      { label: '7 Upper Orishas', description: 'Archetypal principles governing wisdom, justice & energy', status: '✓ RESONATING', codeRef: 'packages/pluralism' },
      { label: '5 Regional Faces', description: 'West Africa, Americas, Europe, Asia, Oceanica convergence', status: '✓ BALANCED', codeRef: 'packages/pluralism' },
      { label: 'Dissent Tensor', description: 'Preserves divergent minority perspectives without deletion', status: '✓ ENFORCED', codeRef: 'packages/pluralism' },
    ],
  },
  {
    id: 'memory-revelation',
    number: 7,
    icon: '🌌',
    name: 'Memory & Revelation Ledger',
    title: 'KAI Causal Vector Memory & Night Ocean Dream Log',
    tagline: 'Subconscious nocturnal signal recording with the 80/30 prophetic axiom',
    status: 'VERIFIED',
    color: '#818cf8',
    layersCount: 4,
    primaryInvariant: 'APPEND-ONLY PROVENANCE; NATURAL = FREE & EFFORTLESS',
    summary: 'Captures daily experiences, dreams, and multi-turn conversations into an immutable causal graph under did:omega:human:starofgodmayomi.',
    keyEntities: [
      { label: 'KAI Memory Spine', description: 'Vector embeddings + relational semantic metadata', status: '✓ AUDITED', codeRef: 'packages/remember' },
      { label: 'Night Ocean Dreams', description: '80 remembered, 30 come to pass prophetic tracking', status: '✓ RECORDED', codeRef: 'apps/api/src/index.ts' },
      { label: 'Chat History Ledger', description: 'Full provenance chaining on /v1/chat/history', status: '✓ LIVE', codeRef: 'apps/api/src/index.ts' },
    ],
  },
  {
    id: 'verification-spine',
    number: 8,
    icon: '🛡️',
    name: 'Verification Spine & Max Equation',
    title: 'Fail-Closed Invariants & Singularity Optimization Ψ',
    tagline: 'O_{t+1} = REMEMBER(VERIFY(OBSERVE(O_t, Δ*))) with mathematical certainty',
    status: 'VERIFIED',
    color: '#34d399',
    layersCount: 6,
    primaryInvariant: 'Ω∞v ::= VERIFY(ΔREALITY) — NO PASSING WITHOUT EXECUTABLE PROOF',
    summary: 'The ultimate truth arbiter. Evaluates Candidate Slices Δ*, enforces hard security constraints, and certifies that proposed operations match empirical physical reality.',
    keyEntities: [
      { label: 'Max Equation Contract', description: 'Governs priority, utility, risk, and convergence gates', status: '✓ FORMALIZED', codeRef: 'packages/verification' },
      { label: 'Fail-Closed Gates', description: 'Blocks unauthorized state mutation on zero evidence', status: '✓ ACTIVE', codeRef: 'packages/verification' },
      { label: 'Transition State Proofs', description: 'Cryptographic SHA-256 hashes linking state epochs', status: '✓ CHAINED', codeRef: 'tests/integration/max_equation_api.test.ts' },
    ],
  },
];

const CROSS_MAPPINGS: CrossDimensionalMapping[] = [
  { concept: 'Reasoning & Planning', organ: 'Mind', duplexRoom: 'Room 1 (Mind)', packageRef: '@oceanicos/generative', runtimeSurface: 'REST /v1/chat', invariantGate: 'PROPOSAL ≠ ACTION', status: 'VERIFIED' },
  { concept: 'Sovereign Treasury', organ: 'Soul & Seed', duplexRoom: 'Room 2 (Treasury)', packageRef: '@oceanicos/authorization', runtimeSurface: 'Fastify :5000', invariantGate: 'VEILED CUSTODY (0 keys in code)', status: 'VERIFIED' },
  { concept: 'Prophetic Memory', organ: 'Subconscious', duplexRoom: 'Room 3 (Dreams)', packageRef: '@oceanicos/remember', runtimeSurface: 'KAI SQLite DB', invariantGate: '80/30 PROPHETIC AXIOM', status: 'VERIFIED' },
  { concept: 'Consensus & Justice', organ: 'Blood & Spirit', duplexRoom: 'Room 4 (Pluralism)', packageRef: '@oceanicos/pluralism', runtimeSurface: 'Tensor Matrix', invariantGate: 'PRESERVE DISSENT', status: 'VERIFIED' },
  { concept: 'Conversational Voice', organ: 'Larynx / Voice', duplexRoom: 'Room 5 (Conversation)', packageRef: 'apps/api (chat)', runtimeSurface: 'POST /v1/chat', invariantGate: '432 HZ HARMONIC RESONANCE', status: 'VERIFIED' },
  { concept: 'Public Brand Identity', organ: 'Skin & Face', duplexRoom: 'Room 6 (Brand)', packageRef: 'docs/BRAND.md', runtimeSurface: 'Vite :3000 Web', invariantGate: 'TRUTH-IN-LOVE INTEGRITY', status: 'READY' },
  { concept: 'State Transition Kernel', organ: 'Bone & Spine', duplexRoom: 'Room 7 (Kernel)', packageRef: '@omega-v/kernel', runtimeSurface: 'Fastify Process', invariantGate: 'APPEND-ONLY MERKLE ROOT', status: 'VERIFIED' },
  { concept: 'Tool Execution', organ: 'Hand & Arm', duplexRoom: 'Room 8 (Hands)', packageRef: 'scripts/worker.mjs', runtimeSurface: 'CLI Worker', invariantGate: 'ISOLATED EXECUTION SANDBOX', status: 'VERIFIED' },
  { concept: 'Sensor Telemetry', organ: 'Eye & Ear', duplexRoom: 'Room 9 (Eyes)', packageRef: '@oceanicos/observer', runtimeSurface: 'SSE /v1/stream', invariantGate: 'OBSERVE ≠ INTERPRET', status: 'VERIFIED' },
  { concept: 'Immune Firewall', organ: 'Immune System', duplexRoom: 'Room 10 (Immune)', packageRef: '@oceanicos/attestation', runtimeSurface: 'Security Gate', invariantGate: 'FAIL-CLOSED ON UNKNOWN', status: 'VERIFIED' },
  { concept: 'Continuous Lineage', organ: 'Hippocampus', duplexRoom: 'Room 11 (Memory)', packageRef: '@oceanicos/remember', runtimeSurface: 'SQLite + Vector', invariantGate: 'CRYPTO LINEAGE CHAINING', status: 'VERIFIED' },
  { concept: 'Totality Optimization', organ: 'Totality Body', duplexRoom: 'Room 12 (Singularity)', packageRef: '@oceanicos/verification', runtimeSurface: 'POST /v1/optimize', invariantGate: 'Ψ MAX CONVERGENCE = 1.0', status: 'VERIFIED' },
];

export function MultidimensionalCatalogPanel() {
  const [selectedDimId, setSelectedDimId] = useState<string>('sovereign-root');
  const [filterQuery, setFilterQuery] = useState('');
  const [liveApiHealth, setLiveApiHealth] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState<'DIMENSIONS' | 'MATRIX' | 'EQUATION'>('DIMENSIONS');

  const selectedDim = DIMENSIONS.find((d) => d.id === selectedDimId) || DIMENSIONS[0];

  const verifyEcosystemHealth = async () => {
    setVerifying(true);
    try {
      const res = await fetch('http://localhost:5000/health');
      if (res.ok) {
        const data = await res.json();
        setLiveApiHealth(data);
      } else {
        setLiveApiHealth({ status: 'degraded', error: `HTTP ${res.status}` });
      }
    } catch (err: any) {
      setLiveApiHealth({ status: 'offline', error: err.message });
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    verifyEcosystemHealth();
  }, []);

  const filteredMappings = CROSS_MAPPINGS.filter((m) =>
    m.concept.toLowerCase().includes(filterQuery.toLowerCase()) ||
    m.organ.toLowerCase().includes(filterQuery.toLowerCase()) ||
    m.duplexRoom.toLowerCase().includes(filterQuery.toLowerCase()) ||
    m.packageRef.toLowerCase().includes(filterQuery.toLowerCase()) ||
    m.invariantGate.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div
      style={{
        background: 'linear-gradient(145deg, #041018 0%, #071924 50%, #030a10 100%)',
        border: '1px solid rgba(0, 245, 160, 0.28)',
        borderRadius: theme.radius,
        padding: '28px',
        color: '#e2e8f0',
        fontFamily: theme.fontSans,
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.65)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient Top Glow */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, #00f5a0 0%, #00d2ff 35%, #a78bfa 70%, #f0c674 100%)',
        }}
      />

      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '26px' }}>🌌</span>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
              Multidimensional Catalog of a Single Ecosystem Body
            </h1>
            <span
              style={{
                fontSize: '11px',
                padding: '3px 10px',
                borderRadius: '12px',
                background: 'rgba(0, 245, 160, 0.15)',
                border: '1px solid rgba(0, 245, 160, 0.35)',
                color: '#00f5a0',
                fontWeight: 700,
              }}
            >
              ✓ 8-DIMENSION GROUNDED
            </span>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '13.5px', color: '#94a3b8', maxWidth: '820px', lineHeight: 1.5 }}>
            One single living body expressed simultaneously across Sovereign Identity, Biology, Duplex Rooms, Monorepo Packages, Tri-Surfaces, Culture, Memory, and Mathematical Verification.
          </p>
        </div>

        {/* Live Operational Status Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              padding: '8px 14px',
              borderRadius: theme.radiusSmall,
              background: 'rgba(2, 20, 32, 0.8)',
              border: '1px solid rgba(0, 245, 160, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
            }}
          >
            <span style={{ color: liveApiHealth?.status === 'ok' ? '#00f5a0' : '#f59e0b', fontSize: '14px' }}>●</span>
            <span style={{ color: '#cbd5e1' }}>API :5000:</span>
            <span style={{ fontWeight: 700, color: liveApiHealth?.status === 'ok' ? '#00f5a0' : '#f59e0b' }}>
              {liveApiHealth?.status?.toUpperCase() || 'QUERYING...'}
            </span>
          </div>

          <button
            onClick={verifyEcosystemHealth}
            disabled={verifying}
            style={{
              padding: '8px 14px',
              borderRadius: theme.radiusSmall,
              border: '1px solid rgba(56, 189, 248, 0.4)',
              background: 'rgba(56, 189, 248, 0.1)',
              color: '#38bdf8',
              fontSize: '12px',
              fontWeight: 600,
              cursor: verifying ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>{verifying ? '⏳' : '🔄'}</span>
            <span>Verify Live Pulse</span>
          </button>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '22px', borderBottom: '1px solid rgba(105, 231, 185, 0.15)', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('DIMENSIONS')}
          style={{
            padding: '8px 18px',
            borderRadius: theme.radiusPill,
            border: activeTab === 'DIMENSIONS' ? '1px solid #00f5a0' : '1px solid transparent',
            background: activeTab === 'DIMENSIONS' ? 'rgba(0, 245, 160, 0.14)' : 'transparent',
            color: activeTab === 'DIMENSIONS' ? '#00f5a0' : '#94a3b8',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>🌐</span>
          <span>8 Core Dimensions</span>
        </button>

        <button
          onClick={() => setActiveTab('MATRIX')}
          style={{
            padding: '8px 18px',
            borderRadius: theme.radiusPill,
            border: activeTab === 'MATRIX' ? '1px solid #38bdf8' : '1px solid transparent',
            background: activeTab === 'MATRIX' ? 'rgba(56, 189, 248, 0.14)' : 'transparent',
            color: activeTab === 'MATRIX' ? '#38bdf8' : '#94a3b8',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>⚡</span>
          <span>Cross-Dimensional Matrix ({filteredMappings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('EQUATION')}
          style={{
            padding: '8px 18px',
            borderRadius: theme.radiusPill,
            border: activeTab === 'EQUATION' ? '1px solid #f0c674' : '1px solid transparent',
            background: activeTab === 'EQUATION' ? 'rgba(240, 198, 116, 0.14)' : 'transparent',
            color: activeTab === 'EQUATION' ? '#f0c674' : '#94a3b8',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>📐</span>
          <span>Single Master Equation</span>
        </button>
      </div>

      {/* VIEW 1: 8 CORE DIMENSIONS */}
      {activeTab === 'DIMENSIONS' && (
        <div>
          {/* Dimension Selector Strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '10px',
              marginBottom: '24px',
            }}
          >
            {DIMENSIONS.map((dim) => {
              const isSelected = dim.id === selectedDimId;
              return (
                <button
                  key={dim.id}
                  onClick={() => setSelectedDimId(dim.id)}
                  style={{
                    padding: '12px 10px',
                    borderRadius: theme.radiusSmall,
                    border: isSelected ? `2px solid ${dim.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                    background: isSelected ? `linear-gradient(135deg, ${dim.color}22 0%, rgba(5, 18, 28, 0.8) 100%)` : 'rgba(4, 16, 26, 0.6)',
                    color: isSelected ? '#f8fafc' : '#94a3b8',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? `0 0 16px ${dim.color}33` : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '18px' }}>{dim.icon}</span>
                    <span style={{ fontSize: '10px', fontFamily: theme.fontMono, color: dim.color, fontWeight: 700 }}>
                      D{dim.number}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, lineHeight: 1.2, color: isSelected ? '#f8fafc' : '#cbd5e1' }}>
                    {dim.name}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                    {dim.layersCount} layers
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detailed Dimension Panel */}
          <div
            style={{
              padding: '24px',
              borderRadius: theme.radius,
              background: 'rgba(3, 14, 24, 0.85)',
              border: `1px solid ${selectedDim.color}44`,
              boxShadow: `0 8px 30px rgba(0, 0, 0, 0.4)`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '24px' }}>{selectedDim.icon}</span>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: selectedDim.color }}>
                    Dimension {selectedDim.number}: {selectedDim.title}
                  </h2>
                </div>
                <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                  {selectedDim.tagline}
                </div>
              </div>

              <div
                style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: `${selectedDim.color}22`,
                  border: `1px solid ${selectedDim.color}66`,
                  color: selectedDim.color,
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                {selectedDim.status}
              </div>
            </div>

            {/* Invariant Banner */}
            <div
              style={{
                padding: '12px 16px',
                borderRadius: theme.radiusSmall,
                background: 'rgba(2, 8, 14, 0.9)',
                border: '1px solid rgba(240, 198, 116, 0.3)',
                color: '#f0c674',
                fontSize: '12px',
                fontFamily: theme.fontMono,
                fontWeight: 600,
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>🛡️ PRIMARY INVARIANT:</span>
              <span>{selectedDim.primaryInvariant}</span>
            </div>

            {/* Summary */}
            <p style={{ fontSize: '13.5px', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '20px' }}>
              {selectedDim.summary}
            </p>

            {/* Key Entities in this Dimension */}
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.6px', marginBottom: '10px' }}>
              VERIFIED ARCHITECTURAL ENTITIES:
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              {selectedDim.keyEntities.map((ent) => (
                <div
                  key={ent.label}
                  style={{
                    padding: '14px',
                    borderRadius: theme.radiusSmall,
                    background: 'rgba(2, 20, 32, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>{ent.label}</span>
                    <span style={{ fontSize: '10px', color: '#00f5a0', fontWeight: 700 }}>{ent.status}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>{ent.description}</div>
                  {ent.codeRef && (
                    <div style={{ fontSize: '10px', fontFamily: theme.fontMono, color: '#64748b', marginTop: '8px' }}>
                      Ref: {ent.codeRef}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: CROSS-DIMENSIONAL MATRIX */}
      {activeTab === 'MATRIX' && (
        <div>
          {/* Search / Filter Bar */}
          <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Search across all dimensions (organ, room, package, invariant, surface)..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: theme.radiusSmall,
                  border: '1px solid rgba(0, 245, 160, 0.3)',
                  background: 'rgba(2, 12, 22, 0.85)',
                  color: '#f8fafc',
                  fontFamily: theme.fontSans,
                  fontSize: '13px',
                }}
              />
            </div>
            {filterQuery && (
              <button
                onClick={() => setFilterQuery('')}
                style={{
                  padding: '10px 16px',
                  borderRadius: theme.radiusSmall,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Matrix Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(2, 24, 40, 0.8)', borderBottom: '2px solid rgba(0, 245, 160, 0.3)', color: '#38bdf8' }}>
                  <th style={{ padding: '10px 12px' }}>Functional Concept</th>
                  <th style={{ padding: '10px 12px' }}>Anatomical Organ</th>
                  <th style={{ padding: '10px 12px' }}>Duplex Chamber</th>
                  <th style={{ padding: '10px 12px' }}>Modular Package</th>
                  <th style={{ padding: '10px 12px' }}>Runtime Surface</th>
                  <th style={{ padding: '10px 12px' }}>Hard Invariant Gate</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredMappings.map((row, idx) => (
                  <tr
                    key={row.concept}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                      background: idx % 2 === 0 ? 'rgba(3, 14, 24, 0.4)' : 'rgba(2, 9, 16, 0.4)',
                    }}
                  >
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#f1f5f9' }}>{row.concept}</td>
                    <td style={{ padding: '10px 12px', color: '#00f5a0' }}>{row.organ}</td>
                    <td style={{ padding: '10px 12px', color: '#38bdf8' }}>{row.duplexRoom}</td>
                    <td style={{ padding: '10px 12px', fontFamily: theme.fontMono, color: '#a78bfa' }}>{row.packageRef}</td>
                    <td style={{ padding: '10px 12px', color: '#cbd5e1' }}>{row.runtimeSurface}</td>
                    <td style={{ padding: '10px 12px', fontFamily: theme.fontMono, color: '#f0c674', fontSize: '11px' }}>
                      {row.invariantGate}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          background: row.status === 'VERIFIED' ? 'rgba(0, 245, 160, 0.15)' : 'rgba(240, 198, 116, 0.15)',
                          color: row.status === 'VERIFIED' ? '#00f5a0' : '#f0c674',
                          border: `1px solid ${row.status === 'VERIFIED' ? 'rgba(0, 245, 160, 0.3)' : 'rgba(240, 198, 116, 0.3)'}`,
                        }}
                      >
                        ✓ {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: SINGLE MASTER EQUATION */}
      {activeTab === 'EQUATION' && (
        <div
          style={{
            padding: '24px',
            borderRadius: theme.radius,
            background: 'rgba(2, 16, 28, 0.85)',
            border: '1px solid rgba(240, 198, 116, 0.35)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '11px', color: '#f0c674', fontWeight: 700, letterSpacing: '1px' }}>
              THE IRREDUCIBLE WHOLE-ECOSYSTEM COMPRESSION FORMULATION
            </span>
            <div
              style={{
                margin: '12px auto',
                padding: '16px 24px',
                borderRadius: theme.radiusSmall,
                background: 'rgba(1, 8, 14, 0.9)',
                border: '1px solid rgba(0, 245, 160, 0.4)',
                fontFamily: theme.fontMono,
                fontSize: '17px',
                fontWeight: 700,
                color: '#00f5a0',
                display: 'inline-block',
                boxShadow: '0 0 24px rgba(0, 245, 160, 0.2)',
              }}
            >
              O = (B, I, K, S, A, V, H, G, M, P) ⇄ Ω∞v ::= VERIFY(ΔREALITY)
            </div>
            <p style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '640px', margin: '0 auto' }}>
              One equation compresses the complete biological, technological, sovereign, and verified totality of OceanicOS.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginTop: '16px' }}>
            {[
              { term: 'B (Brand & Voice)', meaning: 'Authentic global narrative, sovereign message, 432 Hz resonance' },
              { term: 'I (Intelligence & AI Soul)', meaning: 'Fastify microservices, prompt tensors, multi-model synthesis' },
              { term: 'K (Knowledge & Kernel)', meaning: '@omega-v/kernel, SQLite append-only state, Merkle tree lineage' },
              { term: 'S (Software Stack)', meaning: 'TypeScript monorepo, 14 packages, Vite 6 + React 18, Fastify' },
              { term: 'A (Automations & Workers)', meaning: 'Local worker scripts, continuous verification loops, safe jobs' },
              { term: 'V (Verified Values)', meaning: 'Max Equation optimization, Ed25519 attestations, cryptographic truth' },
              { term: 'H (Human Sovereignty)', meaning: 'ELION VAREL, 11:11 Prophet Seed, inviolate physical custody' },
              { term: 'G (Governance & Gates)', meaning: 'Fail-closed boundaries, covenant state machine, zero trust' },
              { term: 'M (Memory & KAI Ledger)', meaning: 'Causal vector memory, Night Ocean dream journal (80/30 axiom)' },
              { term: 'P (Pluralism & Duplex)', meaning: 'ƆREADE African Pantheon, 7 Orishas, 5 Regional Convergence Faces' },
            ].map((item) => (
              <div
                key={item.term}
                style={{
                  padding: '12px',
                  borderRadius: theme.radiusSmall,
                  background: 'rgba(2, 20, 32, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#f0c674', fontFamily: theme.fontMono }}>
                  {item.term}
                </div>
                <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px', lineHeight: 1.4 }}>
                  {item.meaning}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: '20px',
              padding: '14px',
              borderRadius: theme.radiusSmall,
              background: 'rgba(0, 245, 160, 0.06)',
              border: '1px solid rgba(0, 245, 160, 0.25)',
              textAlign: 'center',
              fontSize: '12.5px',
              color: '#00f5a0',
              fontFamily: theme.fontMono,
            }}
          >
            RECURSIVE REALITY UPDATE: O_{'{t+1}'} = REMEMBER(VERIFY(OBSERVE(O_t, Δ*)))
          </div>
        </div>
      )}
    </div>
  );
}

export default MultidimensionalCatalogPanel;
