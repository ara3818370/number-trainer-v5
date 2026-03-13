// tts.js — Web Speech API wrapper with iOS workarounds, offline detection
// Steve Edition: Added speakReinforcement(), reliable onEnd for contemplation pause

import { getLearnLang } from './i18n.js';

// ── Constants ──────────────────────────────────────────────────────────────

const VOICE_WAIT_TIMEOUT_MS = 3000;
const VOICE_POLL_INTERVAL_MS = 250;
const VOICE_POLL_MAX_MS = 3000;

const RATE_MAP = {
  slow: 0.7,
  normal: 1.0,
  fast: 1.3,
};

const VOICE_FALLBACKS = {
  en: ['en-US', 'en-GB', 'en-AU', 'en-NZ', 'en-ZA', 'en-IN', 'en-IE'],
  de: ['de-DE', 'de-AT', 'de-CH'],
  uk: ['uk-UA'],
};

// ── State ──────────────────────────────────────────────────────────────────

/** @type {SpeechSynthesisVoice|null} */
let selectedEnVoice = null;
/** @type {SpeechSynthesisVoice|null} */
let selectedDeVoice = null;
/** @type {SpeechSynthesisVoice|null} */
let selectedUkVoice = null;
let available = false;
let initialized = false;
let onInterruptCallback = null;
let noEnglishVoiceWarning = false;
let noGermanVoiceWarning = false;
let noUkrainianVoiceWarning = false;

/** @type {'auto'|'reading'} */
let ttsMode = 'auto';

/** @type {function|null} */
let onVoiceChangeCallback = null;

// ── TTS Mode ───────────────────────────────────────────────────────────────

const TTS_MODE_KEY = 'nlt-tts-mode';

function loadTTSMode() {
  try {
    const saved = localStorage.getItem(TTS_MODE_KEY);
    if (saved === 'reading' || saved === 'auto') ttsMode = saved;
  } catch { /* ignore */ }
}

function saveTTSMode() {
  try { localStorage.setItem(TTS_MODE_KEY, ttsMode); } catch { /* ignore */ }
}

export function getTTSMode() { return ttsMode; }

export function setTTSMode(mode) {
  if (mode !== 'auto' && mode !== 'reading') return;
  ttsMode = mode;
  saveTTSMode();
}

export function isReadingMode() {
  if (ttsMode === 'reading') return true;
  if (ttsMode === 'auto' && !hasVoiceForLearnLang()) return true;
  return false;
}

// ── Voice selection ────────────────────────────────────────────────────────

function selectBestVoice(voices, langPrefix, preferredPattern) {
  if (!voices || voices.length === 0) return null;

  if (preferredPattern) {
    const preferred = voices.find(v => preferredPattern.test(v.name) && v.lang.startsWith(langPrefix));
    if (preferred) return preferred;
  }

  const fallbacks = VOICE_FALLBACKS[langPrefix] || [];
  for (const code of fallbacks) {
    const match = voices.find(v => v.lang === code);
    if (match) return match;
  }

  return voices.find(v => v.lang.startsWith(langPrefix)) || null;
}

function getActiveVoice() {
  const l = getLearnLang();
  if (l === 'uk') return selectedUkVoice;
  if (l === 'de') return selectedDeVoice;
  return selectedEnVoice;
}

// ── Voice availability ─────────────────────────────────────────────────────

export function getAvailableLanguages() {
  return {
    en: !!selectedEnVoice,
    de: !!selectedDeVoice,
    uk: !!selectedUkVoice,
  };
}

// ── Initialization ─────────────────────────────────────────────────────────

export function init() {
  loadTTSMode();

  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      available = false;
      initialized = true;
      resolve(false);
      return;
    }

    function processVoices(voices) {
      const prevEn = !!selectedEnVoice;
      const prevDe = !!selectedDeVoice;
      const prevUk = !!selectedUkVoice;

      selectedEnVoice = selectBestVoice(voices, 'en', /samantha|daniel/i);
      selectedDeVoice = selectBestVoice(voices, 'de', /anna|helena|petra|markus|yannick/i);
      selectedUkVoice = selectBestVoice(voices, 'uk', /lesya|kateryna|olena|dmytro/i);

      noEnglishVoiceWarning = !selectedEnVoice;
      noGermanVoiceWarning = !selectedDeVoice;
      noUkrainianVoiceWarning = !selectedUkVoice;

      available = !!(selectedEnVoice || selectedDeVoice || selectedUkVoice);
      initialized = true;

      const changed = (!!selectedEnVoice !== prevEn) ||
                      (!!selectedDeVoice !== prevDe) ||
                      (!!selectedUkVoice !== prevUk);
      if (changed && onVoiceChangeCallback) {
        onVoiceChangeCallback(getAvailableLanguages());
      }
    }

    let voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      processVoices(voices);
      resolve(available);
      setupVoicesChangedListener(processVoices);
      return;
    }

    let resolved = false;

    const onVoicesChanged = () => {
      if (resolved) return;
      voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        processVoices(voices);
        resolved = true;
        resolve(available);
      }
    };

    speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);

    let pollElapsed = 0;
    const pollTimer = setInterval(() => {
      pollElapsed += VOICE_POLL_INTERVAL_MS;
      voices = speechSynthesis.getVoices();
      if (voices.length > 0 && !resolved) {
        clearInterval(pollTimer);
        onVoicesChanged();
      }
      if (pollElapsed >= VOICE_POLL_MAX_MS && !resolved) {
        clearInterval(pollTimer);
        voices = speechSynthesis.getVoices();
        processVoices(voices);
        resolved = true;
        resolve(available);
      }
    }, VOICE_POLL_INTERVAL_MS);

    setTimeout(() => {
      if (!resolved) {
        clearInterval(pollTimer);
        voices = speechSynthesis.getVoices();
        processVoices(voices);
        resolved = true;
        resolve(available);
      }
    }, VOICE_WAIT_TIMEOUT_MS);

    setupVoicesChangedListener(processVoices);
  });
}

function setupVoicesChangedListener(processVoices) {
  if (!window.speechSynthesis) return;
  let debounceTimer = null;
  speechSynthesis.addEventListener('voiceschanged', () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) processVoices(voices);
    }, 100);
  });
}

// ── Voice change callback ──────────────────────────────────────────────────

export function onVoiceChange(callback) {
  onVoiceChangeCallback = callback;
}

// ── Speak ──────────────────────────────────────────────────────────────────

/**
 * Speak the given text using Web Speech API.
 * @param {string} text
 * @param {'slow'|'normal'|'fast'} speed
 * @returns {Promise<void>}
 */
export function speak(text, speed = 'normal') {
  return new Promise((resolve, reject) => {
    if (isReadingMode()) {
      resolve();
      return;
    }

    const voice = getActiveVoice();
    if (!available || !voice) {
      reject(new Error('TTS not available'));
      return;
    }

    speechSynthesis.cancel();

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      const langMap = { de: 'de-DE', uk: 'uk-UA', en: 'en-US' };
      utterance.lang = voice.lang || langMap[getLearnLang()] || 'en-US';
      utterance.rate = RATE_MAP[speed] || 1.0;
      utterance.pitch = 1.0;

      // iOS workaround: sometimes onend doesn't fire.
      // Use a safety timeout based on estimated speech duration.
      let ended = false;
      const estimatedMs = Math.max(text.length * 80 / (RATE_MAP[speed] || 1), 500);
      const safetyTimeout = setTimeout(() => {
        if (!ended) {
          ended = true;
          resolve();
        }
      }, estimatedMs + 3000);

      utterance.onend = () => {
        if (!ended) {
          ended = true;
          clearTimeout(safetyTimeout);
          resolve();
        }
      };

      utterance.onerror = (event) => {
        if (ended) return;
        ended = true;
        clearTimeout(safetyTimeout);
        if (!navigator.onLine) {
          reject(new Error('offline'));
        } else if (event.error === 'canceled') {
          resolve();
        } else {
          reject(new Error('tts_error'));
        }
      };

      speechSynthesis.speak(utterance);
    }, 100);
  });
}

/**
 * Speak reinforcement text at normal speed regardless of speed setting.
 * Used after correct answer to reinforce the number.
 * @param {string} text
 * @returns {Promise<void>}
 */
export function speakReinforcement(text) {
  return new Promise((resolve, reject) => {
    if (isReadingMode()) {
      resolve();
      return;
    }

    const voice = getActiveVoice();
    if (!available || !voice) {
      resolve(); // Don't reject for reinforcement — it's supplementary
      return;
    }

    // Don't cancel — this might overlap slightly, which is fine
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    const langMap = { de: 'de-DE', uk: 'uk-UA', en: 'en-US' };
    utterance.lang = voice.lang || langMap[getLearnLang()] || 'en-US';
    utterance.rate = 1.0; // Always normal speed for reinforcement
    utterance.pitch = 1.0;

    let ended = false;
    const safetyTimeout = setTimeout(() => {
      if (!ended) { ended = true; resolve(); }
    }, 5000);

    utterance.onend = () => {
      if (!ended) { ended = true; clearTimeout(safetyTimeout); resolve(); }
    };

    utterance.onerror = () => {
      if (!ended) { ended = true; clearTimeout(safetyTimeout); resolve(); }
    };

    speechSynthesis.speak(utterance);
  });
}

// ── Warm-up ────────────────────────────────────────────────────────────────

export function warmUp() {
  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(' ');
  utterance.volume = 0;
  const voice = getActiveVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang || 'en-US';
  }
  speechSynthesis.speak(utterance);
}

// ── Stop ───────────────────────────────────────────────────────────────────

export function stop() {
  if (window.speechSynthesis) speechSynthesis.cancel();
}

// ── Status ─────────────────────────────────────────────────────────────────

export function isAvailable() { return available; }

export function getVoiceName() {
  const voice = getActiveVoice();
  return voice ? `${voice.name} (${voice.lang})` : 'none';
}

export function hasNoEnglishVoice() { return noEnglishVoiceWarning; }
export function hasNoGermanVoice() { return noGermanVoiceWarning; }
export function hasNoUkrainianVoice() { return noUkrainianVoiceWarning; }

export function hasVoiceForLearnLang() {
  return !!getActiveVoice();
}

// ── Interruption handling ──────────────────────────────────────────────────

export function onInterrupt(callback) {
  onInterruptCallback = callback;
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stop();
    } else if (onInterruptCallback) {
      onInterruptCallback();
    }
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => stop());
}
