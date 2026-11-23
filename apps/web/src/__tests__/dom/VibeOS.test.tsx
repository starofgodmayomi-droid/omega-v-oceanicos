import { describe, expect, it, jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import { VibeOS } from '../../VibeOS';
import { installFetch, json, type FakeResponse } from './harness';

const VERIFIED_RESPONSE = 'Observed: the ledger is intact.';
const VERIFIED_RESPONSE_SHA256 = '7e1fb64de987a8e0f7d01b596fdfe68802338fddc3c33b4fc9c4ef72b2a1124d';

describe('Vibe OS surface', () => {
  it('keeps the AVRØ HOUSE master poster linked in canonical docs and byte-identical in public assets', () => {
    const brandDocument = readFileSync(new URL('../../../../../docs/BRAND.md', import.meta.url), 'utf8');
    const docsPoster = readFileSync(new URL('../../../../../docs/assets/avro-house-master-poster.jpg', import.meta.url));
    const publicPoster = readFileSync(
      new URL('../../../../../apps/web/public/avro-house-master-poster.jpg', import.meta.url)
    );

    expect(brandDocument).toContain('./assets/avro-house-master-poster.jpg');
    expect(publicPoster.equals(docsPoster)).toBe(true);
  });

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

  it('explains the app/model boundary without claiming a live provider connection', () => {
    installFetch();
    render(<VibeOS active={false} />);

    const disclosure = screen.getByRole('note', { name: 'AI model and provider boundary' });
    expect(disclosure).toHaveTextContent(/OCEANICOS is a chat-enabled application/i);
    expect(disclosure).toHaveTextContent(/not the ChatGPT or Manus assistant service/i);
    expect(disclosure).toHaveTextContent(/local deterministic composer by default/i);
    expect(disclosure).toHaveTextContent(/explicit opt-in/i);
    expect(disclosure).toHaveTextContent(/provider availability is not live-verified/i);
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

  it('switches views without losing the conversation draft and restores focus', async () => {
    installFetch();
    const user = userEvent.setup();
    render(<App />);

    const intent = screen.getByRole('textbox', { name: 'Intent' });
    await user.type(intent, 'Carry this thought across views.');
    const navigation = screen.getByRole('navigation', { name: 'OCEANICOS views' });
    expect(within(navigation).getByRole('button', { name: 'Vibe OS' })).toHaveAttribute('aria-current', 'page');

    await user.click(screen.getByRole('button', { name: /full system dashboard/i }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: /what shall we make real/i })).toBeInTheDocument()
    );
    expect(screen.getByRole('region', { name: 'Invisible Online Computer' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Intent' })).not.toBeInTheDocument();
    const dashboardNavigation = screen.getByRole('navigation', { name: 'OCEANICOS views' });
    expect(within(dashboardNavigation).getByRole('button', { name: 'Full system dashboard' })).toHaveAttribute('aria-current', 'page');

    await user.click(screen.getByRole('button', { name: /vibe os/i }));
    const restoredIntent = screen.getByRole('textbox', { name: 'Intent' });
    expect(restoredIntent).toHaveValue('Carry this thought across views.');
    expect(screen.getByRole('log', { name: 'Conversation' })).toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Vibe OS' })));
  });

  it('does not probe service health when the conversation surface is inactive', () => {
    const fetchMock = installFetch();
    render(<VibeOS active={false} />);

    expect(fetchMock).not.toHaveBeenCalledWith('/api/health', expect.anything());
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

  it('opens and closes the Living Entity Codex modal with 20 master schematics and selects expanded dimensions', async () => {
    installFetch();
    const user = userEvent.setup();
    render(<VibeOS />);

    const codexBtn = screen.getByRole('button', { name: /🪞 Living Codex/i });
    expect(codexBtn).toBeInTheDocument();

    await user.click(codexBtn);
    expect(await screen.findByRole('dialog', { name: /Living Entity Codex/i })).toBeInTheDocument();
    expect(screen.getByText(/20 Master Schematics/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Lucid Field in the Max Space of Reality/i).length).toBeGreaterThan(0);

    // Verify expanded dimension 20 exists and can be selected
    const dim20Btn = screen.getByRole('button', { name: /DIMENSION 20/i });
    expect(dim20Btn).toBeInTheDocument();
    await user.click(dim20Btn);
    expect(screen.getAllByText(/Cosmic Whale & Heart Synthesis/i).length).toBeGreaterThan(0);

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
  }, 60000);

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

  it('observes Navigator Evidence and displays presentation evidence boundary', async () => {
    installFetch({
      '/api/v1/navigator/evidence': () =>
        json({
          contract: 'omega-navigator-evidence.v1',
          overallStatus: 'SUPPORTED',
          readOnly: true,
          source: { repository: 'starofgodmayomi-droid/omega-v-oceanicos' },
          evidence: [
            { id: 'omega-api-contract-v1', status: 'SUPPORTED', claim: 'The Omega API exposes a versioned read-only evidence snapshot.' },
            { id: 'omega-deployment-observation', status: 'UNKNOWN', claim: 'A deployed Omega target has not been observed.' },
          ],
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const navBtn = screen.getByRole('button', { name: /🧭 Navigator Evidence/i });
    expect(navBtn).toBeInTheDocument();

    await user.click(navBtn);
    expect(await screen.findByText(/Navigator Evidence observed: omega-navigator-evidence.v1 \(SUPPORTED, readOnly: yes\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Repository: starofgodmayomi-droid\/omega-v-oceanicos/i)).toBeInTheDocument();
    expect(screen.getByText(/omega-api-contract-v1: SUPPORTED/i)).toBeInTheDocument();
  });

  it('observes Ecosystem Composite Status and displays multi-layer architecture telemetry', async () => {
    installFetch({
      '/api/v1/ecosystem/status': () =>
        json({
          success: true,
          contract: {
            name: 'omega-v-oceanicos',
            version: '1.0.0',
            currentStage: 'ECOSYSTEM',
            growthLaw: '0 → MINI → FULL STACK → ECOSYSTEM → REALITY ↺ ∞',
            invariant: 'VERIFY(ΔREALITY)',
          },
          layers: [
            { layer: 'Reality Observation', evidenceStatus: 'SUPPORTED' },
            { layer: 'Verification & Dissent', evidenceStatus: 'SUPPORTED' },
            { layer: 'Attestation', evidenceStatus: 'UNVERIFIED' },
            { layer: 'Distribution & Deployment', evidenceStatus: 'UNKNOWN' },
          ],
          governance: {
            status: 'SUPPORTED',
            humanAuthorizationRequired: true,
          },
          valueAssessment: {
            status: 'SUPPORTED',
          },
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const ecoBtn = screen.getByRole('button', { name: /🏛️ Ecosystem Status/i });
    expect(ecoBtn).toBeInTheDocument();

    await user.click(ecoBtn);
    expect(await screen.findByText(/Ecosystem Composite Status observed: Stage ECOSYSTEM \(omega-v-oceanicos v1\.0\.0\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Layers \(4\): 2 SUPPORTED · 1 UNVERIFIED · 1 UNKNOWN/i)).toBeInTheDocument();
    expect(screen.getByText(/Governance: SUPPORTED \(Human Gate: YES\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Value Assessment: SUPPORTED/i)).toBeInTheDocument();
    expect(screen.getByText(/Growth Law: "0 → MINI → FULL STACK → ECOSYSTEM → REALITY ↺ ∞"/i)).toBeInTheDocument();
  });

  it('observes ΔVRØ House 10-Layer Ecosystem and displays full-stack equation telemetry', async () => {
    installFetch({
      '/api/v1/ecosystem/status': () =>
        json({
          success: true,
          contract: {
            name: 'omega-v-oceanicos',
            version: '1.0.0',
            currentStage: 'ECOSYSTEM',
            growthLaw: '0 → MINI → FULL STACK → ECOSYSTEM → REALITY ↺ ∞',
            invariant: 'VERIFY(ΔREALITY)',
          },
          avroHouse: {
            equation:
              'ΔVRØ_HOUSE := Frontend(Ω_:3000) + Backend(Θ_:5000) + (Inference_Hardware(Ψ_:11434⊕:8088) ⊕ MicroVM_Sandboxes ⊕ Vector/Graph_Memory ⊕ MCP/Search ⊕ WebRTC_Streaming ⊕ Guardrails/Eval_Flywheel) | Σ_KAI[DAV T[i,j,k,l] = i+j+k+l] → Attested_Reality',
            doctrine: "ATTEST, DON'T ASSERT. Capability ≠ Authority. Expected ≡ Observed.",
            layers: [
              { index: 1, name: 'Frontend Surface', alias: 'Ω — React Vibe OS :3000', evidenceStatus: 'SUPPORTED' },
              { index: 2, name: 'Backend Spine & Orchestrator', alias: 'Θ — Fastify API :5000', evidenceStatus: 'SUPPORTED' },
              { index: 3, name: 'Inference Engine & Acceleration', alias: 'Ψ — Local & Frontier Compute :11434 ⊕ :8088', evidenceStatus: 'SUPPORTED' },
              { index: 4, name: 'Sandboxed Execution & Computer Use', alias: 'Docker / Firecracker / Playwright', evidenceStatus: 'SUPPORTED' },
              { index: 5, name: 'Memory, Vector & Ledger Storage', alias: 'SQLite / pgvector / kai_ledger', evidenceStatus: 'SUPPORTED' },
              { index: 6, name: 'Tool Protocols & Live Grounding', alias: 'MCP / OpenAPI / Live Grounding', evidenceStatus: 'SUPPORTED' },
              { index: 7, name: 'Real-Time Multimodal & Streaming Pipelines', alias: 'WebRTC / WebSockets / Media Workers', evidenceStatus: 'SUPPORTED' },
              { index: 8, name: 'Trust, Safety & Provenance', alias: 'Σ — KAI Shield / SHA-256 / DAV T[i,j,k,l]', evidenceStatus: 'SUPPORTED' },
              { index: 9, name: 'Automated Evals & Data Flywheel', alias: 'CI Benchmarks / pnpm verify:full', evidenceStatus: 'SUPPORTED' },
              { index: 10, name: 'Edge, Caching & FinOps Infrastructure', alias: 'Redis Cache / Rate Limits / Offline Sync', evidenceStatus: 'SUPPORTED' },
            ],
          },
          layers: [],
          governance: { status: 'SUPPORTED', humanAuthorizationRequired: true },
          valueAssessment: { status: 'SUPPORTED' },
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const avroBtn = screen.getByRole('button', { name: /🏛️ ΔVRØ House \(10-Layer\)/i });
    expect(avroBtn).toBeInTheDocument();

    await user.click(avroBtn);
    expect(await screen.findByText(/ΔVRØ House 10-Layer AI Ecosystem observed:/i)).toBeInTheDocument();
    expect(screen.getByText(/Active Ports: Frontend \(:3000\), Spine \(:5000\), Brain \(:11434\), Muscle \(:8088\)/i)).toBeInTheDocument();
  });

  it('observes Autonomous Sandbox & Local Actions and displays fail-closed execution boundary', async () => {
    installFetch({
      '/api/v1/local-actions': () =>
        json({
          success: true,
          enabled: false,
          actions: [],
          reason: 'LOCAL_RUNNER_DISABLED',
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const sandboxBtn = screen.getByRole('button', { name: /🛠️ Sandbox Actions/i });
    expect(sandboxBtn).toBeInTheDocument();

    await user.click(sandboxBtn);
    expect(await screen.findByText(/Autonomous Sandbox & Local Runner observed: Status DISABLED \(LOCAL_RUNNER_DISABLED\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Sandboxed executions remain fail-closed until granted explicit local execution authority/i)).toBeInTheDocument();
  });

  it('probes Real-Time Streaming Pipeline and verifies Layer 7 multimodal stream', async () => {
    installFetch();
    const user = userEvent.setup();
    render(<VibeOS />);

    const streamBtn = screen.getByRole('button', { name: /🌊 Real-Time Stream/i });
    expect(streamBtn).toBeInTheDocument();

    await user.click(streamBtn);
    expect(
      await screen.findByText(
        /Real-Time Multimodal Stream active: SSE connection verified \(\/v1\/stream\) with harmonic voice continuum gateway/i
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/Streaming tokens and block events flowing across Layer 7 pipeline/i)).toBeInTheDocument();
  });

  it('observes Layer 9 Evals Flywheel and displays benchmark suite telemetry', async () => {
    installFetch();
    const user = userEvent.setup();
    render(<VibeOS />);

    const evalsBtn = screen.getByRole('button', { name: /📊 Evals Flywheel/i });
    expect(evalsBtn).toBeInTheDocument();

    await user.click(evalsBtn);
    expect(
      await screen.findByText(
        /Layer 9 Evals Flywheel observed: 69 DOM tests across 6 suites/i
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/49 integration suites/i)).toBeInTheDocument();
    expect(screen.getByText(/92 swarm receipts/i)).toBeInTheDocument();
  });

  it('observes Layer 10 Edge & FinOps and displays infrastructure telemetry', async () => {
    installFetch();
    const user = userEvent.setup();
    render(<VibeOS />);

    const edgeBtn = screen.getByRole('button', { name: /⚙️ Edge & FinOps/i });
    expect(edgeBtn).toBeInTheDocument();

    await user.click(edgeBtn);
    expect(
      await screen.findByText(
        /Layer 10 Edge & FinOps observed: Semantic Cache ACTIVE \(local-memory-fallback\) · Rate Limiting ACTIVE · Offline Sync ACTIVE/i
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/FinOps Formula: "V = \(Outcome × Evidence\) − \(Cost \+ Risk\)"/i)).toBeInTheDocument();
  });

  it('probes Layer 1-10 Continuum Audit and verifies unified ecosystem convergence', async () => {
    installFetch();
    const user = userEvent.setup();
    render(<VibeOS />);

    const auditBtn = screen.getByRole('button', { name: /🌌 Continuum Audit/i });
    expect(auditBtn).toBeInTheDocument();

    await user.click(auditBtn);
    expect(
      await screen.findByText(
        /ΔVRØ House Continuum Audit: Status CONVERGED \(10\/10 layers active\)\. Invariant: VERIFY\(ΔREALITY\)\./i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /10-layer full-stack AI ecosystem unified: Frontend \(:3000\) ⊕ Backend \(:5000\) ⊕ Compute \(:11434 ⊕ :8088\) ⊕ MicroVM Sandboxes ⊕ Vector Memory ⊕ MCP Connectors ⊕ WebRTC Streaming ⊕ KAI Shield ⊕ Evals Flywheel ⊕ Edge FinOps\./i
      )
    ).toBeInTheDocument();
  });

  it('renders the complete 10-layer living telemetry continuum status badge and grid', async () => {
    installFetch();
    render(<VibeOS />);

    expect(screen.getByLabelText('10-Layer Continuum Status')).toBeInTheDocument();
    expect(screen.getByText(/🏛️ 10\/10 Layers Converged · VERIFY\(ΔREALITY\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Frontend Surface · 3000 status')).toHaveTextContent('SUPPORTED');
    expect(screen.getByLabelText('Sandbox Runner status')).toHaveTextContent('SUPPORTED');
    expect(screen.getByLabelText('Ledger Receipts status')).toHaveTextContent('VERIFIED');
    expect(screen.getByLabelText('MCP Connectors status')).toHaveTextContent('SUPPORTED');
    expect(screen.getByLabelText('Real-Time Stream status')).toHaveTextContent('VERIFIED');
    expect(screen.getByLabelText('Evals Flywheel status')).toHaveTextContent('VERIFIED');
    expect(screen.getByLabelText('Edge & FinOps status')).toHaveTextContent('SUPPORTED');
  });

  it('probes Whole Ecosystem Release Attestation and verifies full-stack platform convergence', async () => {
    installFetch();
    const user = userEvent.setup();
    render(<VibeOS />);

    const releaseBtn = screen.getByRole('button', { name: /🏆 Release Attestation/i });
    expect(releaseBtn).toBeInTheDocument();

    await user.click(releaseBtn);
    expect(
      await screen.findByText(
        /🏆 Ecosystem Release Attestation Verified \[Ω∞v-1\.0\.0-CONTINUUM\]/i
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/Platform: ΔVRØ HOUSE × Ω∞v OCEANICOS/i)).toBeInTheDocument();
    expect(screen.getByText(/Convergence: 10\/10 CONVERGED/i)).toBeInTheDocument();
    expect(screen.getByText(/DAV N=8 Invariant: 57,344/i)).toBeInTheDocument();
  });

  it('probes SAOS Entity and House Flow and verifies star topology and 10 tiers', async () => {
    installFetch();
    const user = userEvent.setup();
    render(<VibeOS />);

    const saosBtn = screen.getByRole('button', { name: /🌊 SAOS Entity Flow/i });
    expect(saosBtn).toBeInTheDocument();

    await user.click(saosBtn);
    expect(
      await screen.findByText(
        /🌊 SAOS Entity Ecosystem Platform Active \[Symbol: 30013030\]/i
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/Star Topology: 6 environments active/i)).toBeInTheDocument();
    expect(screen.getByText(/House Positioning: 10 tiers \(Crown to Ground\) verified/i)).toBeInTheDocument();
  });

  it('opens Studio and Settings modal with Voice, Image, Video, and Platform Settings tabs', async () => {
    installFetch();
    const user = userEvent.setup();
    render(<VibeOS />);

    const studioHeaderBtn = screen.getByRole('button', { name: /Open Studio and Settings/i });
    expect(studioHeaderBtn).toBeInTheDocument();

    await user.click(studioHeaderBtn);
    expect(await screen.findByRole('dialog', { name: /Studio and Settings/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Platform Settings/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Voice Studio/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Image Studio/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Video Studio/i })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Voice Studio/i }));
    expect(screen.getByText(/Harmonic Frequency Calibration/i)).toBeInTheDocument();
    expect(screen.getByText(/432 Hz · Natural Harmonic/i)).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Image Studio/i }));
    expect(screen.getByText(/Deterministic SVG Tensor Image Studio/i)).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /Video Studio/i }));
    expect(screen.getByText(/Real-Time Omni Multimodal Video Studio/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Close Studio and Settings modal/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /Studio and Settings/i })).not.toBeInTheDocument();
    });
  });

  it('probes Multimodal Synthesis Bridge and verifies cross-modal attested asset', async () => {
    installFetch();
    const user = userEvent.setup();
    render(<VibeOS />);

    const synBtn = screen.getByRole('button', { name: /✨ Synthesize Asset/i });
    expect(synBtn).toBeInTheDocument();

    await user.click(synBtn);
    expect(
      await screen.findByText(/✨ Multimodal Synthesis Verified: Asset asset-7a42b109c8e1/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Voice: Soul AI @ 432Hz · Image: svg_tensor_canvas/i)).toBeInTheDocument();
    expect(screen.getByText(/Video: 1920x1080 @ 30fps/i)).toBeInTheDocument();
  });

  it('probes Century Milestone and verifies Receipt #100 attestation', async () => {
    installFetch();
    const user = userEvent.setup();
    render(<VibeOS />);

    const centuryBtn = screen.getByRole('button', { name: /💯 Century Milestone/i });
    expect(centuryBtn).toBeInTheDocument();

    await user.click(centuryBtn);
    expect(
      await screen.findByText(/💯 Century Milestone Attested \[Receipt #100\]/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/10\/10 Layers Converged · 256\/256 Tensor Coordinates/i)).toBeInTheDocument();
    expect(screen.getByText(/Seal: ΔVRØ-CENTURY-COUNCIL \(VERIFIED\)/i)).toBeInTheDocument();
  });

  it('probes Sovereign Reality Tools Gateway and verifies 8 attested reality tools', async () => {
    installFetch();
    const user = userEvent.setup();
    render(<VibeOS />);

    const toolsBtn = screen.getByRole('button', { name: /🛠️ Reality Tools/i });
    expect(toolsBtn).toBeInTheDocument();

    await user.click(toolsBtn);
    expect(
      await screen.findByText(/🛠️ Sovereign Reality Tools Gateway Active: 8 tools verified/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/execution, grounding, neural inference, voice synthesis, image canvas, video streaming/i)).toBeInTheDocument();
  });

  it('observes Value Navigator Proposals and displays journal hash-chain integrity', async () => {
    installFetch({
      '/api/v1/value-navigator/proposals': () =>
        json({
          success: true,
          entries: [
            { id: 'prop-001', phase: 'PROPOSAL', title: 'Solar compute cluster proposal' },
            { id: 'prop-002', phase: 'PROPOSAL', title: 'Deep sea telemetry node expansion' },
          ],
          total: 2,
          truncated: false,
          integrity: 'verified-local-hash-chain',
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const valBtn = screen.getByRole('button', { name: /💎 Value Proposals/i });
    expect(valBtn).toBeInTheDocument();

    await user.click(valBtn);
    expect(await screen.findByText(/Value Navigator Proposals: 2 proposal\(s\) recorded/i)).toBeInTheDocument();
    expect(screen.getByText(/Integrity: verified-local-hash-chain/i)).toBeInTheDocument();
    expect(screen.getByText(/Journal: local append-only hash chain · Bounded economic value optimization\./i)).toBeInTheDocument();
  });

  it('observes Dependency Map and displays architectural package nodes', async () => {
    installFetch({
      '/api/v1/dependencies': () =>
        json({
          success: true,
          contract: {
            name: 'omega-v-oceanicos',
            version: '1.0.0',
            invariant: 'PRESENT ≠ WORKSPACE ≠ IMPORTED ≠ VERIFIED',
            migrationStep: 'DEPENDENCY MAP reconciled to pnpm-workspace.yaml',
          },
          nodes: [
            { name: 'types', classification: 'BUILT' },
            { name: 'kernel', classification: 'BUILT' },
            { name: 'gateway', classification: 'WORKSPACE' },
            { name: 'sdk', classification: 'SOURCE-ONLY' },
          ],
          summary: {
            built: 2,
            workspace: 1,
            sourceOnly: 1,
            stub: 0,
            total: 4,
          },
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const depBtn = screen.getByRole('button', { name: /📦 Dependency Map/i });
    expect(depBtn).toBeInTheDocument();

    await user.click(depBtn);
    expect(await screen.findByText(/Dependency Map observed: 4 package nodes \(2 built · 1 workspace · 1 source-only · 0 stub\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Invariant: "PRESENT ≠ WORKSPACE ≠ IMPORTED ≠ VERIFIED"/i)).toBeInTheDocument();
    expect(screen.getByText(/Migration: DEPENDENCY MAP reconciled to pnpm-workspace\.yaml/i)).toBeInTheDocument();
  });

  it('observes Bounded Workers and displays role registrations and governance limits', async () => {
    installFetch({
      '/api/v1/omega/workers': () =>
        json({
          success: true,
          workers: [
            { id: 'observer', risk: 'read-only' },
            { id: 'researcher', risk: 'read-only' },
            { id: 'planner', risk: 'read-only' },
            { id: 'tester', risk: 'local-mutating' },
            { id: 'repo-builder', risk: 'local-mutating' },
          ],
          activeWorkers: [{ id: 'worker-1' }],
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const workerBtn = screen.getByRole('button', { name: /🤖 Bounded Workers/i });
    expect(workerBtn).toBeInTheDocument();

    await user.click(workerBtn);
    expect(await screen.findByText(/Bounded Workers observed: 5 roles registered \(3 read-only · 2 human-gated mutating\) · Active: 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Principle: "worker output is evidence, not authority"/i)).toBeInTheDocument();
  });

  it('observes Divergence Ledger and preserves dissent conflicts without retry', async () => {
    installFetch({
      '/api/v1/omega/divergences': () =>
        json({
          success: true,
          count: 0,
          alerts: [],
          redacted: true,
          nextAction: 'review the divergent evidence and preserve the conflict; no retry or authorization was performed',
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const divBtn = screen.getByRole('button', { name: /🛡️ Divergence Ledger/i });
    expect(divBtn).toBeInTheDocument();

    await user.click(divBtn);
    expect(await screen.findByText(/Divergence & Dissent Ledger: 0 recorded divergence\(s\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Redacted: YES/i)).toBeInTheDocument();
    expect(screen.getByText(/Action: "review the divergent evidence and preserve the conflict; no retry or authorization was performed"/i)).toBeInTheDocument();
    expect(screen.getByText(/Epistemic law: "preserve the conflict; never fabricate consensus"/i)).toBeInTheDocument();
  });

  it('observes Single Body 4x4x4x4 Compression and displays lossless cell projection', async () => {
    installFetch({
      '/api/v1/ecosystem/body': () =>
        json({
          success: true,
          status: 'VERIFIED',
          fixpoint: {
            equation: 'omega.ecosystem-body.fixpoint.v1',
            status: 'VERIFIED',
          },
          compression: {
            space: {
              notation: '4×4×4×4',
              rank: 4,
              capacity: 256,
            },
            count: 7,
            filled: 7,
            digest: 'b52fcb6c8b59a88423973a84fae8646f7fde49b396921927617f09d85020fbf0',
            expansion: {
              status: 'VERIFIED',
              lossless: true,
            },
          },
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const compBtn = screen.getByRole('button', { name: /🧊 Single Body \(4×4×4×4\)/i });
    expect(compBtn).toBeInTheDocument();

    await user.click(compBtn);
    expect(await screen.findByText(/Single Body 4×4×4×4 Compression: 7\/256 cells \(4×4×4×4 rank 4\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Digest: b52fcb6c8b\.\.\./i)).toBeInTheDocument();
    expect(screen.getByText(/Expansion: VERIFIED \(lossless: YES\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Fixpoint: omega\.ecosystem-body\.fixpoint\.v1 \(VERIFIED\)/i)).toBeInTheDocument();
  });

  it('observes Connector Journal and displays hash-chained admission entries', async () => {
    installFetch({
      '/api/v1/omega/connectors/observations': () =>
        json({
          success: true,
          entries: [],
          total: 0,
          truncated: false,
          integrity: 'verified-local-hash-chain',
          limitation: 'local connector journal is not deployment health, not live GitHub execution, not revenue, and not durable across a destroyed volume',
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const connBtn = screen.getByRole('button', { name: /🔗 Connector Journal/i });
    expect(connBtn).toBeInTheDocument();

    await user.click(connBtn);
    expect(await screen.findByText(/Connector Journal: 0 observation\(s\) recorded/i)).toBeInTheDocument();
    expect(screen.getByText(/Integrity: verified-local-hash-chain/i)).toBeInTheDocument();
    expect(screen.getByText(/Limitation: "local connector journal is not deployment health, not live GitHub execution, not revenue"/i)).toBeInTheDocument();
  });

  it('observes Command Pipeline and displays sovereign command ledger with status breakdown', async () => {
    installFetch({
      '/api/v1/omega/commands': () =>
        json({
          success: true,
          count: 3,
          commands: [
            { commandId: 'cmd-001', intent: 'verify ecosystem', requestedBy: 'operator', status: 'VERIFIED', decision: 'ALLOW', execution: { stateAfter: 'bounded-local-action-complete' } },
            { commandId: 'cmd-002', intent: 'check health', requestedBy: 'dashboard-user', status: 'REVIEW', decision: 'REVIEW', execution: null },
            { commandId: 'cmd-003', intent: 'observe water flow', requestedBy: 'operator', status: 'EXECUTED', decision: 'ALLOW', execution: { stateAfter: 'bounded-local-action-complete' } },
          ],
          redacted: true,
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const cmdBtn = screen.getByRole('button', { name: /📋 Command Pipeline/i });
    expect(cmdBtn).toBeInTheDocument();

    await user.click(cmdBtn);
    expect(await screen.findByText(/Command Pipeline: 3 command\(s\)/i)).toBeInTheDocument();
    expect(screen.getByText(/VERIFIED: 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Under Review: 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Redacted: YES/i)).toBeInTheDocument();
    expect(screen.getByText(/command output is evidence, not authority/i)).toBeInTheDocument();
  });

  it('observes KAI Memory and displays digest-only ledger with MEMORY != PROOF principle', async () => {
    installFetch({
      '/api/kai/memory?limit=5': () =>
        json({
          success: true,
          total: 29,
          records: [
            { id: 'rec-001', timestamp: '2026-11-21T00:41:35.812Z', intent: 'Explore the current state of', evidence_hash: 'a6997d4d668b24bb87c7d0de72d6cb6bec7586015f32a9ac42486733fd682416', status: 'VERIFIED', contract_id: '86e7f278-7cea-48e6-a913-82e5d44ba417' },
            { id: 'rec-002', timestamp: '2026-11-21T00:41:09.865Z', intent: 'hello', evidence_hash: 'c8894ceba04beaeb31ac95c63c8e4b9ffbf18a02368f0f8870dc24a9dd6991b0', status: 'VERIFIED', contract_id: 'f7a9f840-a82a-4165-9401-3b3a49505a63' },
          ],
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const kaiBtn = screen.getByRole('button', { name: /🧠 KAI Memory/i });
    expect(kaiBtn).toBeInTheDocument();

    await user.click(kaiBtn);
    expect(await screen.findByText(/KAI Memory: 29 record\(s\) total/i)).toBeInTheDocument();
    expect(screen.getByText(/VERIFIED in sample: 2/i)).toBeInTheDocument();
    expect(screen.getByText(/MEMORY != PROOF/i)).toBeInTheDocument();
    expect(screen.getByText(/Latest intent: "Explore the current state of"/i)).toBeInTheDocument();
  });

  it('observes Omega Events and displays sovereign lifecycle transitions', async () => {
    installFetch({
      '/api/v1/omega/events': () =>
        json({
          success: true,
          events: [
            { type: 'command.proposed', commandId: 'cmd-001', status: 'REVIEW', at: '2026-10-10T14:17:06.924Z' },
            { type: 'command.approved', commandId: 'cmd-001', status: 'AUTHORIZED', at: '2026-10-10T15:11:21.141Z', operator: 'operator-1' },
            { type: 'command.executed', commandId: 'cmd-001', status: 'EXECUTED', at: '2026-10-10T15:11:21.183Z' },
          ],
          redacted: true,
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const evtBtn = screen.getByRole('button', { name: /📡 Omega Events/i });
    expect(evtBtn).toBeInTheDocument();

    await user.click(evtBtn);
    expect(await screen.findByText(/Omega Events: 3 lifecycle event\(s\) recorded/i)).toBeInTheDocument();
    expect(screen.getByText(/Latest event: "command\.executed" \(cmd-001\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Redacted: YES/i)).toBeInTheDocument();
    expect(screen.getByText(/event history records transitions, not authorization/i)).toBeInTheDocument();
  });

  it('observes Persistence Status and displays local custody and coordination limitations', async () => {
    installFetch({
      '/api/persistence/status': () =>
        json({
          success: true,
          persistence: {
            enabled: true,
            coordination: {
              mode: 'local-single-process',
              scope: 'single-process',
              limitations: 'does not prove distributed consistency does not prove leader election or replica agreement',
            },
            custody: {
              mode: 'unverified-local',
              verified: false,
            },
          },
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const persistBtn = screen.getByRole('button', { name: /💾 Persistence Status/i });
    expect(persistBtn).toBeInTheDocument();

    await user.click(persistBtn);
    expect(await screen.findByText(/Persistence Status: ENABLED/i)).toBeInTheDocument();
    expect(screen.getByText(/Coordination: local-single-process \(single-process\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Custody: unverified-local/i)).toBeInTheDocument();
    expect(screen.getByText(/does not prove distributed consistency/i)).toBeInTheDocument();
  });

  it('observes Miner Status and displays local trial bounds without external work claim', async () => {
    installFetch({
      '/api/v1/miner/status': () =>
        json({
          success: true,
          miner: {
            active: false,
            intervalMs: 5000,
            totalMined: 0,
            lastBlockTime: '',
          },
          bounds: {
            intervalMs: { min: 1000, max: 60000 },
            proofOfWorkAttempts: 1000000,
          },
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const minerBtn = screen.getByRole('button', { name: /⛏️ Miner Status/i });
    expect(minerBtn).toBeInTheDocument();

    await user.click(minerBtn);
    expect(await screen.findByText(/Miner Status: IDLE/i)).toBeInTheDocument();
    expect(screen.getByText(/Interval: 5000ms/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Mined: 0/i)).toBeInTheDocument();
    expect(screen.getByText(/PoW Attempts Bound: 1000000/i)).toBeInTheDocument();
    expect(screen.getByText(/local mining simulation is bounded trial/i)).toBeInTheDocument();
  });

  it('observes Command Provenance and displays lineage without asserting execution authority', async () => {
    installFetch({
      '/api/v1/omega/commands': () =>
        json({
          success: true,
          count: 1,
          commands: [
            {
              commandId: 'cmd-test-123',
              intent: 'verify lineage continuity',
              requestedBy: 'operator-1',
              status: 'REVIEW',
              createdAt: '2026-11-21T00:00:00Z',
              workers: ['planner'],
              decision: 'REVIEW',
            },
          ],
        }),
      '/api/v1/omega/commands/cmd-test-123/provenance': () =>
        json({
          success: true,
          provenance: {
            commandId: 'cmd-test-123',
            intent: 'verify lineage continuity',
            requestedBy: 'operator-1',
            createdAt: '2026-11-21T00:00:00Z',
            context: { stateBefore: 'abc', observationKind: 'supplied-state' },
            workers: ['planner'],
            status: 'REVIEW',
            events: [{ type: 'command.proposed', commandId: 'cmd-test-123', status: 'REVIEW', at: '2026-11-21T00:00:00Z' }],
            lineage: [{ type: 'command.proposed', at: '2026-11-21T00:00:00Z', status: 'REVIEW' }],
            redacted: true,
          },
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const provBtn = screen.getByRole('button', { name: /🔍 Command Provenance/i });
    expect(provBtn).toBeInTheDocument();

    await user.click(provBtn);
    expect(await screen.findByText(/Command Provenance \(cmd-test-123\): Status: REVIEW/i)).toBeInTheDocument();
    expect(screen.getByText(/Lineage: 1 step\(s\) · Events: 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Intent: "verify lineage continuity"/i)).toBeInTheDocument();
    expect(screen.getByText(/Requested by: operator-1/i)).toBeInTheDocument();
    expect(screen.getByText(/command lineage audits transitions, not execution authority/i)).toBeInTheDocument();
  });

  it('observes Attestation Policy and displays cryptographic configuration without asserting validity', async () => {
    installFetch({
      '/api/attest/policy': () =>
        json({
          success: true,
          policy: {
            authMode: 'local',
            revocationEnabled: true,
            revocationRevision: 0,
            revocationConsistency: 'multi-process-single-volume',
            attestationAlgorithm: 'HMAC-SHA256',
          },
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const policyBtn = screen.getByRole('button', { name: /📜 Attestation Policy/i });
    expect(policyBtn).toBeInTheDocument();

    await user.click(policyBtn);
    expect(await screen.findByText(/Attestation Policy: Auth: local/i)).toBeInTheDocument();
    expect(screen.getByText(/Algorithm: HMAC-SHA256/i)).toBeInTheDocument();
    expect(screen.getByText(/Revocation: ENABLED \(rev 0\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Consistency: multi-process-single-volume/i)).toBeInTheDocument();
    expect(screen.getByText(/attestation policy audits cryptographic configuration, not signature validity/i)).toBeInTheDocument();
  });

  it('observes Attestation Revocations and displays local journal without asserting distributed consensus', async () => {
    installFetch({
      '/api/attest/revocations': () =>
        json({
          success: true,
          data: [],
          meta: {
            integrity: 'intact',
            revision: 0,
            consistency: 'multi-process-single-volume',
            verified: true,
          },
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const revocationsBtn = screen.getByRole('button', { name: /🚫 Attestation Revocations/i });
    expect(revocationsBtn).toBeInTheDocument();

    await user.click(revocationsBtn);
    expect(await screen.findByText(/Attestation Revocations: 0 revoked attestation\(s\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Revision: 0/i)).toBeInTheDocument();
    expect(screen.getByText(/Integrity: intact/i)).toBeInTheDocument();
    expect(screen.getByText(/Consistency: multi-process-single-volume/i)).toBeInTheDocument();
    expect(screen.getByText(/revocation journal audits locally revoked keys, not distributed consensus/i)).toBeInTheDocument();
  });

  it('observes Mesh Nodes and displays simulated topology without asserting live reachability', async () => {
    installFetch({
      '/api/v1/mesh/nodes': () =>
        json({
          success: true,
          nodes: [
            { nodeId: 'node-us-virginia', region: 'US', jurisdiction: 'US-East', latencyFactorMs: 18 },
            { nodeId: 'node-eu-frankfurt', region: 'EU', jurisdiction: 'EU-Central', latencyFactorMs: 42 },
          ],
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const nodesBtn = screen.getByRole('button', { name: /🌐 Mesh Nodes/i });
    expect(nodesBtn).toBeInTheDocument();

    await user.click(nodesBtn);
    expect(await screen.findByText(/Mesh Nodes: 2 topology node\(s\) registered/i)).toBeInTheDocument();
    expect(screen.getByText(/Regions: US, EU/i)).toBeInTheDocument();
    expect(screen.getByText(/Avg Latency Factor: 30ms/i)).toBeInTheDocument();
    expect(screen.getByText(/mesh node topology audits simulated multi-region endpoints, not live WAN reachability/i)).toBeInTheDocument();
  });

  it('observes Mesh Validation and displays simulated convergence telemetry without asserting external consensus', async () => {
    installFetch({
      '/api/v1/mesh/validate?siliconYield=0.99&gridLoadMegawatts=420&acceleratorInventory=8000': () =>
        json({
          success: true,
          telemetry: {
            uuid: '7b2b19c3-3868-4b3b-b98e-3f2c30817cca',
            timestamp: '2026-11-21T19:52:22.979Z',
            siliconYield: 0.99,
            gridLoadMegawatts: 420,
            acceleratorInventory: 8000,
          },
          validation: {
            ledger: { intact: true, scope: 'local SQLite hash-chain recomputation' },
            mesh: {
              effectiveStatus: 'CONVERGED_PLURAL',
              quorumReached: true,
              participatingNodes: 4,
              pluralismTriggered: true,
            },
            receipt: {
              observationId: '7b2b19c3-3868-4b3b-b98e-3f2c30817cca',
              verifiedAt: '2026-11-21T19:52:22.980Z',
              status: 'DIVERGENT',
              passedPredicates: [],
              failedPredicates: [],
              digest: 'a3aa7dea409c93ac23e41f3692aa28ebe30a279a964c9200e15cbca0ec460469',
            },
          },
          evidenceBoundary: 'regional convergence is simulated local evidence; it is not external consensus, deployment proof, or truth attestation',
          convergence: {
            consensusRound: 'round-1795290742980-8eceafc4',
            quorumReached: true,
            pluralismTriggered: true,
            participatingNodes: 4,
            votes: [],
            effectiveStatus: 'CONVERGED_PLURAL',
            clusterSignatureProof: '711d1ef22c4ee6d705825401274b6b0076d5ba329be950b9ed3ae12ce28dd7e3',
            timestamp: '2026-11-21T19:52:22.980Z',
          },
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const validateBtn = screen.getByRole('button', { name: /⚡ Mesh Validation/i });
    expect(validateBtn).toBeInTheDocument();

    await user.click(validateBtn);
    expect(await screen.findByText(/Mesh Validation: Quorum REACHED/i)).toBeInTheDocument();
    expect(screen.getByText(/Status: CONVERGED_PLURAL/i)).toBeInTheDocument();
    expect(screen.getByText(/Nodes: 4/i)).toBeInTheDocument();
    expect(screen.getByText(/Receipt: DIVERGENT/i)).toBeInTheDocument();
    expect(screen.getByText(/regional convergence is simulated local evidence; it is not external consensus, deployment proof, or truth attestation/i)).toBeInTheDocument();
  });

  it('observes Living Charter BPE tokenization compression without asserting opaque embedding', async () => {
    installFetch({
      '/api/v1/tokenizer/charter': () =>
        json({
          success: true,
          status: 'VERIFIED',
          charter: {
            constitution: 'Receive. Hold. Clarify. Connect. Adapt. Nourish. Restore. Flow. Return Better.',
            law: 'Living Platform-Agnostic Byte-Pair Encoding',
          },
          tokenization: {
            originalByteLength: 395,
            compressedTokenLength: 298,
            compressionRatio: 1.33,
            vocabSize: 272,
            mergesCount: 16,
            topMerges: [],
          },
          evidenceBoundary: 'tokenization is transparent byte-pair compression, not opaque embedding',
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const bpeBtn = screen.getByRole('button', { name: /🧬 Charter BPE/i });
    expect(bpeBtn).toBeInTheDocument();

    await user.click(bpeBtn);
    expect(await screen.findByText(/Living Charter BPE: Compression 1.33x/i)).toBeInTheDocument();
    expect(screen.getByText(/395B ➔ 298 tokens/i)).toBeInTheDocument();
    expect(screen.getByText(/Merges: 16/i)).toBeInTheDocument();
    expect(screen.getByText(/Receive. Hold. Clarify. Connect. Adapt. Nourish. Restore. Flow. Return Better./i)).toBeInTheDocument();
    expect(screen.getByText(/tokenization is transparent byte-pair compression, not opaque embedding/i)).toBeInTheDocument();
  });

  it('observes Composio Gateway read connector observation without asserting write authorization', async () => {
    installFetch({
      '/api/v1/omega/composio/read': () =>
        json({
          success: true,
          status: 'NOT_EXECUTED',
          toolSlug: 'GITHUB_GET_A_REPOSITORY',
          toolkit: 'github',
          result: null,
          evidenceHash: null,
          observation: {
            admission: {
              decision: 'DENY',
              admitted: false,
              issues: ['connector authority evidence is missing'],
            },
            status: 'NOT_EXECUTED',
            authorized: false,
            executed: false,
            observed: false,
            expectedObservation: 'Provider result independently reconciled against a declared expected state.',
            evidence: 'sha256:4ffb6fba28023235d9d9f507b021ef08c2c3935e3da4ae96b8b507f435a06ca2',
            issues: ['connector is not admitted; execution is refused'],
            observedAt: '2026-11-21T21:19:26.940Z',
            verificationScope: 'admitted-connector-observation-only',
          },
          journal: {
            sequence: 1,
            hash: 'e58cf16dc61296a1de238a8e590bc6f5db71aa60db5f8724b35bc86a98f6a966',
            limitation: 'local-hash-chain-is-not-deployment-health-or-live-github',
          },
          limitation: 'A Composio response is an observation only. This route does not independently verify provider data or authorize write actions.',
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const composioBtn = screen.getByRole('button', { name: /🔌 Composio Gateway/i });
    expect(composioBtn).toBeInTheDocument();

    await user.click(composioBtn);
    expect(await screen.findByText(/Composio Gateway: Toolkit github/i)).toBeInTheDocument();
    expect(screen.getByText(/Tool GITHUB_GET_A_REPOSITORY/i)).toBeInTheDocument();
    expect(screen.getByText(/Status: NOT_EXECUTED/i)).toBeInTheDocument();
    expect(screen.getByText(/Admission: DENY/i)).toBeInTheDocument();
    expect(screen.getByText(/Journal #1/i)).toBeInTheDocument();
    expect(screen.getByText(/A Composio response is an observation only; this route does not independently verify provider data or authorize write actions/i)).toBeInTheDocument();
  });

  it('observes Reality Vector status vector without claiming deployment or health', async () => {
    installFetch({
      '/api/v1/reality/status': () =>
        json({
          success: true,
          contract: {
            name: 'omega-v-oceanicos',
            version: '1.0.0',
            schemaVersion: '1',
            growthLaw: '0 → MINI → + → + → FULL STACK → ECOSYSTEM → REALITY ↺ ∞',
            currentStage: 'REALITY',
            invariant: 'VERIFY(ΔREALITY)',
            governingEquation: 'Ω∞v := VERIFY(ΔREALITY)',
            evaluatedAt: '2026-11-21T23:01:58.301Z',
          },
          statusVector: [
            { field: 'declared', value: 'YES', evidence: 'contracts exist', provenance: 'CHARTER.md', scope: 'design-contract' },
            { field: 'represented', value: 'YES', evidence: 'compiled', provenance: 'packages/types', scope: 'local-codebase' },
            { field: 'implemented', value: 'YES', evidence: 'running', provenance: 'apps/api', scope: 'local-runtime' },
            { field: 'tested', value: 'YES', evidence: 'tests exist', provenance: 'tests/integration', scope: 'local-contract' },
            { field: 'admitted', value: 'UNKNOWN', evidence: 'no command in gate', provenance: 'command store', scope: 'runtime-state' },
            { field: 'executed', value: 'UNKNOWN', evidence: 'no transition running', provenance: 'executor', scope: 'runtime-state' },
            { field: 'observed', value: 'UNKNOWN', evidence: 'no observation running', provenance: 'observer', scope: 'runtime-state' },
            { field: 'verified', value: 'YES', evidence: 'ledger tip verified', provenance: 'ledger', scope: 'local-runtime' },
            { field: 'attested', value: 'UNKNOWN', evidence: 'key not set', provenance: 'OMEGA_SIGNING_KEY', scope: 'local-runtime' },
            { field: 'deployed', value: 'UNKNOWN', evidence: 'no deployment target', provenance: 'not established', scope: 'not-executed' },
            { field: 'healthy', value: 'UNKNOWN', evidence: 'no deployed target', provenance: 'not established', scope: 'not-executed' },
          ],
          realityAuthority: {
            principle: 'Reality is final authority. Attest, do not assert.',
            humanAgency: 'Human beings remain the source of consequential intent.',
            aiBound: 'AI agents are bounded capabilities only.',
            failClosed: true,
          },
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const realityBtn = screen.getByRole('button', { name: /📡 Reality Vector/i });
    expect(realityBtn).toBeInTheDocument();

    await user.click(realityBtn);
    expect(await screen.findByText(/Reality Vector: Stage REALITY \(VERIFY\(ΔREALITY\)\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Vector: 5\/11 YES, 6\/11 UNKNOWN/i)).toBeInTheDocument();
    expect(screen.getByText(/Principle: "Reality is final authority\. Attest, do not assert\."/i)).toBeInTheDocument();
  });

  it('observes Fastify gateway companion voice route and preserves One Identity Rule at 432Hz', async () => {
    installFetch({
      '/api/v1/companion/voice': () =>
        json({
          success: true,
          status: 'VERIFIED',
          schema: 'omega.voice-bridge.v1',
          rule: 'ONE_IDENTITY_RULE',
          service: 'voice-bridge',
          port: 8088,
          organs: {
            soul_ai: 'Architecture · Sacred Blueprint Hammer',
            truth_weaver: 'Verification · KAI Shield & Empirical Magnifier',
            the_general: 'Execution · Compass & Direction Spear',
            human_root: 'Authority · The Golden Key',
          },
          resonance: {
            frequencyHz: 432,
            mode: 'harmonic-pure',
            doctrine: "Attest, don't assert. Reality remains the final authority.",
          },
          sha256: '0e8c783c0d385e15681e6a6a784a0ee1c4f22b9c922122c36452341ad207a661',
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const voiceBtn = screen.getByRole('button', { name: /🎙️ Voice Bridge \(432Hz\)/i });
    expect(voiceBtn).toBeInTheDocument();

    await user.click(voiceBtn);
    expect(await screen.findByText(/Voice Bridge Harmonic Resonance active at 432Hz/i)).toBeInTheDocument();
    expect(screen.getByText(/Rule: ONE_IDENTITY_RULE/i)).toBeInTheDocument();
    expect(screen.getByText(/Soul AI/i)).toBeInTheDocument();
    expect(screen.getByText(/Doctrine: "Attest, don't assert\. Reality remains the final authority\."/i)).toBeInTheDocument();
  });

  it('dispatches a reality tool and shows the verified execution receipt with evidence seal', async () => {
    installFetch({
      '/api/v1/reality/dispatch': () =>
        json({
          success: true,
          status: 'VERIFIED',
          dispatch: {
            toolId: 'tool-microvm-sandbox',
            dispatchId: 'disp-e48f72a101',
            evidenceHash: 'e48f72a101d29c384a75e219fb09c8e1471029c914bf681920ac3415ef8214bb',
            executionStatus: 'COMPLETED_VERIFIED',
            authority: 'SOVEREIGN_DISPATCH',
            doctrine: "ATTEST, DON'T ASSERT. Expected ≡ Observed. Reality remains the final authority.",
            outcome: {
              invoked: 'tool-microvm-sandbox',
              params: { target: 'bounded-execution-check' },
              verifiedAt: '2026-11-22T00:00:00.000Z',
              details: 'Autonomous execution verified under local custody with evidence seal e48f72a101...',
            },
          },
          timestamp: '2026-11-22T00:00:00.000Z',
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const dispatchBtn = screen.getByRole('button', { name: /⚡ Dispatch Tool/i });
    expect(dispatchBtn).toBeInTheDocument();

    await user.click(dispatchBtn);
    expect(await screen.findByText(/Reality Tool Dispatched: tool-microvm-sandbox/i)).toBeInTheDocument();
    expect(screen.getByText(/COMPLETED_VERIFIED/i)).toBeInTheDocument();
    expect(screen.getByText(/SOVEREIGN_DISPATCH/i)).toBeInTheDocument();
    expect(screen.getByText(/e48f72a101d29c38/i)).toBeInTheDocument();
  });

  it('orchestrates a multi-tool continuum pipeline and shows the chained cryptographic receipt', async () => {
    installFetch({
      '/api/v1/reality/orchestrate': () =>
        json({
          success: true,
          status: 'VERIFIED',
          orchestration: {
            orchestrationId: 'orch-f49c01de2b',
            pipelineName: 'Sovereign Reality Continuum Pipeline',
            totalStages: 3,
            completedStages: 3,
            chainSeal: 'f49c01de2bc14a589e18b4501a2cf901768412e098dfc381a941b27e8a914c62',
            stages: [
              { stageIndex: 0, toolId: 'tool-voice-acoustic', stageEvidenceHash: 'a1b2c3d4...', status: 'VERIFIED' },
              { stageIndex: 1, toolId: 'tool-svg-tensor-canvas', stageEvidenceHash: 'b2c3d4e5...', status: 'VERIFIED' },
              { stageIndex: 2, toolId: 'tool-dav-tensor-validator', stageEvidenceHash: 'c3d4e5f6...', status: 'VERIFIED' },
            ],
            authority: 'SOVEREIGN_ORCHESTRATION',
            doctrine: "ATTEST, DON'T ASSERT. Expected ≡ Observed. Reality remains the final authority.",
          },
          timestamp: '2026-11-22T00:00:00.000Z',
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const orchBtn = screen.getByRole('button', { name: /🧬 Orchestrate Reality/i });
    expect(orchBtn).toBeInTheDocument();

    await user.click(orchBtn);
    expect(await screen.findByText(/Reality Continuum Orchestrated: Sovereign Reality Continuum Pipeline/i)).toBeInTheDocument();
    expect(screen.getByText(/3\/3 stages VERIFIED/i)).toBeInTheDocument();
    expect(screen.getByText(/SOVEREIGN_ORCHESTRATION/i)).toBeInTheDocument();
    expect(screen.getByText(/f49c01de2bc14a58/i)).toBeInTheDocument();
  });

  it('executes live continuum pipeline across house and verifies multi-artifact bundle seal', async () => {
    installFetch({
      '/api/v1/reality/pipeline/execute': () =>
        json({
          success: true,
          status: 'VERIFIED',
          execution: {
            executionId: 'exec-8b29c1da40',
            totalStages: 3,
            completedStages: 3,
            bundleSeal: '8b29c1da40f73b1a8d92ef0182c19a4e761042df98c1a2e389b41a7d6e5201c4',
            stages: [
              { stageIndex: 0, toolId: 'tool-voice-acoustic', executionStatus: 'VERIFIED', artifactSummary: 'Harmonic 432Hz sine PCM waveform synthesized' },
              { stageIndex: 1, toolId: 'tool-svg-tensor-canvas', executionStatus: 'VERIFIED', artifactSummary: 'Deterministic SVG Canvas 4x4x4x4 projected' },
              { stageIndex: 2, toolId: 'tool-dav-tensor-validator', executionStatus: 'VERIFIED', artifactSummary: 'DAV Hypercube Checksum 57,344 verified' },
            ],
            artifacts: {
              voice: { frequencyHz: 432, status: 'VERIFIED' },
              svg: { checksum: 57344, status: 'VERIFIED' },
              tensor: { checksum: 57344, invariant: 'VERIFIED' },
            },
            authority: 'SOVEREIGN_LIVE_EXECUTION',
            doctrine: "ATTEST, DON'T ASSERT. Expected ≡ Observed. Reality remains the final authority.",
          },
          timestamp: '2026-11-22T00:00:00.000Z',
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const execBtn = screen.getByRole('button', { name: /⚡ Execute Pipeline/i });
    expect(execBtn).toBeInTheDocument();

    await user.click(execBtn);
    expect(await screen.findByText(/Reality Continuum Pipeline Executed: 3\/3 stages completed/i)).toBeInTheDocument();
    expect(screen.getByText(/SOVEREIGN_LIVE_EXECUTION/i)).toBeInTheDocument();
    expect(screen.getByText(/8b29c1da40f73b1a/i)).toBeInTheDocument();
  });

  it('subscribes the pipeline canvas to a bounded EventSource sample', async () => {
    const listeners = new Map<string, Array<(event: MessageEvent) => void>>();
    class FakeEventSource {
      url: string;
      onerror: (() => void) | null = null;
      constructor(url: string) {
        this.url = url;
        queueMicrotask(() => {
          const emit = (type: string, data: unknown) => {
            const event = { data: JSON.stringify(data) } as MessageEvent;
            for (const listener of listeners.get(type) ?? []) listener(event);
          };
          emit('frame', { frameIndex: 0, nominalFps: 30, continuous: false });
          emit('seal', {
            frames: 1,
            nominalFps: 30,
            continuous: false,
            bundleSeal: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            status: 'VERIFIED',
          });
        });
      }
      addEventListener(type: string, listener: (event: MessageEvent) => void) {
        const list = listeners.get(type) ?? [];
        list.push(listener);
        listeners.set(type, list);
      }
      close() {}
    }
    const previous = globalThis.EventSource;
    globalThis.EventSource = FakeEventSource as unknown as typeof EventSource;
    try {
      const user = userEvent.setup();
      render(<VibeOS />);
      await user.click(screen.getByRole('button', { name: /Subscribe pipeline canvas/i }));
      expect(await screen.findByText(/Pipeline canvas subscribed: 1\/1 frames at nominal 30fps/i)).toBeInTheDocument();
      expect(screen.getByText(/not a continuous camera/i)).toBeInTheDocument();
      expect(screen.getByText(/aaaaaaaaaaaaaaaa/i)).toBeInTheDocument();
    } finally {
      globalThis.EventSource = previous;
    }
  });

  it('fetches the sovereign reality status dashboard and shows tool health chain seal', async () => {
    installFetch({
      '/api/v1/reality/tools/status': () =>
        json({
          success: true,
          status: 'VERIFIED',
          dashboard: {
            platform: 'ΔVRØ HOUSE × Ω∞v OCEANICOS — REALITY STATUS DASHBOARD',
            doctrine: "ATTEST, DON'T ASSERT. Expected ≡ Observed. Reality remains the final authority.",
            totalTools: 8,
            healthyTools: 8,
            chainSeal: 'c0de5afe1234567890abcdef1234567890abcdef1234567890abcdef12345678',
            integrityCheck: { status: 'VERIFIED', bundleSeal: 'deadbeef01234567' },
            tools: [],
            authority: 'SOVEREIGN_REALITY_STATUS',
          },
          timestamp: '2026-11-22T00:00:00.000Z',
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const statusBtn = screen.getByRole('button', { name: /📊 Reality Tools Status/i });
    expect(statusBtn).toBeInTheDocument();

    await user.click(statusBtn);
    expect(await screen.findByText(/Reality Status Dashboard VERIFIED: 8\/8 tools healthy/i)).toBeInTheDocument();
    expect(screen.getByText(/SOVEREIGN_REALITY_STATUS/i)).toBeInTheDocument();
    expect(screen.getByText(/c0de5afe12345678/i)).toBeInTheDocument();
  });

  it('observes sovereign reality tools circuit breaker state without trip', async () => {
    installFetch({
      '/api/v1/reality/tools/circuit-breaker': () =>
        json({
          success: true,
          status: 'VERIFIED',
          circuitBreaker: {
            status: 'ARMED',
            tripsCount: 0,
            activeBreakers: [],
            chainSeal: 'b4ca771c99887766554433221100ffeeddccbbaa0099887766554433221100ff',
            authority: 'SOVEREIGN_CIRCUIT_BREAKER',
          },
          timestamp: '2026-11-23T00:00:00.000Z',
        }),
    });
    const user = userEvent.setup();
    render(<VibeOS />);

    const breakerBtn = screen.getByRole('button', { name: /🛡️ Circuit Breaker/i });
    expect(breakerBtn).toBeInTheDocument();

    await user.click(breakerBtn);
    expect(await screen.findByText(/Reality Circuit Breaker VERIFIED: ARMED/i)).toBeInTheDocument();
    expect(screen.getByText(/SOVEREIGN_CIRCUIT_BREAKER/i)).toBeInTheDocument();
    expect(screen.getByText(/b4ca771c99887766/i)).toBeInTheDocument();
  });
});

