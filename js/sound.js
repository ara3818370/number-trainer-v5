// sound.js — Procedural sound design using Web Audio API
// Steve Edition: Zero external files, all synthesized

// ── State ──────────────────────────────────────────────────────────────────

const AudioCtx = typeof window !== 'undefined'
  ? (window.AudioContext || window.webkitAudioContext)
  : null;

/** @type {AudioContext|null} */
let audioCtx = null;

/** @type {boolean} */
let enabled = true;

// ── Preferences ────────────────────────────────────────────────────────────

const STORAGE_KEY = 'nlt-sounds';

function loadPreference() {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === 'off') enabled = false;
    else enabled = true;
  } catch { /* ignore */ }
}

function savePreference() {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch { /* ignore */ }
}

// Load on module init
if (typeof localStorage !== 'undefined') loadPreference();

// ── AudioContext management ────────────────────────────────────────────────

/**
 * Get or lazily create the AudioContext.
 * Must be called from a user gesture context on first use.
 * @returns {AudioContext|null}
 */
function getCtx() {
  if (!AudioCtx) return null;
  if (!audioCtx) {
    audioCtx = new AudioCtx();
  }
  // Resume if suspended (happens after page load without interaction)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// ── Tone synthesis ─────────────────────────────────────────────────────────

/**
 * Play a single procedural tone.
 * @param {number} freq - Frequency in Hz
 * @param {number} attackMs - Attack time in ms
 * @param {number} sustainMs - Sustain time in ms
 * @param {number} releaseMs - Release time in ms
 * @param {number} volume - Peak gain (0-1)
 * @param {number} [startOffset=0] - Delay from now in seconds
 */
function playTone(freq, attackMs, sustainMs, releaseMs, volume, startOffset = 0) {
  const ctx = getCtx();
  if (!ctx) return;

  const now = ctx.currentTime + startOffset;
  const attack = attackMs / 1000;
  const sustain = sustainMs / 1000;
  const release = releaseMs / 1000;
  const totalDuration = attack + sustain + release;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.value = freq;

  // Envelope: silence → attack → sustain → release
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + attack);
  gain.gain.setValueAtTime(volume, now + attack + sustain);
  gain.gain.exponentialRampToValueAtTime(0.001, now + totalDuration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + totalDuration + 0.01);
}

// ── Note frequencies ───────────────────────────────────────────────────────

const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const A3 = 220;

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Play correct answer chime: C5, attack 10ms, sustain 50ms, release 140ms, vol 0.15
 */
export function playCorrect() {
  if (!enabled) return;
  playTone(C5, 10, 50, 140, 0.15);
}

/**
 * Play wrong answer tone: A3, attack 10ms, sustain 80ms, release 110ms, vol 0.10
 */
export function playWrong() {
  if (!enabled) return;
  playTone(A3, 10, 80, 110, 0.10);
}

/**
 * Play session complete fanfare: C5→E5→G5, each 100ms, 100ms gaps, vol 0.12
 */
export function playComplete() {
  if (!enabled) return;
  const noteDur = 100; // ms total per note (10 attack + 40 sustain + 50 release)
  const gapSec = 0.1;  // 100ms between note starts = 200ms spacing
  playTone(C5, 10, 40, 50, 0.12, 0);
  playTone(E5, 10, 40, 50, 0.12, (noteDur / 1000) + gapSec);
  playTone(G5, 10, 40, 50, 0.12, ((noteDur / 1000) + gapSec) * 2);
}

/**
 * Play streak milestone arpeggio: C5→E5→G5, 50ms each, no gaps, vol 0.08
 */
export function playStreak() {
  if (!enabled) return;
  const noteSec = 0.05;
  playTone(C5, 5, 20, 25, 0.08, 0);
  playTone(E5, 5, 20, 25, 0.08, noteSec);
  playTone(G5, 5, 20, 25, 0.08, noteSec * 2);
}

/**
 * Enable or disable sounds.
 * @param {boolean} on
 */
export function setSoundsEnabled(on) {
  enabled = !!on;
  savePreference();
}

/**
 * Check if sounds are currently enabled.
 * @returns {boolean}
 */
export function isSoundsEnabled() {
  return enabled;
}

/**
 * Ensure AudioContext is created (call from a user gesture).
 * Useful for iOS which requires user interaction to create AudioContext.
 */
export function ensureContext() {
  getCtx();
}
