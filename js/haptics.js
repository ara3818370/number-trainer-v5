// haptics.js — Haptic feedback patterns via Vibration API
// Steve Edition: Complementary to sound, not redundant

// ── State ──────────────────────────────────────────────────────────────────

/** @type {boolean} */
let enabled = true;

/** @type {boolean} */
const supported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

// ── Preferences ────────────────────────────────────────────────────────────

const STORAGE_KEY = 'nlt-haptics';

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

// ── Internal ───────────────────────────────────────────────────────────────

/**
 * Fire a vibration pattern if supported and enabled.
 * @param {number|number[]} pattern
 */
function vibrate(pattern) {
  if (!enabled || !supported) return;
  try {
    navigator.vibrate(pattern);
  } catch { /* ignore */ }
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Correct answer haptic: light, crisp tap.
 */
export function hapticCorrect() {
  vibrate(10);
}

/**
 * Wrong answer haptic: deeper, two-pulse warning.
 */
export function hapticWrong() {
  vibrate([15, 30, 15]);
}

/**
 * Session complete haptic: celebration pattern.
 */
export function hapticComplete() {
  vibrate([10, 50, 10, 50, 30]);
}

/**
 * Streak milestone haptic: quick flutter.
 */
export function hapticStreak() {
  vibrate([5, 20, 5]);
}

/**
 * Enable or disable haptics.
 * @param {boolean} on
 */
export function setHapticsEnabled(on) {
  enabled = !!on;
  savePreference();
}

/**
 * Check if haptics are currently enabled.
 * @returns {boolean}
 */
export function isHapticsEnabled() {
  return enabled;
}

/**
 * Check if the device supports vibration.
 * @returns {boolean}
 */
export function isSupported() {
  return supported;
}
