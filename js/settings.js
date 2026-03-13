// settings.js — Compact settings overlay
// Number Trainer v5 "Steve Edition"
//
// Stores all user preferences. Renders a settings overlay with segmented controls.
// Changes apply immediately — no save button.

import { t } from './i18n.js';

const STORAGE_KEY = 'nlt-settings';

const DEFAULTS = {
  speed: 'normal',
  sessionLength: 10,
  mode: 'audio',
  theme: 'auto',
  uiLang: 'en',
  learnLang: 'en',
  sounds: true,
  haptics: true,
};

/** @type {Object} */
let settings = null;

/** @type {Set<function>} */
const listeners = new Set();

/** @type {HTMLElement|null} */
let overlayEl = null;

/** @type {function|null} */
let outsideClickHandler = null;

// ── Persistence ────────────────────────────────────────────────────────────

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* corrupt */ }
  return null;
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch { /* quota */ }
}

// ── Initialization ─────────────────────────────────────────────────────────

/**
 * Load settings from localStorage, filling in defaults for missing keys.
 */
export function initSettings() {
  const saved = load();
  settings = { ...DEFAULTS, ...(saved || {}) };
  save();
}

// ── Getters / Setters ──────────────────────────────────────────────────────

/**
 * Get a setting value.
 * @param {string} key
 * @returns {*}
 */
export function getSetting(key) {
  if (!settings) initSettings();
  return key in settings ? settings[key] : DEFAULTS[key];
}

/**
 * Set a setting value, persist, and notify listeners.
 * @param {string} key
 * @param {*} value
 */
export function setSetting(key, value) {
  if (!settings) initSettings();
  const oldValue = settings[key];
  settings[key] = value;
  save();

  if (oldValue !== value) {
    for (const cb of listeners) {
      try { cb(key, value, oldValue); } catch (e) { console.error('Settings listener error:', e); }
    }
  }
}

/**
 * Register a callback for setting changes.
 * @param {function(string, *, *): void} callback - (key, newValue, oldValue)
 * @returns {function} unsubscribe function
 */
export function onSettingChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

// ── Theme helpers ──────────────────────────────────────────────────────────

/**
 * Cycle theme: auto → light → dark → auto.
 */
export function toggleTheme() {
  const current = getSetting('theme');
  const next = current === 'auto' ? 'light' : current === 'light' ? 'dark' : 'auto';
  setSetting('theme', next);
}

/**
 * Resolve 'auto' to actual theme based on prefers-color-scheme.
 * @returns {'light'|'dark'}
 */
export function getThemeForSystem() {
  const theme = getSetting('theme');
  if (theme === 'light' || theme === 'dark') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// ── Settings Overlay UI ────────────────────────────────────────────────────

/**
 * Show the settings overlay anchored near the given element.
 * @param {HTMLElement} anchorElement
 */
export function showSettings(anchorElement) {
  if (overlayEl) { hideSettings(); return; }

  overlayEl = document.createElement('div');
  overlayEl.className = 'settings-overlay';
  overlayEl.setAttribute('role', 'dialog');
  overlayEl.setAttribute('aria-label', 'Settings');

  renderSettingsContent(overlayEl);

  // Position near anchor
  document.body.appendChild(overlayEl);

  // Close on outside click (deferred so this click doesn't immediately close)
  requestAnimationFrame(() => {
    outsideClickHandler = (e) => {
      if (overlayEl && !overlayEl.contains(e.target) && e.target !== anchorElement) {
        hideSettings();
      }
    };
    document.addEventListener('click', outsideClickHandler, true);
  });
}

/**
 * Hide the settings overlay with animation.
 */
export function hideSettings() {
  if (!overlayEl) return;

  if (outsideClickHandler) {
    document.removeEventListener('click', outsideClickHandler, true);
    outsideClickHandler = null;
  }

  overlayEl.style.animation = 'settingsOut 150ms ease-in forwards';
  const el = overlayEl;
  overlayEl = null;

  setTimeout(() => {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 150);
}

/**
 * Check if settings overlay is currently shown.
 * @returns {boolean}
 */
export function isSettingsVisible() {
  return overlayEl !== null;
}

// ── Render Settings Content ────────────────────────────────────────────────

function renderSettingsContent(container) {
  container.innerHTML = '';

  // 1. Speed
  container.appendChild(createSegmentedRow(
    t('settings.speed'),
    [
      { label: t('settings.slow'), value: 'slow' },
      { label: t('settings.normal'), value: 'normal' },
      { label: t('settings.fast'), value: 'fast' },
    ],
    getSetting('speed'),
    (val) => setSetting('speed', val)
  ));

  // 2. Session Length
  container.appendChild(createSegmentedRow(
    t('settings.session'),
    [
      { label: '10', value: 10 },
      { label: '20', value: 20 },
      { label: '∞', value: Infinity },
    ],
    getSetting('sessionLength'),
    (val) => setSetting('sessionLength', val)
  ));

  // 3. Mode
  container.appendChild(createSegmentedRow(
    t('settings.mode'),
    [
      { label: '🔊 ' + t('settings.audio'), value: 'audio' },
      { label: '📖 ' + t('settings.focus'), value: 'focus' },
    ],
    getSetting('mode'),
    (val) => setSetting('mode', val)
  ));

  // 4. Theme
  container.appendChild(createSegmentedRow(
    t('settings.theme'),
    [
      { label: 'Auto', value: 'auto' },
      { label: 'Light', value: 'light' },
      { label: 'Dark', value: 'dark' },
    ],
    getSetting('theme'),
    (val) => setSetting('theme', val)
  ));

  // 5. Language flags
  const langRow = document.createElement('div');
  langRow.className = 'settings-row';
  const langLabel = document.createElement('div');
  langLabel.className = 'settings-label';
  langLabel.textContent = t('settings.language');
  langRow.appendChild(langLabel);

  const flagContainer = document.createElement('div');
  flagContainer.className = 'settings-flags';

  const langs = [
    { code: 'en', flag: '🇬🇧' },
    { code: 'de', flag: '🇩🇪' },
    { code: 'uk', flag: '🇺🇦' },
  ];
  const currentLang = getSetting('learnLang');

  for (const { code, flag } of langs) {
    const btn = document.createElement('button');
    btn.className = 'settings-flag-btn' + (code === currentLang ? ' active' : '');
    btn.textContent = flag;
    btn.setAttribute('aria-label', code);
    btn.addEventListener('click', () => {
      setSetting('learnLang', code);
      setSetting('uiLang', code);
      // Re-render to update active states and labels
      renderSettingsContent(container);
    });
    flagContainer.appendChild(btn);
  }

  langRow.appendChild(flagContainer);
  container.appendChild(langRow);

  // 6. Unlock All (at bottom)
  const unlockDiv = document.createElement('div');
  unlockDiv.className = 'unlock-all';
  unlockDiv.textContent = t('settings.unlock_all');
  unlockDiv.addEventListener('click', () => {
    // Dispatch custom event — app.js handles the actual unlock
    document.dispatchEvent(new CustomEvent('nlt-unlock-all'));
    hideSettings();
  });
  container.appendChild(unlockDiv);
}

// ── Segmented Control Builder ──────────────────────────────────────────────

/**
 * Create a settings row with label + segmented control.
 * @param {string} label
 * @param {Array<{label: string, value: *}>} segments
 * @param {*} activeValue
 * @param {function(*): void} onChange
 * @returns {HTMLElement}
 */
function createSegmentedRow(label, segments, activeValue, onChange) {
  const row = document.createElement('div');
  row.className = 'settings-row';

  const labelEl = document.createElement('div');
  labelEl.className = 'settings-label';
  labelEl.textContent = label;
  row.appendChild(labelEl);

  const control = document.createElement('div');
  control.className = 'segmented-control';

  for (const seg of segments) {
    const btn = document.createElement('button');
    btn.className = 'segment' + (seg.value === activeValue ? ' active' : '');
    btn.textContent = seg.label;
    btn.addEventListener('click', () => {
      // Update active state visually
      control.querySelectorAll('.segment').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      onChange(seg.value);
    });
    control.appendChild(btn);
  }

  row.appendChild(control);
  return row;
}
