// ui.js — Steve Edition: DOM manipulation, animations, breathing circle,
// staggered options, feedback, streaks, progress, screen transitions
// Complete rewrite with all new functions from the design spec

import { CATEGORY_GROUPS, CATEGORY_META } from './categories.js';
import { t, getCategoryLabel, getCategoryDesc, getGroupLabel, getLearnLang } from './i18n.js';

// ── Screen management ──────────────────────────────────────────────────────

const screens = {};
let currentScreen = null;

export function initScreens() {
  document.querySelectorAll('.screen').forEach(el => {
    screens[el.id.replace('screen-', '')] = el;
  });
}

export function showScreen(name) {
  for (const [key, el] of Object.entries(screens)) {
    el.classList.toggle('active', key === name);
  }
  currentScreen = name;
}

export function getCurrentScreen() {
  return currentScreen;
}

// ── Category indicator ──────────────────────────────────────────────────────

export function showCategoryIndicator(mode) {
  const el = document.getElementById('category-indicator');
  if (!el) return;
  const meta = CATEGORY_META[mode];
  if (meta) {
    el.textContent = getCategoryLabel(mode);
  } else {
    el.textContent = '';
  }
}

// ── Breathing Circle ───────────────────────────────────────────────────────

let circleEl = null;

/**
 * Initialize the breathing circle element.
 * Finds or creates the .breathing-circle element.
 */
export function initBreathingCircle() {
  circleEl = document.querySelector('.breathing-circle');
  if (circleEl) {
    circleEl.classList.add('breathing');
  }
}

/**
 * Pulse the circle when audio plays.
 * Scale 1 → 1.08 → 1, with glow.
 */
export function pulseCircle() {
  if (!circleEl) return;
  circleEl.classList.remove('breathing');
  circleEl.classList.add('pulsing');

  // Remove pulsing class when animation ends, resume breathing
  const onEnd = () => {
    circleEl.classList.remove('pulsing');
    circleEl.classList.add('breathing');
    circleEl.removeEventListener('animationend', onEnd);
  };
  circleEl.addEventListener('animationend', onEnd);
}

/**
 * Set circle warmth level based on streak.
 * @param {number} level - 0=normal, 1=warm(3-streak), 2=hot(5-streak), 3=fire(10-streak)
 */
export function warmCircle(level) {
  if (!circleEl) return;
  circleEl.dataset.warmth = String(level);

  // Apply brightness filter
  const brightness = [1, 1.08, 1.15, 1.25][level] || 1;
  circleEl.style.filter = level > 0 ? `brightness(${brightness})` : '';

  // Hue shift on body for streak ≥ 10
  if (level >= 3) {
    const hue = Math.min((level - 2) * 5, 15);
    document.body.style.transition = 'filter 2s ease';
    document.body.style.filter = `hue-rotate(${hue}deg)`;
  } else {
    document.body.style.filter = '';
  }
}

/**
 * Play bloom animation on circle (streak 5 celebration).
 * Scale 1 → 1.15 → 1, 400ms.
 */
export function bloomCircle() {
  if (!circleEl) return;
  circleEl.classList.remove('blooming');
  // Force reflow to restart animation
  void circleEl.offsetWidth;
  circleEl.classList.add('blooming');

  const onEnd = () => {
    circleEl.classList.remove('blooming');
    circleEl.removeEventListener('animationend', onEnd);
  };
  circleEl.addEventListener('animationend', onEnd);
}

// ── Options: Staggered Reveal ──────────────────────────────────────────────

let optionButtons = [];
let buttonsLocked = false;
let onOptionClick = null;

/**
 * Set the callback for option clicks.
 * @param {function(string, number)} callback - (display, index)
 */
export function setOptionClickHandler(callback) {
  onOptionClick = callback;
}

/**
 * Show options one by one with staggered fade-in.
 * @param {string[]} options - Array of display strings
 * @param {number} delay - Delay between each option (ms)
 */
export function showOptionsStaggered(options, delay = 100) {
  const grid = document.getElementById('options-grid');
  if (!grid) return;

  grid.innerHTML = '';
  optionButtons = [];
  buttonsLocked = false;

  options.forEach((display, index) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = display;
    btn.dataset.display = display;
    btn.dataset.index = index;

    if (display.length > 8) btn.classList.add('long-text');

    // Start invisible
    btn.style.opacity = '0';
    btn.style.transform = 'translateY(8px)';

    btn.addEventListener('click', () => {
      if (buttonsLocked) return;
      lockButtons();
      if (onOptionClick) onOptionClick(display, index);
    });

    grid.appendChild(btn);
    optionButtons.push(btn);

    // Stagger the reveal
    setTimeout(() => {
      btn.style.transition = 'opacity 200ms ease-out, transform 200ms ease-out';
      btn.style.opacity = '1';
      btn.style.transform = 'translateY(0)';
    }, index * delay);
  });
}

/**
 * Instantly hide all options (for next question prep).
 */
export function hideOptions() {
  const grid = document.getElementById('options-grid');
  if (grid) grid.innerHTML = '';
  optionButtons = [];
  buttonsLocked = false;
}

// ── Button locking ─────────────────────────────────────────────────────────

export function lockButtons() {
  buttonsLocked = true;
  optionButtons.forEach(btn => { btn.disabled = true; });
}

export function unlockButtons() {
  buttonsLocked = false;
  optionButtons.forEach(btn => { btn.disabled = false; });
}

// ── Correct/Wrong Feedback ─────────────────────────────────────────────────

/**
 * Show correct answer feedback.
 * Lift + green wash on correct button, fade others.
 * @param {number} index - Index of the correct button
 */
export function showCorrectFeedback(index) {
  optionButtons.forEach((btn, i) => {
    if (i === index) {
      btn.classList.add('correct');
      // correctLift animation applied via CSS class
    } else {
      btn.classList.add('dimmed');
    }
  });
}

/**
 * Show wrong answer feedback.
 * Red wash on chosen, pulse + green on correct, fade others.
 * @param {number} chosenIndex - Index of wrong chosen button (-1 if skip)
 * @param {number} correctIndex - Index of the correct button
 */
export function showWrongFeedback(chosenIndex, correctIndex) {
  optionButtons.forEach((btn, i) => {
    if (i === chosenIndex) {
      btn.classList.add('wrong');
    } else if (i === correctIndex) {
      // Delay revealing correct answer
      setTimeout(() => {
        btn.classList.add('reveal-correct');
      }, 300);
    } else {
      btn.classList.add('dimmed');
    }
  });
}

/**
 * Clear all feedback classes from option buttons.
 */
export function clearFeedback() {
  optionButtons.forEach(btn => {
    btn.classList.remove('correct', 'wrong', 'dimmed', 'reveal-correct');
  });
}

// ── Streak Display ─────────────────────────────────────────────────────────

let streakEl = null;

/**
 * Update the streak counter display.
 * @param {number} count - Current streak count
 */
export function updateStreakDisplay(count) {
  if (!streakEl) {
    streakEl = document.getElementById('streak-counter');
  }
  if (!streakEl) {
    // Create if not in DOM
    streakEl = document.createElement('div');
    streakEl.id = 'streak-counter';
    streakEl.className = 'streak-counter';
    document.body.appendChild(streakEl);
  }

  if (count >= 3) {
    streakEl.textContent = `${count} 🔥`;
    streakEl.classList.add('visible');
  } else {
    streakEl.classList.remove('visible');
  }
}

// ── Progress Bar ───────────────────────────────────────────────────────────

let progressFillEl = null;
let questionCounterEl = null;

/**
 * Update progress bar.
 * @param {number} current - Current question (0-indexed)
 * @param {number} total - Total questions (Infinity for infinite)
 */
export function updateProgress(current, total) {
  // For finite sessions: progress bar
  if (total !== Infinity) {
    if (!progressFillEl) {
      progressFillEl = document.querySelector('.progress-fill');
    }
    if (progressFillEl) {
      const pct = Math.min((current / total) * 100, 100);
      progressFillEl.style.width = `${pct}%`;
    }

    // Hide question counter if visible
    if (questionCounterEl) questionCounterEl.classList.add('hidden');
  } else {
    // For infinite mode: show question counter instead
    if (progressFillEl) progressFillEl.style.width = '0%';

    if (!questionCounterEl) {
      questionCounterEl = document.getElementById('question-counter');
    }
    if (questionCounterEl) {
      questionCounterEl.textContent = `#${current + 1}`;
      questionCounterEl.classList.remove('hidden');
    }
  }
}

// ── Screen Transitions ─────────────────────────────────────────────────────

/**
 * Transition from menu to training screen.
 * Crossfade 250ms.
 */
export function transitionToTraining() {
  const menuScreen = screens['menu'] || screens['category'];
  const trainingScreen = screens['training'];

  if (menuScreen) {
    menuScreen.classList.add('screen-exit');
    setTimeout(() => {
      menuScreen.classList.remove('active', 'screen-exit');
    }, 250);
  }

  if (trainingScreen) {
    trainingScreen.classList.add('active', 'screen-enter');
    setTimeout(() => {
      trainingScreen.classList.remove('screen-enter');
    }, 250);
  }

  currentScreen = 'training';
}

/**
 * Transition from training to summary screen.
 * Breathing circle morphs to percentage.
 * @param {number} percentage - Final score percentage
 */
export function transitionToSummary(percentage) {
  const trainingScreen = screens['training'];
  const summaryScreen = screens['summary'];

  // Animate the circle shrinking
  if (circleEl) {
    circleEl.classList.remove('breathing', 'pulsing');
    circleEl.classList.add('circle-to-summary');
  }

  setTimeout(() => {
    if (trainingScreen) trainingScreen.classList.remove('active');
    if (summaryScreen) summaryScreen.classList.add('active', 'screen-enter');

    // Animate percentage count-up
    animatePercentage(percentage);

    setTimeout(() => {
      if (summaryScreen) summaryScreen.classList.remove('screen-enter');
    }, 250);
  }, 400);

  currentScreen = 'summary';
}

/**
 * Transition from summary to menu screen.
 * Slide down 300ms.
 */
export function transitionToMenu() {
  const summaryScreen = screens['summary'];
  const menuScreen = screens['menu'] || screens['category'];

  if (summaryScreen) {
    summaryScreen.classList.add('slide-down-exit');
    setTimeout(() => {
      summaryScreen.classList.remove('active', 'slide-down-exit');
    }, 300);
  }

  if (menuScreen) {
    setTimeout(() => {
      menuScreen.classList.add('active', 'screen-enter');
      setTimeout(() => menuScreen.classList.remove('screen-enter'), 250);
    }, 100);
  }

  // Reset circle
  if (circleEl) {
    circleEl.classList.remove('circle-to-summary');
    circleEl.classList.add('breathing');
    circleEl.style.filter = '';
  }
  document.body.style.filter = '';

  currentScreen = 'menu';
}

// ── Summary ────────────────────────────────────────────────────────────────

/**
 * Animate percentage from 0 to target with ease-out.
 * @param {number} target - Target percentage (0-100)
 */
export function animatePercentage(target) {
  const el = document.getElementById('summary-percent');
  if (!el) return;

  // Set color class
  colorPercentage(el, target);

  const duration = 800;
  const start = performance.now();

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out cubic: fast start, slow end
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(eased * target);
    el.textContent = current + '%';
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

/**
 * Set color on percentage element based on value.
 * Green ≥ 90, blue ≥ 70, neutral < 70
 * @param {HTMLElement} el
 * @param {number} value
 */
export function colorPercentage(el, value) {
  el.classList.remove('excellent', 'good', 'learning');
  if (value >= 90) {
    el.classList.add('excellent');
  } else if (value >= 70) {
    el.classList.add('good');
  } else {
    el.classList.add('learning');
  }
}

/**
 * Show summary screen with session results.
 * @param {object} stats
 */
export function showSummary(stats) {
  const correctEl = document.getElementById('summary-correct');
  const totalEl = document.getElementById('summary-total');
  const percentEl = document.getElementById('summary-percent');
  const modeEl = document.getElementById('summary-mode');
  const streakEl = document.getElementById('summary-max-streak');
  const subtitleEl = document.getElementById('summary-subtitle');

  if (correctEl) correctEl.textContent = stats.correct;
  if (totalEl) totalEl.textContent = stats.total;
  if (modeEl) {
    const meta = CATEGORY_META[stats.mode];
    modeEl.textContent = meta ? getCategoryLabel(stats.mode) : stats.mode;
  }
  if (streakEl) streakEl.textContent = stats.maxStreak || 0;
  if (subtitleEl) {
    subtitleEl.textContent = `${stats.correct} of ${stats.total} correct`;
  }
}

// ── Session length control ─────────────────────────────────────────────────

export function setActiveSessionLength(length) {
  document.querySelectorAll('.session-length-btn').forEach(btn => {
    const btnLen = btn.dataset.length === 'infinite' ? Infinity : parseInt(btn.dataset.length, 10);
    btn.classList.toggle('active', btnLen === length);
  });
}

// ── Score display ──────────────────────────────────────────────────────────

export function updateScore(correct, total) {
  const el = document.getElementById('score-display');
  if (el) {
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    el.textContent = `${correct}/${total} — ${pct}%`;
  }
}

// ── Error / Toast ──────────────────────────────────────────────────────────

export function showError(message) {
  const el = document.getElementById('error-message');
  if (el) el.textContent = message;
  showScreen('error');
}

export function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2000);
}

export function showOfflineWarning() {
  showToast(t('toast.offline'));
}

// ── Next / Skip buttons ────────────────────────────────────────────────────

export function showNextButton(visible) {
  const btn = document.getElementById('btn-next');
  if (btn) btn.classList.toggle('hidden', !visible);
}

export function showSkipButton(visible) {
  const btn = document.getElementById('btn-skip');
  if (btn) btn.classList.toggle('hidden', !visible);
}

// ── Speed control ──────────────────────────────────────────────────────────

export function setActiveSpeed(speed) {
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.speed === speed);
  });
}

// ── Theme ──────────────────────────────────────────────────────────────────

const THEME_ICONS = { auto: '🌓', light: '☀️', dark: '🌙' };
const THEME_CYCLE = ['auto', 'light', 'dark'];

export function updateThemeIcon(theme) {
  const btn = document.getElementById('btn-theme');
  if (btn) btn.textContent = THEME_ICONS[theme] || '🌓';
}

export function nextTheme(current) {
  const idx = THEME_CYCLE.indexOf(current);
  return THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
}

// ── Reading Mode UI ────────────────────────────────────────────────────────

export function showReadingCard(ttsText) {
  const card = document.getElementById('reading-card');
  const cardText = document.getElementById('reading-card-text');
  const circle = document.querySelector('.breathing-circle');

  if (card && cardText) {
    cardText.textContent = ttsText;
    card.classList.remove('hidden');
  }
  // Hide breathing circle in focus mode
  if (circle) circle.classList.add('hidden');
}

export function hideReadingCard() {
  const card = document.getElementById('reading-card');
  const circle = document.querySelector('.breathing-circle');

  if (card) card.classList.add('hidden');
  if (circle) circle.classList.remove('hidden');
}

export function showReadingModeIndicator(visible, langName) {
  const indicator = document.getElementById('reading-mode-indicator');
  if (!indicator) return;

  if (visible) {
    const text = t('reading.indicator').replace('{lang}', langName || '');
    indicator.textContent = text;
    indicator.classList.remove('hidden');
  } else {
    indicator.classList.add('hidden');
  }
}

export function updateModeToggle(isReading, voiceAvailable) {
  const btn = document.getElementById('btn-mode-toggle');
  if (!btn) return;

  if (isReading) {
    btn.textContent = '📖';
    btn.title = t('reading.switch_to_audio');
    btn.disabled = !voiceAvailable;
  } else {
    btn.textContent = '🔊';
    btn.title = t('reading.switch_to_reading');
    btn.disabled = false;
  }
}

export function showTrainingSpeedControl(visible) {
  const speedControls = document.querySelectorAll('#screen-training .speed-control');
  speedControls.forEach(el => {
    el.classList.toggle('hidden', !visible);
  });
}
