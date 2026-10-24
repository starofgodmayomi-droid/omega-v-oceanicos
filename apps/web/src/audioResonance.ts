/**
 * 🌊 OceanicOS 432 Hz Harmonic Resonance Sound Engine
 *
 * Implements pure Web Audio API synthesis for the 432 Hz universal water resonance.
 * Fail-safe: runs entirely client-side, zero external assets, graceful degradation
 * if AudioContext is unavailable or blocked by autoplay policies.
 */

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      audioCtx = new AudioCtx();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isAudioEnabled(): boolean {
  return soundEnabled;
}

export function setAudioEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}

export function toggleAudio(): boolean {
  soundEnabled = !soundEnabled;
  return soundEnabled;
}

/**
 * 432 Hz Transmit Pulse — soft rising sine chime on intent dispatch
 */
export function playTransmitPulse(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(432, now);
    osc.frequency.exponentialRampToValueAtTime(864, now + 0.18);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.23);
  } catch {
    // Fail-closed: audio failure never interrupts UI logic
  }
}

/**
 * 432 Hz Harmonic Receive Pulse — triad chord (432 Hz, 540 Hz, 648 Hz) on AI response start
 */
export function playReceivePulse(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const frequencies = [432, 540, 648]; // Root, major third, perfect fifth in 432 harmonic tuning

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);

      const start = now + i * 0.04;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.025 / frequencies.length, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.36);
    });
  } catch {
    // Fail-closed
  }
}

/**
 * 432 Hz Verification Seal Chime — resonant glissando when cryptographic proof seals
 */
export function playVerificationPulse(): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.exponentialRampToValueAtTime(864, now + 0.15);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.29);
  } catch {
    // Fail-closed
  }
}
