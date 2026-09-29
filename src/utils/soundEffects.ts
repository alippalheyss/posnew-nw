// Audio synthesizer using Web Audio API for POS barcode scanning feedback
// Zero external assets required, instant offline response, low latency.

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Plays a crisp, pleasant high-frequency double-tone chime
 * Indicating a barcode was recognized and the product was successfully added to cart.
 */
export function playScanSuccessSound(volume: number = 0.35) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // First tone (1200 Hz, crisp initial ping)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1200, now);
    gain1.gain.setValueAtTime(volume * 0.8, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.08);

    // Second tone (1760 Hz, bright resonant confirmation)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1760, now + 0.06);
    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.setValueAtTime(volume, now + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.06);
    osc2.stop(now + 0.18);
  } catch (err) {
    console.warn('Audio playback error (success sound):', err);
  }
}

/**
 * Plays a distinct, low-frequency double buzz
 * Indicating the scanned barcode does not match any product in inventory.
 */
export function playScanErrorSound(volume: number = 0.4) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Pulse 1: Low warning buzz (220 Hz sawtooth)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(220, now);
    gain1.gain.setValueAtTime(volume * 0.7, now);
    gain1.gain.linearRampToValueAtTime(0.01, now + 0.11);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.11);

    // Pulse 2: Lower alert buzz (165 Hz sawtooth)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(165, now + 0.14);
    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.setValueAtTime(volume, now + 0.14);
    gain2.gain.linearRampToValueAtTime(0.01, now + 0.28);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.28);
  } catch (err) {
    console.warn('Audio playback error (error sound):', err);
  }
}
