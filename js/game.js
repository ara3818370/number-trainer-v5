// game.js — Steve Edition: The training loop IS the product
// Complete rewrite: contemplation pause, staggered options, streak system,
// reinforcement TTS, session events, correct/wrong flows with precise timing

import { getGenerator, getSentence } from './categories.js';
import { generateConfusers } from './confuser.js';
import { speak, speakReinforcement, isReadingMode, stop as stopTTS } from './tts.js';
import { playCorrect, playWrong, playComplete, playStreak, ensureContext as ensureSoundContext } from './sound.js';
import { hapticCorrect, hapticWrong, hapticComplete, hapticStreak } from './haptics.js';
import {
  showOptionsStaggered, hideOptions,
  showCorrectFeedback, showWrongFeedback, clearFeedback,
  updateStreakDisplay, updateProgress,
  pulseCircle, warmCircle, bloomCircle,
  transitionToSummary,
  initBreathingCircle,
} from './ui.js';

// ── Constants ──────────────────────────────────────────────────────────────

/** Time after audio ends before options appear (ms) */
const CONTEMPLATION_PAUSE_MS = 600;

/** Delay between each option appearing (ms) */
const OPTION_STAGGER_MS = 100;

/** Total hold time after correct answer before next question (ms) */
const CORRECT_HOLD_MS = 1200;

/** Total hold time after wrong answer before next question (ms) */
const WRONG_HOLD_MS = 1800;

/** Delay after feedback animation before reinforcement TTS (ms) */
const REINFORCEMENT_DELAY_MS = 200;

/** Streak thresholds that trigger effects */
const STREAK_THRESHOLDS = [3, 5, 10, 15, 20, 25, 30];

// ── Event system ───────────────────────────────────────────────────────────

/** @type {Map<string, Set<Function>>} */
const listeners = new Map();

/**
 * Register an event listener.
 * @param {string} event
 * @param {Function} fn
 */
export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
}

/**
 * Remove an event listener.
 * @param {string} event
 * @param {Function} fn
 */
export function off(event, fn) {
  if (listeners.has(event)) listeners.get(event).delete(fn);
}

/**
 * Emit an event.
 * @param {string} event
 * @param {*} data
 */
function emit(event, data) {
  if (listeners.has(event)) {
    for (const fn of listeners.get(event)) {
      try { fn(data); } catch (e) { console.error(`Event handler error [${event}]:`, e); }
    }
  }
}

// ── Session state ──────────────────────────────────────────────────────────

let state = {
  mode: 'cardinals',
  round: 0,
  correct: 0,
  total: 0,
  sessionLength: 10,     // 10, 20, or Infinity
  currentTarget: null,
  currentSentence: '',
  currentOptions: [],
  answered: false,
  streak: 0,
  maxStreak: 0,
  startTime: 0,
  speed: 'normal',
  active: false,          // Is a session running?
  transitioning: false,   // Block input during transitions
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

// ── Sleep utility ──────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Start a new training session.
 * @param {string} mode - Category ID
 * @param {object} [options]
 * @param {number} [options.sessionLength=10] - Number of questions (Infinity for infinite)
 * @param {string} [options.speed='normal'] - TTS speed preset
 */
export function startSession(mode, options = {}) {
  const sessionLength = options.sessionLength || 10;
  const speed = options.speed || 'normal';

  state = {
    mode,
    round: 0,
    correct: 0,
    total: 0,
    sessionLength,
    currentTarget: null,
    currentSentence: '',
    currentOptions: [],
    answered: false,
    streak: 0,
    maxStreak: 0,
    startTime: Date.now(),
    speed,
    active: true,
    transitioning: false,
  };

  // Ensure audio context is ready (must be in user gesture chain)
  ensureSoundContext();

  emit('session-start', { mode, sessionLength, speed });
}

/**
 * Generate and present the next question.
 * This is the main loop entry point — handles audio, contemplation, stagger.
 */
export async function nextQuestion() {
  if (!state.active) return;
  if (state.transitioning) return;

  // Check if session is complete
  if (state.sessionLength !== Infinity && state.round >= state.sessionLength) {
    completeSession();
    return;
  }

  state.transitioning = true;

  // Generate round data
  const generator = getGenerator(state.mode);
  const target = generator.generate();
  const confusers = generateConfusers(target);
  const sentence = getSentence(target);
  const options = shuffle([target, ...confusers]);

  state.round++;
  state.currentTarget = target;
  state.currentSentence = sentence;
  state.currentOptions = options;
  state.answered = false;

  // Update progress
  if (state.sessionLength !== Infinity) {
    updateProgress(state.round - 1, state.sessionLength);
  }

  emit('question-new', {
    round: state.round,
    target,
    options,
    sentence,
    total: state.sessionLength,
  });

  // Hide previous options
  hideOptions();
  clearFeedback();

  // Play audio (or show focus card, handled by app.js via event)
  if (!isReadingMode()) {
    // Pulse the breathing circle during audio
    pulseCircle();

    try {
      await speak(sentence, state.speed);
    } catch (err) {
      // TTS failed — still show options so user can play
      console.warn('TTS error:', err.message);
      emit('tts-error', err);
    }

    // ── The Contemplation Pause ──
    // 600ms of silence. This is where comprehension occurs.
    await sleep(CONTEMPLATION_PAUSE_MS);
  } else {
    // In reading/focus mode, show text immediately, short pause then options
    emit('focus-show', { ttsText: target.ttsText, sentence });
    await sleep(CONTEMPLATION_PAUSE_MS);
  }

  // Show options with stagger
  state.transitioning = false;
  const optionDisplays = options.map(o => o.display);
  showOptionsStaggered(optionDisplays, OPTION_STAGGER_MS);

  emit('options-shown', { options: optionDisplays });
}

/**
 * Submit an answer. Triggers the correct/wrong flow.
 * @param {string} selectedDisplay - The display string the user chose
 * @param {number} selectedIndex - The button index (0-3)
 */
export async function submitAnswer(selectedDisplay, selectedIndex) {
  if (!state.active || state.answered || state.transitioning) return null;

  state.answered = true;
  state.transitioning = true;
  state.total++;

  const isCorrect = selectedDisplay === state.currentTarget.display;
  const correctIndex = state.currentOptions.findIndex(
    o => o.display === state.currentTarget.display
  );

  if (isCorrect) {
    await handleCorrect(selectedIndex, correctIndex);
  } else {
    await handleWrong(selectedIndex, correctIndex);
  }

  // Transition to next question
  state.transitioning = false;
  await nextQuestion();

  return { isCorrect, correctDisplay: state.currentTarget?.display, correctIndex };
}

// ── Correct answer flow ────────────────────────────────────────────────────

async function handleCorrect(selectedIndex, correctIndex) {
  state.correct++;

  // Update streak
  state.streak++;
  if (state.streak > state.maxStreak) state.maxStreak = state.streak;

  // Immediate feedback: sound + haptic + visual
  playCorrect();
  hapticCorrect();
  showCorrectFeedback(selectedIndex);

  emit('correct', {
    round: state.round,
    streak: state.streak,
    display: state.currentTarget.display,
  });

  // Streak effects
  updateStreakDisplay(state.streak);
  handleStreakEffects(state.streak);

  emit('streak-update', {
    streak: state.streak,
    maxStreak: state.maxStreak,
  });

  // Reinforcement: speak the correct number again at normal speed
  await sleep(REINFORCEMENT_DELAY_MS);
  if (!isReadingMode()) {
    try {
      await speakReinforcement(state.currentTarget.ttsText);
    } catch { /* reinforcement is supplementary, don't block */ }
  }

  // Hold for remaining time
  const elapsed = REINFORCEMENT_DELAY_MS + 300; // approximate
  const remaining = Math.max(CORRECT_HOLD_MS - elapsed, 200);
  await sleep(remaining);
}

// ── Wrong answer flow ──────────────────────────────────────────────────────

async function handleWrong(selectedIndex, correctIndex) {
  // Reset streak
  const prevStreak = state.streak;
  state.streak = 0;

  // Immediate feedback: sound + haptic + visual
  playWrong();
  hapticWrong();
  showWrongFeedback(selectedIndex, correctIndex);

  emit('wrong', {
    round: state.round,
    display: state.currentTarget.display,
    chosen: state.currentOptions[selectedIndex]?.display,
    prevStreak,
  });

  // Update streak display (hides it since streak = 0)
  updateStreakDisplay(0);
  warmCircle(0); // Reset circle warmth

  // After 300ms, speak the correct answer for learning
  await sleep(300);
  if (!isReadingMode()) {
    try {
      await speakReinforcement(state.currentTarget.ttsText);
    } catch { /* supplementary */ }
  }

  // Hold for remaining time (longer than correct — learning time)
  const elapsed = 300 + 400; // approximate
  const remaining = Math.max(WRONG_HOLD_MS - elapsed, 400);
  await sleep(remaining);
}

// ── Streak effects ─────────────────────────────────────────────────────────

function handleStreakEffects(streak) {
  // Warmth levels: 0=normal, 1=warm(3), 2=hot(5), 3=fire(10)
  if (streak >= 10) {
    warmCircle(3);
  } else if (streak >= 5) {
    warmCircle(2);
  } else if (streak >= 3) {
    warmCircle(1);
  }

  // Milestone effects
  if (streak === 5 || (streak >= 10 && streak % 5 === 0)) {
    playStreak();
    hapticStreak();
    bloomCircle();
    emit('streak-milestone', { streak });
  } else if (streak === 3) {
    emit('streak-milestone', { streak });
  }
}

// ── Session completion ─────────────────────────────────────────────────────

function completeSession() {
  state.active = false;
  const elapsed = Date.now() - state.startTime;
  const percent = state.total > 0 ? Math.round((state.correct / state.total) * 100) : 0;

  // Sound + haptic
  playComplete();
  hapticComplete();

  const stats = {
    correct: state.correct,
    total: state.total,
    percent,
    mode: state.mode,
    maxStreak: state.maxStreak,
    timeMs: elapsed,
    sessionLength: state.sessionLength,
  };

  emit('session-complete', stats);

  // Transition to summary
  transitionToSummary(percent);
}

// ── Skip round ─────────────────────────────────────────────────────────────

/**
 * Skip the current round (counts as wrong).
 */
export async function skipRound() {
  if (!state.active || state.answered || state.transitioning) return;

  state.answered = true;
  state.transitioning = true;
  state.total++;

  // Reset streak
  state.streak = 0;
  updateStreakDisplay(0);
  warmCircle(0);

  const correctIndex = state.currentOptions.findIndex(
    o => o.display === state.currentTarget.display
  );

  emit('skip', {
    round: state.round,
    correctDisplay: state.currentTarget.display,
  });

  // Brief highlight of correct answer
  showWrongFeedback(-1, correctIndex); // -1 = no selected button
  await sleep(1200);

  state.transitioning = false;
  await nextQuestion();
}

// ── Replay audio ───────────────────────────────────────────────────────────

/**
 * Replay the current question's audio.
 */
export async function replayAudio() {
  if (!state.active || state.transitioning || !state.currentSentence) return;
  if (isReadingMode()) return;

  pulseCircle();
  try {
    await speak(state.currentSentence, state.speed);
  } catch (err) {
    console.warn('Replay TTS error:', err.message);
  }
}

// ── Stop session ───────────────────────────────────────────────────────────

/**
 * Abort the current session.
 */
export function stopSession() {
  state.active = false;
  state.transitioning = false;
  stopTTS();
  emit('session-abort', { round: state.round });
}

// ── Getters ────────────────────────────────────────────────────────────────

export function getCurrentSentence() { return state.currentSentence; }
export function getCurrentTarget() { return state.currentTarget; }
export function getCurrentOptions() { return state.currentOptions; }
export function isActive() { return state.active; }
export function isTransitioning() { return state.transitioning; }

export function getScore() {
  const percent = state.total > 0 ? Math.round((state.correct / state.total) * 100) : 0;
  return { correct: state.correct, total: state.total, percent };
}

export function getStreak() {
  return { current: state.streak, max: state.maxStreak };
}

export function getSessionInfo() {
  return {
    mode: state.mode,
    round: state.round,
    sessionLength: state.sessionLength,
    speed: state.speed,
    active: state.active,
  };
}

/**
 * Update speed mid-session.
 * @param {'slow'|'normal'|'fast'} speed
 */
export function setSpeed(speed) {
  if (['slow', 'normal', 'fast'].includes(speed)) {
    state.speed = speed;
  }
}
