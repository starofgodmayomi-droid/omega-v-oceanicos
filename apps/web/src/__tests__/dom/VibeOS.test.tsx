import { describe, expect, it, jest } from '@jest/globals';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import { VibeOS } from '../../VibeOS';
import { installFetch, json, type FakeResponse } from './harness';

const VERIFIED_RESPONSE = 'Observed: the ledger is intact.';
const VERIFIED_RESPONSE_SHA256 = '7e1fb64de987a8e0f7d01b596fdfe68802338fddc3c33b4fc9c4ef72b2a1124d';

describe('Vibe OS surface', () => {
  it('opens on one calm conversation instead of the instrument panel', async () => {
    installFetch();
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: /what shall we make real/i })).toBeInTheDocument();
    expect(screen.getByRole('log', { name: 'Conversation' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Intent' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /AVRØ HOUSE emblem/i })).toBeInTheDocument();
    expect(screen.getByText('PLATFORM')).toBeInTheDocument();
    expect(screen.getByText('VERIFICATION ENGINE')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Invisible Online Computer' })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Fastify Spine status')).toHaveTextContent('OBSERVED'));
  });

  it('posts the intent to /api/chat, shows the verifying line, then the verified output', async () => {
    let release: ((response: FakeResponse) => void) | null = null;
    const pending = new Promise<FakeResponse>((resolve) => {
      release = resolve;
    });
    const fetchMock = installFetch({ '/api/chat': () => pending });
    const user = userEvent.setup();
    render(<VibeOS />);

    await user.type(screen.getByRole('textbox', { name: 'Intent' }), 'Review the current state.');
    await user.click(screen.getByRole('button', { name: 'Send intent' }));

    expect(screen.getByRole('status')).toHaveTextContent('[Verifying against kai_ledger...]');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/chat',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ intent: 'Review the current state.' }),
      })
    );

    release!(
      json({
        success: true,
        status: 'VERIFIED',
        response: VERIFIED_RESPONSE,
        evidence_hash: VERIFIED_RESPONSE_SHA256,
      })
    );

    expect(await screen.findByText(VERIFIED_RESPONSE)).toBeInTheDocument();
    const badge = await screen.findByText(/verified/i, { selector: '.vibe-badge' });
    expect(badge).toHaveTextContent(VERIFIED_RESPONSE_SHA256.slice(0, 8));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('fails closed on 503 instead of inventing an answer', async () => {
    installFetch({
      '/api/chat': () => json({ error: 'LOCAL_BRAIN_OFFLINE' }, { status: 503 }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    await user.type(screen.getByRole('textbox', { name: 'Intent' }), 'Send the report.');
    await user.click(screen.getByRole('button', { name: 'Send intent' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('[UNKNOWN]');
    expect(screen.getByText(/Local Brain Offline · HTTP 503/)).toBeInTheDocument();
    expect(screen.queryByText(/verified/i, { selector: '.vibe-badge' })).not.toBeInTheDocument();
  });

  it('keeps the shield verdict instead of claiming the brain is offline', async () => {
    installFetch({
      '/api/chat': () =>
        json({ success: true, status: 'DIVERGENT', reason: 'KAI Shield blocked this intent.' }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    await user.type(screen.getByRole('textbox', { name: 'Intent' }), 'Urgent send money now.');
    await user.click(screen.getByRole('button', { name: 'Send intent' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('[DIVERGENT]');
    expect(alert).not.toHaveTextContent('Local Brain Offline');
    expect(screen.getByText('KAI Shield blocked this intent.')).toBeInTheDocument();
  });

  it('treats a 200 UNKNOWN verdict as a fail-closed bubble', async () => {
    installFetch({
      '/api/chat': () =>
        json({ success: true, status: 'UNKNOWN', response: null, evidence_hash: null }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    await user.type(screen.getByRole('textbox', { name: 'Intent' }), 'Explain everything.');
    await user.click(screen.getByRole('button', { name: 'Send intent' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('[UNKNOWN]');
  });

  it('keeps the full dashboard one disclosure away', async () => {
    installFetch();
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /full system dashboard/i }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: /what shall we make real/i })).toBeInTheDocument()
    );
    expect(screen.getByRole('region', { name: 'Invisible Online Computer' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /vibe os/i }));
    expect(screen.getByRole('log', { name: 'Conversation' })).toBeInTheDocument();
  });

  it('shows observed API health, keeps unprobed services UNKNOWN, and opens DAV proof on demand', async () => {
    let releaseHealth: ((response: FakeResponse) => void) | null = null;
    const healthPending = new Promise<FakeResponse>((resolve) => {
      releaseHealth = resolve;
    });
    installFetch({
      '/api/health': () => healthPending,
      '/api/tensor/4': () => json({
        success: true,
        status: 'VERIFIED',
        size: 4,
        projection: { rows: 16, columns: 16 },
        values: Array.from({ length: 16 }, () => Array.from({ length: 16 }, () => 0)),
        invariants: { min: 0, max: 12, mean: 6, checksum: 1536 },
        sha256: 'a'.repeat(64),
      }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    await act(async () => {
      releaseHealth!(json({ status: 'ok' }));
      await healthPending;
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByLabelText('Fastify Spine status')).toHaveTextContent('OBSERVED');
    expect(screen.getByLabelText('Local LLM · 11434 status')).toHaveTextContent('UNKNOWN');
    expect(screen.getByLabelText('KAI Shield status')).toHaveTextContent('UNKNOWN');
    expect(screen.queryByLabelText('SHA-256 verified')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /inspect 4×4×4×4 tensor/i }));
    expect(screen.getByRole('button', { name: /inspect 4×4×4×4 tensor/i })).toHaveAttribute('aria-expanded', 'true');
    expect(await screen.findByLabelText('SHA-256 verified')).toBeInTheDocument();
    expect(screen.getByText('1,536')).toBeInTheDocument();
  });

  it('preserves an HTTP 422 DIVERGENT receipt instead of flattening it to UNKNOWN', async () => {
    installFetch({
      '/api/chat': () => json({
        success: false,
        status: 'DIVERGENT',
        error: 'TENSOR_INVARIANT_DIVERGENCE',
        issues: ['observed result diverges'],
      }, { status: 422 }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    await user.type(screen.getByRole('textbox', { name: 'Intent' }), 'Inspect this state.');
    await user.click(screen.getByRole('button', { name: 'Send intent' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('[DIVERGENT]');
    expect(screen.getByText('TENSOR_INVARIANT_DIVERGENCE · HTTP 422')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('KAI Shield status')).toHaveTextContent('DIVERGENT'));
  });

  it.each([
    {
      name: 'missing digest',
      receipt: { success: true, status: 'VERIFIED', response: VERIFIED_RESPONSE },
      expectedStatus: 'UNKNOWN',
      reason: 'did not include a SHA-256 digest',
    },
    {
      name: 'malformed digest',
      receipt: { success: true, status: 'VERIFIED', response: VERIFIED_RESPONSE, evidence_hash: 'not-a-digest' },
      expectedStatus: 'DIVERGENT',
      reason: 'malformed SHA-256 digest',
    },
    {
      name: 'mismatched digest',
      receipt: { success: true, status: 'VERIFIED', response: VERIFIED_RESPONSE, evidence_hash: '0'.repeat(64) },
      expectedStatus: 'DIVERGENT',
      reason: 'does not match the supplied SHA-256 digest',
    },
    {
      name: 'missing response body',
      receipt: { success: true, status: 'VERIFIED', response: null, evidence_hash: VERIFIED_RESPONSE_SHA256 },
      expectedStatus: 'UNKNOWN',
      reason: 'did not include a response body',
    },
  ])('does not badge a VERIFIED claim with a $name', async ({ receipt, expectedStatus, reason }) => {
    installFetch({ '/api/chat': () => json(receipt) });
    const user = userEvent.setup();
    render(<VibeOS />);

    await user.type(screen.getByRole('textbox', { name: 'Intent' }), 'Check the response receipt.');
    await user.click(screen.getByRole('button', { name: 'Send intent' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(`[${expectedStatus}]`);
    expect(screen.getByText(new RegExp(reason, 'i'))).toBeInTheDocument();
    expect(screen.queryByText(VERIFIED_RESPONSE)).not.toBeInTheDocument();
    expect(screen.queryByText(/verified/i, { selector: '.vibe-badge' })).not.toBeInTheDocument();
  });

  it('keeps the receipt UNKNOWN when Web Crypto cannot compute the response digest', async () => {
    const digestSpy = jest.spyOn(globalThis.crypto.subtle, 'digest').mockRejectedValue(new Error('unavailable'));
    try {
      installFetch({
        '/api/chat': () => json({
          success: true,
          status: 'VERIFIED',
          response: VERIFIED_RESPONSE,
          evidence_hash: VERIFIED_RESPONSE_SHA256,
        }),
      });
      const user = userEvent.setup();
      render(<VibeOS />);

      await user.type(screen.getByRole('textbox', { name: 'Intent' }), 'Check crypto availability.');
      await user.click(screen.getByRole('button', { name: 'Send intent' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('[UNKNOWN]');
      expect(screen.getByText(/SHA-256 verification is unavailable/i)).toBeInTheDocument();
      expect(screen.queryByText(VERIFIED_RESPONSE)).not.toBeInTheDocument();
      expect(screen.queryByText(/verified/i, { selector: '.vibe-badge' })).not.toBeInTheDocument();
    } finally {
      digestSpy.mockRestore();
    }
  });

  it('observes interactive system mood and allows running mood check', async () => {
    installFetch({
      '/api/v1/mood': () =>
        json({
          success: true,
          status: 'MAX GOOD-O',
          evaluation: {
            state: 'HIGH_INTEGRITY',
            confidence: 1,
            verificationHealth: 1,
            description: 'High integrity: 100% hash chain validity',
          },
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    await waitFor(() => expect(screen.getByLabelText('System Mood status')).toHaveTextContent('OBSERVED'));
    expect(screen.getByRole('button', { name: /✦ Mood Autopilot/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Check Mood State' }));
    expect(await screen.findByText(/Mood observed: MAX GOOD-O/i)).toBeInTheDocument();
  });

  it('opens and closes the Living Entity Codex modal with 12 master schematics', async () => {
    installFetch();
    const user = userEvent.setup();
    render(<VibeOS />);

    const codexBtn = screen.getByRole('button', { name: /🪞 Living Codex/i });
    expect(codexBtn).toBeInTheDocument();

    await user.click(codexBtn);
    expect(await screen.findByRole('dialog', { name: /Living Entity Codex/i })).toBeInTheDocument();
    expect(screen.getByText(/12 Master Schematics/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Lucid Field in the Max Space of Reality/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /Close codex/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /Living Entity Codex/i })).not.toBeInTheDocument();
    });
  });

  it('observes Voice Bridge on port 8088 and executes voice harmonic probe', async () => {
    installFetch();
    const user = userEvent.setup();
    render(<VibeOS />);

    await waitFor(() => expect(screen.getByLabelText('Voice Bridge · 8088 status')).toHaveTextContent('VERIFIED'));
    const voiceBtn = screen.getByRole('button', { name: /🎙️ Voice Bridge/i });
    expect(voiceBtn).toBeInTheDocument();

    await user.click(voiceBtn);
    expect(await screen.findByText(/Voice Bridge Harmonic Resonance active at 432Hz/i)).toBeInTheDocument();
    expect(screen.getByText(/Soul AI/i)).toBeInTheDocument();
  });

  it('observes Local LLM on port 11434 and enables Ocean Intelligence toggle', async () => {
    installFetch({
      '/api/v1/llm/health': () =>
        json({
          success: true,
          status: 'VERIFIED',
          provider: 'ollama',
          baseUrl: 'http://127.0.0.1:11434/v1',
          model: 'qwen2.5:0.5b',
          detail: 'qwen2.5:0.5b · port 11434 active',
        }),
    });
    render(<VibeOS />);

    await waitFor(() => expect(screen.getByLabelText('Local LLM · 11434 status')).toHaveTextContent('VERIFIED'));
    expect(screen.getByRole('checkbox', { name: /Ocean Intelligence/i })).toBeInTheDocument();
  });

  it('renders prompt starters in empty state and populates composer draft on click', async () => {
    installFetch();
    const user = userEvent.setup();
    render(<VibeOS />);

    const starterBtn = screen.getByRole('button', { name: /🌊 Water Intelligence/i });
    expect(starterBtn).toBeInTheDocument();

    await user.click(starterBtn);
    expect(screen.getByRole('textbox', { name: 'Intent' })).toHaveValue(
      'Explain the biomimetic water intelligence of Oceanicos.'
    );
  });

  it('opens Water Flow Magic drawer and renders 8 canonical stages with fail-closed provenance', async () => {
    installFetch();
    const user = userEvent.setup();
    render(<VibeOS />);

    const waterBtn = screen.getByRole('button', { name: /💧 Water Flow Magic \(8\)/i });
    expect(waterBtn).toBeInTheDocument();

    await user.click(waterBtn);
    expect(await screen.findByRole('region', { name: /Interactive water flow magic drawer/i })).toBeInTheDocument();
    expect(screen.getByText(/KAI WATER-FLOW · FINITE TRACE/i)).toBeInTheDocument();
    expect(screen.getAllByText(/REALITY/i).length).toBeGreaterThan(0);
    expect(screen.getByText('RETURN')).toBeInTheDocument();
    expect(screen.getAllByText(/UNKNOWN/i).length).toBeGreaterThan(0);
  });

  it('displays the engine provenance badge when the receipt includes an engine field', async () => {
    installFetch({
      '/api/chat': () =>
        json({
          success: true,
          status: 'VERIFIED',
          response: VERIFIED_RESPONSE,
          evidence_hash: VERIFIED_RESPONSE_SHA256,
          engine: 'llm:qwen2.5:0.5b',
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    await user.type(screen.getByRole('textbox', { name: 'Intent' }), 'What engine are you?');
    await user.click(screen.getByRole('button', { name: 'Send intent' }));

    expect(await screen.findByText(VERIFIED_RESPONSE)).toBeInTheDocument();
    expect(screen.getByText('llm:qwen2.5:0.5b')).toBeInTheDocument();
    const badge = screen.getByLabelText(/API receipt verified with SHA-256 evidence hash/i);
    expect(badge).toHaveTextContent('llm:qwen2.5:0.5b');
    expect(badge).toHaveTextContent(VERIFIED_RESPONSE_SHA256.slice(0, 8));
  });

  it('observes Kernel Capabilities and displays constitutional capability snapshot', async () => {
    installFetch({
      '/api/v1/kernel/capabilities': () =>
        json({
          success: true,
          capability: {
            contract: 'oceanicos-kernel.v1',
            execution: 'local-simulation-only',
            deterministicEvidence: true,
            humanAuthorizationRequired: true,
            capabilities: {
              observe: true,
              verify: true,
              remember: true,
            },
            limitations: ['local process only'],
          },
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const kernelBtn = screen.getByRole('button', { name: /⚙️ Kernel Capabilities/i });
    expect(kernelBtn).toBeInTheDocument();

    await user.click(kernelBtn);
    expect(await screen.findByText(/Kernel observed: oceanicos-kernel.v1/i)).toBeInTheDocument();
    expect(screen.getByText(/local-simulation-only/i)).toBeInTheDocument();
    expect(screen.getByText(/observe, verify, remember/i)).toBeInTheDocument();
  });

  it('observes Ecosystem Equation and displays in-process law fixpoint', async () => {
    installFetch({
      '/api/v1/ecosystem/equation': () =>
        json({
          success: true,
          law: 'omega.ecosystem-body.y.v1',
          source: 'ECOSYSTEM_BODY.md',
          reality: 'Expected ≡ Observed',
          equation: 'Omega := Y(...)',
          compression: {
            status: 'COMPRESSED',
            digest: '57e64fb1294dc84721425c55353b7aa24a7fb173d28f354fd60c39a7ff28741d',
          },
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const equationBtn = screen.getByRole('button', { name: /🌌 Ecosystem Equation/i });
    expect(equationBtn).toBeInTheDocument();

    await user.click(equationBtn);
    expect(await screen.findByText(/Ecosystem Equation observed: omega.ecosystem-body.y.v1/i)).toBeInTheDocument();
    expect(screen.getByText(/COMPRESSED/i)).toBeInTheDocument();
    expect(screen.getByText(/ECOSYSTEM_BODY.md/i)).toBeInTheDocument();
  });

  it('observes Therapeutic State Machine and displays calm KAI/ELION/OMEGA harmony', async () => {
    installFetch({
      '/api/v1/therapeutic/state': () =>
        json({
          success: true,
          model: 'omega.therapeutic-state-machine.v1',
          status: 'READY',
          state: {
            kai: {
              status: 'READY',
              authority: 'memory-only',
              summary: 'continuity ledger and evidence lineage are preserved without claiming authority',
            },
            elion: {
              status: 'READY',
              authority: 'bounded-execution',
              summary: 'execution remains limited to the declared scope, policy, and human boundary',
            },
            omega: {
              status: 'READY',
              authority: 'verification-gate',
              summary: 'expected outcomes are reconciled against observed evidence before completion is claimed',
            },
          },
          loop: ['observe', 'bound', 'execute', 'reconcile', 'remember'],
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const therapeuticBtn = screen.getByRole('button', { name: /🕊️ Therapeutic State/i });
    expect(therapeuticBtn).toBeInTheDocument();

    await user.click(therapeuticBtn);
    expect(await screen.findByText(/Therapeutic State Machine observed: READY/i)).toBeInTheDocument();
    expect(screen.getByText(/KAI: READY \(memory-only\)/i)).toBeInTheDocument();
    expect(screen.getByText(/ELION: READY \(bounded-execution\)/i)).toBeInTheDocument();
    expect(screen.getByText(/OMEGA: READY \(verification-gate\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Loop: \[observe → bound → execute → reconcile → remember\]/i)).toBeInTheDocument();
  });

  it('observes Reality Status Vector and displays 11-dimension epistemic boundary', async () => {
    installFetch({
      '/api/v1/reality/status': () =>
        json({
          success: true,
          contract: {
            currentStage: 'REALITY',
            invariant: 'VERIFY(ΔREALITY)',
            governingEquation: 'Ω∞v := VERIFY(ΔREALITY) ∧ PRESERVE(TRUTH) ∧ PROTECT(HUMAN_AGENCY)',
          },
          statusVector: [
            { field: 'declared', value: 'YES' },
            { field: 'represented', value: 'YES' },
            { field: 'implemented', value: 'YES' },
            { field: 'tested', value: 'YES' },
            { field: 'verified', value: 'YES' },
            { field: 'deployed', value: 'UNKNOWN' },
            { field: 'healthy', value: 'UNKNOWN' },
          ],
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const realityBtn = screen.getByRole('button', { name: /🌐 Reality Vector/i });
    expect(realityBtn).toBeInTheDocument();

    await user.click(realityBtn);
    expect(await screen.findByText(/Reality Verification Vector \(REALITY\)/i)).toBeInTheDocument();
    expect(screen.getByText(/declared: YES · represented: YES · implemented: YES · tested: YES · verified: YES · deployed: UNKNOWN · healthy: UNKNOWN/i)).toBeInTheDocument();
    expect(screen.getByText(/Invariant: VERIFY\(ΔREALITY\)/i)).toBeInTheDocument();
  });

  it('observes Kernel Telemetry Stats and displays live state machine metrics', async () => {
    installFetch({
      '/api/v1/kernel/stats': () =>
        json({
          success: true,
          stats: {
            totalTransitions: 42,
            verifiedStates: 39,
            humanGatedAuthorizations: 5,
            preservedDissentCount: 1,
            recompilationsTriggered: 2,
            avgEfficiencyRatio: 0.94,
            currentRootStateHash: '0x1234567890abcdef',
          },
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const statsBtn = screen.getByRole('button', { name: /📊 Kernel Stats/i });
    expect(statsBtn).toBeInTheDocument();

    await user.click(statsBtn);
    expect(await screen.findByText(/Kernel Telemetry observed: 42 transitions · 39 verified states · 5 human-gated · 1 dissents preserved · 2 recompilations · 0.94 avg efficiency/i)).toBeInTheDocument();
    expect(screen.getByText(/Root: 0x12345678\.\.\./i)).toBeInTheDocument();
  });

  it('observes Multi-Region Mesh Convergence and displays consensus telemetry', async () => {
    installFetch({
      '/api/v1/mesh/simulate': () =>
        json({
          success: true,
          convergence: {
            consensusRound: 'round-101',
            quorumReached: true,
            participatingNodes: 4,
            effectiveStatus: 'CONVERGED_PASS',
            clusterSignatureProof: '11a21306ccef0d28b3a828323e211c221b058c1a23695519f1925b3ba1b1b1a5',
            votes: [
              { nodeId: 'node-us', region: 'US', verdict: 'PASS', latencyMs: 22 },
              { nodeId: 'node-eu', region: 'EU', verdict: 'PASS', latencyMs: 55 },
            ],
          },
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const meshBtn = screen.getByRole('button', { name: /🪐 Mesh Convergence/i });
    expect(meshBtn).toBeInTheDocument();

    await user.click(meshBtn);
    expect(await screen.findByText(/Multi-Region Mesh Convergence: CONVERGED_PASS \(Quorum: yes, 4 nodes\)/i)).toBeInTheDocument();
    expect(screen.getByText(/node-us \(US: PASS, 22ms\) · node-eu \(EU: PASS, 55ms\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Round: round-101/i)).toBeInTheDocument();
  });
});
