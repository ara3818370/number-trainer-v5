// game.js — Thin state manager for Number Trainer v5
// PURE DATA MODULE: no DOM, no audio, no side effects
// All UI, TTS, sound, haptics are driven by app.js (the orchestrator)

import { getGenerator, getSentence } from './categories.js';
import { generateConfusers } from './confuser.js';

// ── Session state ──────────────────────────────────────────────────────────

let state = {
  categoryId: 'cardinals',
  round: 0,
  correct: 0,
  total: 0,
  currentTarget: null,
  currentSentence: '',
  currentOptions: [],   // Full CategoryValue objects (shuffled)
  answered: false,
  streak: 0,
  maxStreak: 0,
  startTime: 0,
  active: false,
};

// ── Shuffle utility ────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Start a new training session. Resets all state.
 * @param {string} categoryId - Category mode (e.g. 'cardinals', 'years')
 */
export function startSession(categoryId) {
  state = {
    categoryId,
    round: 0,
    correct: 0,
    total: 0,
    currentTarget: null,
    currentSentence: '',
    currentOptions: [],
    answered: false,
    streak: 0,
    maxStreak: 0,
    startTime: Date.now(),
    active: true,
  };
}

/**
 * Generate next round data. Pure data, no side effects.
 * @returns {{ target: object, options: string[], sentence: string } | null}
 */
export function generateQuestion() {
  if (!state.active) return null;

  const generator = getGenerator(state.categoryId);
  const target = generator.generate();
  const confusers = generateConfusers(target);
  const sentence = getSentence(target);
  const allItems = shuffle([target, ...confusers]);

  state.round++;
  state.currentTarget = target;
  state.currentSentence = sentence;
  state.currentOptions = allItems;
  state.answered = false;

  return {
    target,
    options: allItems.map(o => o.display),
    sentence,
  };
}

// Keep nextRound as alias for backward compatibility
export const nextRound = generateQuestion;

/**
 * Record an answer. Updates score, streak. Pure state update.
 * @param {string} selectedDisplay - The display string the user chose
 * @returns {{ isCorrect: boolean, correctIndex: number, streak: number, maxStreak: number, score: number, total: number } | null}
 */
export function recordAnswer(selectedDisplay) {
  if (!state.active || state.answered) return null;
  state.answered = true;

  const isCorrect = selectedDisplay === state.currentTarget.display;
  const correctIndex = state.currentOptions.findIndex(
    o => o.display === state.currentTarget.display
  );

  if (isCorrect) {
    state.correct++;
    state.streak++;
    if (state.streak > state.maxStreak) state.maxStreak = state.streak;
  } else {
    state.streak = 0;
  }
  state.total++;

  return {
    isCorrect,
    correctIndex,
    streak: state.streak,
    maxStreak: state.maxStreak,
    score: state.correct,
    total: state.total,
  };
}

// Keep submitAnswer as alias for backward compatibility
export const submitAnswer = recordAnswer;

/**
 * Check if session should end.
 * @param {number} sessionLength - Target number of questions (Infinity for endless)
 * @returns {boolean}
 */
export function isSessionComplete(sessionLength) {
  if (sessionLength === Infinity) return false;
  return state.total >= sessionLength;
}

/**
 * Get full session stats.
 * @returns {object}
 */
export function getSessionStats() {
  const percent = state.total > 0 ? Math.round((state.correct / state.total) * 100) : 0;
  return {
    correct: state.correct,
    total: state.total,
    percent,
    categoryId: state.categoryId,
    maxStreak: state.maxStreak,
    timeMs: Date.now() - state.startTime,
    round: state.round,
  };
}

/**
 * Stop the current session.
 */
export function stopSession() {
  state.active = false;
}

// Alias
export const endSession = stopSession;

// ── Getters (read-only access to current state) ───────────────────────────

export function getCurrentSentence() { return state.currentSentence; }
export function getCurrentTarget() { return state.currentTarget; }
export function isActive() { return state.active; }
export function getStreak() { return { current: state.streak, max: state.maxStreak }; }
export function getScore() {
  const percent = state.total > 0 ? Math.round((state.correct / state.total) * 100) : 0;
  return { correct: state.correct, total: state.total, percent };
}
export function getRound() { return state.round; }
