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
});
