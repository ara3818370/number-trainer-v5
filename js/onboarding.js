// onboarding.js — Experiential onboarding (first launch only)
// Number Trainer v5 "Steve Edition"
//
// Flow: one easy question, 2 options, never shown again.
// Drives the same UI as training but simplified.

import { isOnboardingDone, setOnboardingDone } from './progress.js';
import { getLearnLang } from './i18n.js';

// ── Onboarding questions per language ──────────────────────────────────────

const ONBOARDING_DATA = {
  en: { value: 7, ttsText: 'seven', display: '7', distractor: '4', distractorDisplay: '4' },
  de: { value: 3, ttsText: 'drei', display: '3', distractor: '8', distractorDisplay: '8' },
  uk: { value: 5, ttsText: "п'ять", display: '5', distractor: '9', distractorDisplay: '9' },
};

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Check if onboarding should be shown.
 * @returns {boolean}
 */
export function shouldShowOnboarding() {
  return !isOnboardingDone();
}

/**
 * Run the experiential onboarding flow.
 *
 * @param {Object} callbacks
 * @param {function(string): Promise<void>} callbacks.onPlay - Play TTS for the given text, returns when done
 * @param {function(Array<{display: string, value: number}>, boolean): void} callbacks.onShowOptions
 *   - Show option buttons. Array of {display, value}, boolean = isCorrectIndex (0 or 1)
 * @param {function(boolean, number): Promise<void>} callbacks.onResult
 *   - Called with (isCorrect, correctIndex). Should show feedback, returns after hold.
 * @param {function(): void} callbacks.onComplete - Called when onboarding is done
 * @returns {{question: Object, correctIndex: number, start: function(): void}}
 */
export function runOnboarding(callbacks) {
  const lang = getLearnLang();
  const q = ONBOARDING_DATA[lang] || ONBOARDING_DATA.en;

  // Randomize correct position (0 or 1)
  const correctIndex = Math.random() < 0.5 ? 0 : 1;

  const options = correctIndex === 0
    ? [
        { display: q.display, value: q.value },
        { display: q.distractorDisplay, value: parseInt(q.distractor) },
      ]
    : [
        { display: q.distractorDisplay, value: parseInt(q.distractor) },
        { display: q.display, value: q.value },
      ];

  return {
    question: q,
    correctIndex,
    options,

    /**
     * Start the onboarding sequence.
     * Async — completes when the entire flow is done.
     */
    async start() {
      // 1. Brief pause, then play audio
      await delay(1000);
      await callbacks.onPlay(q.ttsText);

      // 2. Contemplation pause (600ms) then show 2 options
      await delay(600);
      callbacks.onShowOptions(options, correctIndex);

      // 3. Wait for user to tap — callbacks.onResult handles this
      // The app.js wires the option click to call handleOnboardingAnswer
    },
  };
}

/**
 * Process the onboarding answer.
 * @param {boolean} isCorrect
 * @param {Object} callbacks - same as runOnboarding callbacks
 * @returns {Promise<void>}
 */
export async function handleOnboardingAnswer(isCorrect, callbacks) {
  if (isCorrect) {
    // Show feedback, wait
    await callbacks.onResult(true);
    await delay(800);
  } else {
    // Show feedback with correct highlighted, replay audio
    await callbacks.onResult(false);
    await delay(1200);
  }

  // Mark onboarding done
  setOnboardingDone();

  // Final pause then transition
  await delay(1500);
  callbacks.onComplete();
}

// ── Helpers ────────────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
