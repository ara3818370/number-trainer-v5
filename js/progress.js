// progress.js — Progressive category disclosure system
// Number Trainer v5 "Steve Edition"

const STORAGE_KEY = 'nlt-progress';

// Unlock order — mixed is always last
const UNLOCK_ORDER = [
  'cardinals', 'ordinals', 'years', 'fractions', 'decimals',
  'currencies', 'percentages', 'roomBus', 'sports',
  'temperatures', 'large', 'mixed'
];

const MIXED_REQUIRES = 6;

/** @type {ProgressData|null} */
let data = null;

// ── Persistence ────────────────────────────────────────────────────────────

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* corrupt data */ }
  return null;
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* quota exceeded */ }
}

function createDefault() {
  return {
    unlocked: ['cardinals'],
    mastered: [],
    sessions: [],
    totalSessions: 0,
    currentStreak: 0,
    onboardingDone: false,
    unlockAllUsed: false,
  };
}

// ── Initialization ─────────────────────────────────────────────────────────

export function initProgress() {
  data = load() || createDefault();
  if (!data.unlocked.includes('cardinals')) {
    data.unlocked.unshift('cardinals');
  }
  if (!Array.isArray(data.mastered)) data.mastered = [];
  if (!Array.isArray(data.sessions)) data.sessions = [];
  save();
}

// ── Queries ────────────────────────────────────────────────────────────────

export function getUnlockedCategories() {
  if (!data) initProgress();
  return UNLOCK_ORDER.filter(id => data.unlocked.includes(id));
}

export function getMasteredCategories() {
  if (!data) initProgress();
  return [...data.mastered];
}

export function isCategoryUnlocked(id) {
  if (!data) initProgress();
  return data.unlocked.includes(id);
}

export function getNextUnlock() {
  if (!data) initProgress();
  for (const id of UNLOCK_ORDER) {
    if (!data.unlocked.includes(id)) {
      if (id === 'mixed') {
        if (getCompletedCategoryCount() < MIXED_REQUIRES) return null;
      }
      return id;
    }
  }
  return null;
}

function getCompletedCategoryCount() {
  const completed = new Set();
  for (const s of data.sessions) completed.add(s.category);
  return completed.size;
}

/**
 * Get prerequisite category for unlock hint messages.
 */
export function getPrerequisiteCategory(lockedId) {
  if (!data) initProgress();
  const idx = UNLOCK_ORDER.indexOf(lockedId);
  if (idx <= 0) return null;
  for (let i = idx - 1; i >= 0; i--) {
    if (data.unlocked.includes(UNLOCK_ORDER[i])) return UNLOCK_ORDER[i];
  }
  return UNLOCK_ORDER[0];
}

// ── Session Recording ──────────────────────────────────────────────────────

/**
 * Record a completed session and process unlocks.
 * @returns {{newUnlocks: string[], newMastery: boolean}}
 */
export function recordSession(category, score, total, maxStreak) {
  if (!data) initProgress();

  const date = new Date().toISOString().split('T')[0];
  data.sessions.push({ category, score, total, date, maxStreak: maxStreak || 0 });
  data.totalSessions++;

  const accuracy = total > 0 ? (score / total) * 100 : 0;
  const newUnlocks = [];
  let newMastery = false;

  if (accuracy >= 85 && !data.mastered.includes(category)) {
    data.mastered.push(category);
    newMastery = true;
    // Unlock next TWO
    for (let i = 0; i < 2; i++) {
      const next = findNextLocked();
      if (next) { data.unlocked.push(next); newUnlocks.push(next); }
    }
  } else if (accuracy >= 70) {
    const next = findNextLocked();
    if (next) { data.unlocked.push(next); newUnlocks.push(next); }
  }

  data.currentStreak = calculateDayStreak();
  save();
  return { newUnlocks, newMastery };
}

function findNextLocked() {
  for (const id of UNLOCK_ORDER) {
    if (!data.unlocked.includes(id)) {
      if (id === 'mixed' && getCompletedCategoryCount() < MIXED_REQUIRES) continue;
      return id;
    }
  }
  return null;
}

function calculateDayStreak() {
  if (data.sessions.length === 0) return 0;
  const dates = [...new Set(data.sessions.map(s => s.date))].sort().reverse();
  const today = new Date().toISOString().split('T')[0];
  if (dates[0] !== today) return 0;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    if (Math.round((prev - curr) / 86400000) === 1) streak++;
    else break;
  }
  return streak;
}

// ── Unlock All ─────────────────────────────────────────────────────────────

export function unlockAll() {
  if (!data) initProgress();
  data.unlocked = [...UNLOCK_ORDER];
  data.unlockAllUsed = true;
  save();
}

// ── Stats ──────────────────────────────────────────────────────────────────

export function getStats() {
  if (!data) initProgress();
  let bestScore = 0, longestStreak = 0;
  const categoryCount = {};

  for (const s of data.sessions) {
    const pct = s.total > 0 ? Math.round((s.score / s.total) * 100) : 0;
    if (pct > bestScore) bestScore = pct;
    if ((s.maxStreak || 0) > longestStreak) longestStreak = s.maxStreak || 0;
    categoryCount[s.category] = (categoryCount[s.category] || 0) + 1;
  }

  let favoriteCategory = null, maxCount = 0;
  for (const [cat, count] of Object.entries(categoryCount)) {
    if (count > maxCount) { maxCount = count; favoriteCategory = cat; }
  }

  return { totalSessions: data.totalSessions, bestScore, favoriteCategory, longestStreak };
}

// ── Onboarding ─────────────────────────────────────────────────────────────

export function isOnboardingDone() {
  if (!data) initProgress();
  return !!data.onboardingDone;
}

export function setOnboardingDone() {
  if (!data) initProgress();
  data.onboardingDone = true;
  save();
}

export { UNLOCK_ORDER };
