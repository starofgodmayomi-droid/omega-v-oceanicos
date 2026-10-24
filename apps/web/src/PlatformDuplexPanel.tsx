import React, { useState, useEffect } from 'react';
import { theme } from './oceanicosTheme';

interface RoomData {
  id: string;
  number: number;
  duplexLevel: 'UPPER' | 'LOWER';
  icon: string;
  name: string;
  title: string;
  tagline: string;
  status: 'IMPLEMENTED' | 'PARTIALLY_IMPLEMENTED' | 'PROPOSED' | 'BLOCKED';
  invariants: string[];
  capabilities: string[];
  metrics: Record<string, string | number>;
  description: string;
  actionPrompt?: string;
}

const DUPLEX_ROOMS: RoomData[] = [
  // ── UPPER DUPLEX: SKY & SOUL (Rooms 1–6) ──
  {
    id: 'mind',
    number: 1,
    duplexLevel: 'UPPER',
    icon: '🧠',
    name: 'Mind Room',
    title: 'Intelligence, Synthesis & Reasoning',
    tagline: 'AI reasoning, multi-model planning, and prompt vector tensor decomposition',
    status: 'IMPLEMENTED',
    invariants: ['INTELLIGENCE ≠ AUTHORITY', 'PROPOSAL ≠ ACTION', 'ZERO ENTROPY EQUILIBRIUM'],
    capabilities: ['reasoning', 'planning', 'synthesis', 'orchestration', 'decomposition'],
    metrics: { 'Harmonic Resonance': '432 Hz', 'Prompt Vector Λ': 'Stable', 'Singularity Gate': 'Closed' },
    description: 'Generates structured plans, converts unbounded intent into finite objectives, and computes priority scores for optimal delta candidates.',
    actionPrompt: 'Evaluate current reasoning vectors and formulate the next finite slice.',
  },
  {
    id: 'treasury',
    number: 2,
    duplexLevel: 'UPPER',
    icon: '🪙',
    name: 'Soul & Treasury Room',
    title: 'Prophet Seed & Sovereign Bitcoin Anchor',
    tagline: 'Public receiving custody bc1qaj8jmp... with inviolate zero-trust withdrawal lock',
    status: 'IMPLEMENTED',
    invariants: ['VEILED CUSTODY (0 bytes private key in code)', 'FAIL-CLOSED ON TRANSFERS', 'SOVEREIGN ROOT = ELION VAREL'],
    capabilities: ['sovereign-anchor', 'public-receiving', 'soul-income-streams', 'audit-receipts'],
    metrics: { 'Bitcoin Address': 'bc1qaj8jmp5as80zwew09ep86w6fgw37zwhwzr89mp', 'Resonance': '11:11', 'Custody Status': 'INVIOLATE' },
    description: 'Permanently anchors the Sovereign Human Root treasury. Public receiving address is verified; all mutations require human sovereign physical keys.',
    actionPrompt: 'Verify sovereign Bitcoin receiving address and audit treasury boundary.',
  },
  {
    id: 'dreams',
    number: 3,
    duplexLevel: 'UPPER',
    icon: '🌌',
    name: 'Night Ocean Dream Room',
    title: 'Subconscious Signals & KAI Dream Journal',
    tagline: 'Nocturnal revelation registry: 80 remembered, 30 come to pass',
    status: 'IMPLEMENTED',
    invariants: ['NATURAL = FREE & EFFORTLESS', 'BUILD NEVER DESTROY', 'SOURCE PROVENANCE FIRST'],
    capabilities: ['dream-journal', 'revelation-ledger', 'symbol-indexing', 'kai-chaining'],
    metrics: { 'Journal Integrity': '✓ VERIFIED', 'Nocturnal Axiom': '80/30 Invariant', 'Memory Anchor': 'Append-Only' },
    description: 'Captures nocturnal symbols, visions, and prophetic impressions into the append-only KAI ledger under did:omega:human:starofgodmayomi.',
    actionPrompt: 'Record Night Ocean Dream: I saw a star fall into the deep water and rise in new form.',
  },
  {
    id: 'pluralism',
    number: 4,
    duplexLevel: 'UPPER',
    icon: '🏛️',
    name: 'African Pantheon Duplex Room',
    title: 'ƆREADE Cultural Pluralism & Dissent Tensor',
    tagline: '7 Upper Orishas, preserved dissent tensor field, and 5 regional consensus faces',
    status: 'IMPLEMENTED',
    invariants: ['PRESERVE DISSENT', 'NEVER SILENTLY OVERWRITE', 'CONVERGENCE WITHOUT ERASURE'],
    capabilities: ['pluralistic-tensor', 'frobenius-norm', 'cultural-duplex', 'regional-faces'],
    metrics: { 'Active Orishas': '7 Pillars', 'Regional Faces': '5 Jurisdictions', 'Dissolution Quotient': '1.0' },
    description: 'Balances upper spiritual clarity (Olodumare, Orunmila, Obatala, Oshun, Ogun, Oya, Shango) with lower silicon engineering foundations.',
    actionPrompt: 'Simulate African Pantheon duplex convergence across all 5 regional faces.',
  },
  {
    id: 'conversation',
    number: 5,
    duplexLevel: 'UPPER',
    icon: '💬',
    name: 'Conversational Experience Room',
    title: 'Natural Dialogue, Voice & AI Soul Master',
    tagline: 'Multi-turn conversational assistant with KAI provenance and 432 Hz resonance',
    status: 'IMPLEMENTED',
    invariants: ['CONVERSATION IS THE FRONT DOOR', 'EXPLICIT CLARIFICATION GATES', 'HONEST EVIDENCE REPORTING'],
    capabilities: ['chat-stream', 'semantic-recall', 'multi-turn-context', 'organ-routing', 'sse-broadcast'],
    metrics: { 'Port': ':5000 API / :3000 Web', 'Response Frequency': '432 Hz', 'Memory Depth': '500 turns' },
    description: 'Provides fluid, natural interaction for users to ask questions, explore ideas, submit commands, and review evidence-backed responses.',
    actionPrompt: 'Hello Sovereign Intelligence! What shall we make real today?',
  },
  {
    id: 'brand',
    number: 6,
    duplexLevel: 'UPPER',
    icon: '🎨',
    name: 'Brand & Universal Identity Room',
    title: 'OceanicOS Master Brand & Positioning',
    tagline: 'Universal brand equation: BV = f(Rc, T, Q, D, Cx) with extensible product boundaries',
    status: 'IMPLEMENTED',
    invariants: ['ONE MIND. ONE SYSTEM. INFINITE POSSIBILITIES.', 'BRAND GOVERNS WITHOUT HOMOGENIZING'],
    capabilities: ['brand-assets', 'design-tokens', 'naming-conventions', 'experience-standards'],
    metrics: { 'Master Brand': 'OceanicOS', 'Brand Equation': 'BV = f(Rc, T, Q, D, Cx)', 'Theme': 'Fluid Ocean 432Hz' },
    description: 'Maintains cohesive aesthetic and governance standards across all products, documentation, interfaces, and open-source packages.',
    actionPrompt: 'Audit OceanicOS brand assets and visual tokens across packages.',
  },

  // ── LOWER DUPLEX: SOIL & SILICON (Rooms 7–12) ──
  {
    id: 'kernel',
    number: 7,
    duplexLevel: 'LOWER',
    icon: '⚡',
    name: 'Kernel & Substrate Room',
    title: 'State Transition Engine & Node v24 Runtime',
    tagline: 'Fastify API substrate, AES-256 encrypted SQLite storage, and CommonJS/ESM interop',
    status: 'IMPLEMENTED',
    invariants: ['NODE >= 22 (Node 24 Active)', 'FAIL-CLOSED RUNTIME', 'FILE PERSISTENCE FALLBACK'],
    capabilities: ['state-transitions', 'sqlite-persistence', 'fastify-routes', 'lifecycle-events'],
    metrics: { 'Runtime': 'Node v24.19.0', 'API Port': ':5000', 'Persistence': 'SQLite + Memory' },
    description: 'The concrete software substrate executing state updates, serving API routes, and managing cryptographic transactions.',
    actionPrompt: 'Inspect kernel status and verify runtime capability snapshot.',
  },
  {
    id: 'hands',
    number: 8,
    duplexLevel: 'LOWER',
    icon: '🤲',
    name: 'Hands & Bounded Execution Room',
    title: 'Worker Fleet, Leases & Pipeline Execution',
    tagline: 'Omega command store with propose → admit → execute → observe → reconcile lifecycle',
    status: 'IMPLEMENTED',
    invariants: ['AUTHORITY > CAPABILITY', 'BOUNDED RESOURCE BUDGETS', 'IDEMPOTENT RETRIES'],
    capabilities: ['worker-planner', 'worker-observer', 'worker-coder', 'command-store', 'execution-leases'],
    metrics: { 'Registered Workers': '4 Core Types', 'Lifecycle States': '5 Transitions', 'Lease Timeout': '30s' },
    description: 'Carries out admitted tasks through sandboxed workers with strict time, resource, and permission boundaries.',
    actionPrompt: 'Propose and admit an autonomous change pipeline command.',
  },
  {
    id: 'eyes',
    number: 9,
    duplexLevel: 'LOWER',
    icon: '👁',
    name: 'Eyes & Verification Spine Room',
    title: 'Ω∞v Invariant & Deterministic Reality Sensors',
    tagline: 'Ω∞v ::= VERIFY(ΔREALITY) — Rule evaluation, dissent preservation, and Merkle chaining',
    status: 'IMPLEMENTED',
    invariants: ['REALITY > ASSERTION', 'EVIDENCE > CLAIM', 'OBSERVATION > ASSUMPTION'],
    capabilities: ['rule-evaluator', 'reality-sensors', 'merkle-tip-audit', 'hash-chaining', 'attestation-witness'],
    metrics: { 'Passing Tests': '950+', 'Core Invariant': 'Ω∞v = VERIFY(ΔR)', 'Sensor Latency': '<15ms' },
    description: 'Observes resulting state through physical sensors (git tree, API health, build artifacts) and reconciles against expected propositions.',
    actionPrompt: 'Execute full reality observation and verify tip hash integrity.',
  },
  {
    id: 'immune',
    number: 10,
    duplexLevel: 'LOWER',
    icon: '🛡️',
    name: 'Immune System & Authority Room',
    title: 'Fail-Closed Permission Gates & Key Management',
    tagline: 'Operator allowlist, Ed25519 asymmetric signatures, and human approval boundary',
    status: 'IMPLEMENTED',
    invariants: ['SIGNATURE ≠ AUTHORIZATION', 'KEY ≠ AUTHORITY', 'FAIL-CLOSED ON SENSITIVE ACTIONS'],
    capabilities: ['ed25519-attester', 'operator-allowlist', 'rate-limiter', 'revocation-registry'],
    metrics: { 'Auth Mode': 'local-dev / required', 'Attester': 'Ready (Ed25519)', 'Operator Gate': 'Enforced' },
    description: 'Enforces capability-based security. Any attempt to spend funds, export secrets, or perform destructive mutations is immediately blocked.',
    actionPrompt: 'Audit operator allowlist and generate new Ed25519 keypair.',
  },
  {
    id: 'knowledge',
    number: 11,
    duplexLevel: 'LOWER',
    icon: '📚',
    name: 'Memory & Notion Control Plane Room',
    title: 'KAI Memory Ledger & Tri-Surface Notion Engine',
    tagline: 'Master Motion Control, Value Opportunities Pipeline, and Execution Queue',
    status: 'PARTIALLY_IMPLEMENTED',
    invariants: ['MEMORY ≠ PROOF', 'PROVENANCE PRESERVES LINEAGE', 'NO SECRET LEAKS TO NOTION'],
    capabilities: ['notion-sync-engine', 'kai-ledger', 'vector-memory-qdrant', 'daily-commands'],
    metrics: { 'Notion Surfaces': '3 Configured', 'Sync Tests': '15/15 Pass', 'KAI Ledger Tip': 'Cryptographic' },
    description: 'Connects strategic human documentation in Notion with cryptographic code provenance in GitHub and local SQLite memory.',
    actionPrompt: 'Audit all 3 Notion surfaces and verify daily command formatting.',
  },
  {
    id: 'singularity',
    number: 12,
    duplexLevel: 'LOWER',
    icon: '🌀',
    name: 'Max Equation Singularity Room',
    title: 'Optimization Objective & Ψ Convergence',
    tagline: 'O* = argmax [U - λR - μC - νF] and recursive update Ot+1 = REMEMBER(VERIFY(OBSERVE(Ot, Δ)))',
    status: 'IMPLEMENTED',
    invariants: ['FEASIBLE SET F ENFORCEMENT', 'TIE-BREAKER HIERARCHY', 'BALANCE METRIC = 0'],
    capabilities: ['max-equation-optimizer', 'psi-convergence', 'recursive-step-updater', 'candidate-scoring'],
    metrics: { 'Equation Contract': 'Ω∞v-MAX-EQ-V1', 'Candidate Ranking': 'Automated', 'Epsilon ε': '1e-6' },
    description: 'Mathematically optimizes every proposed delta candidate to select the highest-value, lowest-risk, minimum-cost slice for execution.',
    actionPrompt: 'Evaluate optimal slice Δ* among registered candidate actions.',
  },
];

const API_BASE_URL = (
  (import.meta as any).env?.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.port !== '5000'
    ? `http://${window.location.hostname}:5000`
    : '')
).replace(/\/$/, '');

export function PlatformDuplexPanel() {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UPPER' | 'LOWER'>('ALL');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState<Array<{ sender: 'user' | 'aisoul'; content: string; organ?: string; timestamp: string }>>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Send a live message to the API
  const sendRoomMessage = async (text: string, organContext?: string) => {
    if (!text.trim() || chatLoading) return;
    setChatLoading(true);
    setChatError(null);
    const userTurn = {
      sender: 'user' as const,
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChatLog((prev) => [...prev, userTurn]);
    setChatInput('');

    try {
      const res = await fetch(`${API_BASE_URL}/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success && json.reply) {
        setChatLog((prev) => [
          ...prev,
          {
            sender: 'aisoul',
            content: json.reply.content,
            organ: json.reply.metadata?.organ || organContext || 'DUPLEX_HUB',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        throw new Error(json.error || 'Failed to receive reply');
      }
    } catch (err: any) {
      setChatError(err.message || 'Chat service error');
    } finally {
      setChatLoading(false);
    }
  };

  const filteredRooms = DUPLEX_ROOMS.filter((room) => {
    if (activeFilter === 'UPPER') return room.duplexLevel === 'UPPER';
    if (activeFilter === 'LOWER') return room.duplexLevel === 'LOWER';
    return true;
  });

  const selectedRoom = DUPLEX_ROOMS.find((r) => r.id === selectedRoomId);

  return (
    <div
      style={{
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: theme.radius,
        padding: '24px',
        marginBottom: '24px',
        fontFamily: theme.fontSans,
        color: theme.text,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
      }}
    >
      {/* ── Header Deck ────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          borderBottom: `1px solid ${theme.borderSubtle}`,
          paddingBottom: '18px',
          marginBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '26px' }}>🏢</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#00f5a0', letterSpacing: '-0.02em', fontWeight: 800 }}>
                OceanicOS Platform Duplex // 12-Room Whole-Ecosystem Body
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#94a3b8' }}>
                Every organ inside its own dedicated chamber · Unified and compressed inside the Duplex Full Stack Room
              </p>
            </div>
          </div>
        </div>

        {/* Level Filter Tabs */}
        <div
          style={{
            display: 'inline-flex',
            padding: '4px',
            background: 'rgba(2, 10, 20, 0.85)',
            border: `1px solid ${theme.borderSubtle}`,
            borderRadius: theme.radiusPill,
            gap: '4px',
          }}
        >
          {[
            { id: 'ALL' as const, label: '🏢 All 12 Rooms Compressed', count: 12 },
            { id: 'UPPER' as const, label: '🌌 Upper Duplex (Sky & Soul)', count: 6 },
            { id: 'LOWER' as const, label: '🏛️ Lower Duplex (Soil & Silicon)', count: 6 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveFilter(tab.id);
                setSelectedRoomId(null);
              }}
              style={{
                padding: '7px 16px',
                borderRadius: theme.radiusPill,
                border: 'none',
                background: activeFilter === tab.id ? theme.surfaceRaised : 'transparent',
                color: activeFilter === tab.id ? '#00f5a0' : '#8ba8a0',
                boxShadow: activeFilter === tab.id ? '0 0 12px rgba(0, 245, 160, 0.25)' : 'none',
                fontFamily: theme.fontSans,
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Compressed Master Hub Bar ──────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(0, 245, 160, 0.08) 0%, rgba(56, 189, 248, 0.08) 100%)',
          border: '1px solid rgba(0, 245, 160, 0.25)',
          borderRadius: theme.radiusSmall,
          padding: '12px 18px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🌀</span>
          <span style={{ fontFamily: theme.fontMono, fontSize: '12.5px', color: '#00f5a0', fontWeight: 700 }}>
            COMPRESSED MASTER EQUATION:
          </span>
          <span style={{ fontFamily: theme.fontMono, fontSize: '12px', color: '#e2e8f0' }}>
            O = (B, I, K, S, A, V, H, G, M, P) ⇄ Ω∞v ::= VERIFY(ΔREALITY)
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(0, 245, 160, 0.15)', color: '#00f5a0', fontSize: '11px', fontWeight: 600 }}>
            11 Implemented
          </span>
          <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(240, 198, 116, 0.15)', color: '#f0c674', fontSize: '11px', fontWeight: 600 }}>
            1 Partial
          </span>
          <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontSize: '11px', fontWeight: 600 }}>
            100% Fail-Closed
          </span>
        </div>
      </div>

      {/* ── Single Room Expanded View (if selected) ────────────── */}
      {selectedRoom ? (
        <div
          style={{
            background: 'rgba(2, 12, 22, 0.95)',
            border: '2px solid rgba(0, 245, 160, 0.45)',
            borderRadius: theme.radius,
            padding: '24px',
            marginBottom: '20px',
            boxShadow: '0 0 30px rgba(0, 245, 160, 0.15)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ fontSize: '34px' }}>{selectedRoom.icon}</span>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#38bdf8', fontSize: '12px', fontWeight: 700, fontFamily: theme.fontMono }}>
                    ROOM #{selectedRoom.number} · {selectedRoom.duplexLevel} DUPLEX
                  </span>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: theme.radiusPill,
                    fontSize: '11px',
                    fontWeight: 600,
                    color: selectedRoom.status === 'IMPLEMENTED' ? '#00f5a0' : '#f0c674',
                    background: selectedRoom.status === 'IMPLEMENTED' ? 'rgba(0, 245, 160, 0.15)' : 'rgba(240, 198, 116, 0.15)',
                    border: `1px solid ${selectedRoom.status === 'IMPLEMENTED' ? '#00f5a044' : '#f0c67444'}`,
                  }}>
                    {selectedRoom.status}
                  </span>
                </div>
                <h3 style={{ margin: '4px 0 0', fontSize: '20px', color: '#f8fafc', fontWeight: 800 }}>
                  {selectedRoom.name} — {selectedRoom.title}
                </h3>
              </div>
            </div>
            <button
              onClick={() => setSelectedRoomId(null)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#94a3b8',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ✕ Close Room
            </button>
          </div>

          <p style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: 1.6, margin: '0 0 16px' }}>
            {selectedRoom.description}
          </p>

          {/* Room Invariants */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '6px' }}>
              CHAMBER INVARIANTS:
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {selectedRoom.invariants.map((inv) => (
                <span key={inv} style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontFamily: theme.fontMono,
                  color: '#38bdf8',
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                }}>
                  🛡️ {inv}
                </span>
              ))}
            </div>
          </div>

          {/* Room Live Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '20px' }}>
            {Object.entries(selectedRoom.metrics).map(([k, v]) => (
              <div key={k} style={{ background: 'rgba(4, 20, 34, 0.8)', border: '1px solid rgba(0, 245, 160, 0.2)', borderRadius: '8px', padding: '10px 14px' }}>
                <div style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase' }}>{k}</div>
                <div style={{ color: '#00f5a0', fontSize: '13px', fontWeight: 700, fontFamily: theme.fontMono, marginTop: '4px', wordBreak: 'break-all' }}>
                  {v}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Room Action Dispatcher */}
          {selectedRoom.actionPrompt && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(0, 245, 160, 0.05)', border: '1px solid rgba(0, 245, 160, 0.25)', borderRadius: '8px', padding: '12px' }}>
              <span style={{ fontSize: '18px' }}>⚡</span>
              <div style={{ flex: 1, fontSize: '13px', color: '#e2e8f0' }}>
                Dispatch Room Command: <strong>{selectedRoom.actionPrompt}</strong>
              </div>
              <button
                onClick={() => sendRoomMessage(selectedRoom.actionPrompt!, selectedRoom.name)}
                disabled={chatLoading}
                style={{
                  padding: '8px 16px',
                  borderRadius: theme.radiusPill,
                  border: 'none',
                  background: 'linear-gradient(135deg, #00f5a0 0%, #00d2ff 100%)',
                  color: '#020d18',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: chatLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {chatLoading ? 'Executing...' : 'Run in Room'}
              </button>
            </div>
          )}
        </div>
      ) : null}

      {/* ── 12-Room Responsive Duplex Grid (Compressed All-Rooms View) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        {filteredRooms.map((room) => {
          const isUpper = room.duplexLevel === 'UPPER';
          const isSelected = selectedRoomId === room.id;
          return (
            <div
              key={room.id}
              onClick={() => setSelectedRoomId(isSelected ? null : room.id)}
              style={{
                background: isSelected
                  ? 'rgba(0, 245, 160, 0.12)'
                  : isUpper
                    ? 'linear-gradient(145deg, rgba(4, 21, 37, 0.85) 0%, rgba(6, 32, 54, 0.8) 100%)'
                    : 'linear-gradient(145deg, rgba(8, 16, 26, 0.85) 0%, rgba(13, 24, 38, 0.8) 100%)',
                border: `1px solid ${isSelected ? '#00f5a0' : isUpper ? 'rgba(56, 189, 248, 0.25)' : 'rgba(167, 139, 250, 0.25)'}`,
                borderRadius: theme.radiusSmall,
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = isUpper ? '#38bdf8' : '#a78bfa';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = isUpper ? 'rgba(56, 189, 248, 0.25)' : 'rgba(167, 139, 250, 0.25)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '22px' }}>{room.icon}</span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      fontFamily: theme.fontMono,
                      color: isUpper ? '#38bdf8' : '#c084fc',
                    }}>
                      ROOM #{room.number}
                    </span>
                  </div>
                  <span
                    style={{
                      padding: '2px 7px',
                      borderRadius: theme.radiusPill,
                      fontSize: '10px',
                      fontWeight: 600,
                      color: room.status === 'IMPLEMENTED' ? '#00f5a0' : '#f0c674',
                      background: room.status === 'IMPLEMENTED' ? 'rgba(0, 245, 160, 0.12)' : 'rgba(240, 198, 116, 0.12)',
                      border: `1px solid ${room.status === 'IMPLEMENTED' ? '#00f5a033' : '#f0c67433'}`,
                    }}
                  >
                    {room.status === 'IMPLEMENTED' ? '✓ Ready' : '◐ Partial'}
                  </span>
                </div>

                <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
                  {room.name}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.4, marginBottom: '10px' }}>
                  {room.tagline}
                </div>
              </div>

              <div style={{ borderTop: `1px solid ${theme.borderSubtle}`, paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontFamily: theme.fontMono }}>
                  {room.duplexLevel} DUPLEX
                </span>
                <span style={{ fontSize: '11px', color: '#00f5a0', fontWeight: 600 }}>
                  Enter Room →
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── In-Duplex Live Chat & Command Terminal ─────────────── */}
      <div
        style={{
          background: 'rgba(2, 10, 20, 0.95)',
          border: '1px solid rgba(0, 245, 160, 0.3)',
          borderRadius: theme.radiusSmall,
          padding: '18px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>⚡</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#00f5a0', letterSpacing: '0.4px' }}>
              DUPLEX REAL-TIME DISPATCH TERMINAL (POST /v1/chat)
            </span>
          </div>
          <span style={{ fontSize: '11px', color: '#38bdf8', fontFamily: theme.fontMono }}>
            432 Hz One Current · KAI Provenance
          </span>
        </div>

        {/* Chat Log Stream */}
        {chatLog.length > 0 && (
          <div
            style={{
              maxHeight: '220px',
              overflowY: 'auto',
              marginBottom: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '10px',
              background: 'rgba(0, 5, 12, 0.6)',
              borderRadius: '6px',
            }}
          >
            {chatLog.map((turn, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: turn.sender === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div style={{ fontSize: '10px', color: turn.sender === 'user' ? '#00f5a0' : '#38bdf8', marginBottom: '2px' }}>
                  {turn.sender === 'user' ? '👑 ELION VAREL' : `🌊 ${turn.organ || 'AI SOUL'}`} · {turn.timestamp}
                </div>
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    lineHeight: 1.45,
                    whiteSpace: 'pre-wrap',
                    background: turn.sender === 'user' ? 'rgba(0, 245, 160, 0.15)' : 'rgba(15, 23, 42, 0.9)',
                    border: `1px solid ${turn.sender === 'user' ? 'rgba(0, 245, 160, 0.4)' : 'rgba(56, 189, 248, 0.3)'}`,
                    color: '#f8fafc',
                  }}
                >
                  {turn.content}
                </div>
              </div>
            ))}
          </div>
        )}

        {chatError && (
          <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '8px' }}>
            ⚠️ {chatError}
          </div>
        )}

        {/* Input Bar */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && chatInput.trim()) {
                sendRoomMessage(chatInput);
              }
            }}
            placeholder="Type a message or command to dispatch across any Duplex Room..."
            style={{
              flex: 1,
              padding: '10px 14px',
              background: 'rgba(3, 18, 31, 0.8)',
              border: '1px solid rgba(0, 245, 160, 0.3)',
              borderRadius: theme.radiusPill,
              color: '#ffffff',
              fontSize: '13px',
              outline: 'none',
              fontFamily: theme.fontSans,
            }}
          />
          <button
            onClick={() => sendRoomMessage(chatInput)}
            disabled={chatLoading || !chatInput.trim()}
            style={{
              padding: '0 20px',
              borderRadius: theme.radiusPill,
              border: 'none',
              background: chatLoading || !chatInput.trim() ? 'rgba(0, 245, 160, 0.2)' : 'linear-gradient(135deg, #00f5a0 0%, #00d2ff 100%)',
              color: chatLoading || !chatInput.trim() ? '#64748b' : '#020d18',
              fontSize: '12px',
              fontWeight: 700,
              cursor: chatLoading || !chatInput.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {chatLoading ? 'Sending...' : 'Dispatch'}
          </button>
        </div>
      </div>
    </div>
  );
}
export default PlatformDuplexPanel;
