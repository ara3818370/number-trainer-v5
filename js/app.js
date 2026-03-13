// app.js — Orchestrator for Number Trainer v5 "Steve Edition"
// Complete rewrite: wires together all modules with progressive disclosure,
// onboarding, settings, focus mode, and training loop.

import { initSettings, getSetting, setSetting, onSettingChange, showSettings, hideSettings, getThemeForSystem } from './settings.js';
import { initI18n, t, applyTranslations, setUILang, setLearnLang, getLearnLang, getUILang, getCategoryLabel } from './i18n.js';
import { initProgress, getUnlockedCategories, getMasteredCategories, isCategoryUnlocked, recordSession, getNextUnlock, getPrerequisiteCategory, unlockAll, isOnboardingDone, UNLOCK_ORDER } from './progress.js';
import { shouldShowOnboarding, runOnboarding, handleOnboardingAnswer } from './onboarding.js';
import { CATEGORY_META } from './categories.js';
import * as game from './game.js';
import * as ui from './ui.js';
import * as tts from './tts.js';
import * as sound from './sound.js';
import * as haptics from './haptics.js';

// ── Constants ──────────────────────────────────────────────────────────────

const CONTEMPLATION_PAUSE_MS = 600;
const OPTION_STAGGER_MS = 100;
const CORRECT_HOLD_MS = 1200;
const WRONG_HOLD_MS = 1800;
const TTS_REINFORCE_DELAY_MS = 200;

// ── State ──────────────────────────────────────────────────────────────────

let currentCategory = null;
let currentStreak = 0;
let maxSessionStreak = 0;
let sessionScore = 0;
let sessionTotal = 0;
let sessionLength = 10;
let isProcessingAnswer = false;
let onboardingFlow = null;

// ── Boot Sequence ──────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Init settings
  initSettings();

  // 2. Init i18n with saved UI language
  const uiLang = getSetting('uiLang');
  initI18n();
  if (uiLang && uiLang !== getUILang()) setUILang(uiLang);

  // 3. Init progress
  initProgress();

  // 4. Apply theme
  applyTheme(getThemeForSystem());

  // 5. Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getSetting('theme') === 'auto') applyTheme(getThemeForSystem());
  });

  // 6. Init TTS
  await tts.init();

  // 7. Wire settings changes
  onSettingChange((key, value) => {
    switch (key) {
      case 'theme':
        applyTheme(key === 'theme' ? getThemeForSystem() : value);
        break;
      case 'uiLang':
        setUILang(value);
        applyTranslations();
        renderCategoryMenu();
        break;
      case 'learnLang':
        setLearnLang(value);
        break;
      case 'sessionLength':
        sessionLength = value;
        break;
      case 'speed':
      case 'mode':
      case 'sounds':
      case 'haptics':
        // These are read dynamically when needed
        break;
    }
  });

  // Load session length
  sessionLength = getSetting('sessionLength');

  // 8. Wire global events
  wireEvents();

  // 9. Register service worker
  registerSW();

  // 10. Decide first screen
  const hasLang = localStorage.getItem('nlt-settings');
  if (!hasLang || !getSetting('learnLang')) {
    // First launch — show language selection
    showScreen('lang-select');
  } else if (shouldShowOnboarding()) {
    showScreen('onboarding');
    startOnboarding();
  } else {
    showScreen('menu');
    renderCategoryMenu();
  }
});

// ── Screen Management ──────────────────────────────────────────────────────

const SCREENS = ['lang-select', 'menu', 'training', 'summary', 'onboarding'];

/**
 * Show a screen, hiding all others with a crossfade transition.
 * @param {string} screenId
 */
function showScreen(screenId) {
  for (const id of SCREENS) {
    const el = document.getElementById('screen-' + id);
    if (!el) continue;

    if (id === screenId) {
      el.classList.remove('screen-hidden');
      el.classList.add('screen-visible');
    } else {
      el.classList.remove('screen-visible');
      el.classList.add('screen-hidden');
    }
  }

  // Re-render dynamic screens
  if (screenId === 'menu') renderCategoryMenu();
}

// ── Theme ──────────────────────────────────────────────────────────────────

function applyTheme(resolvedTheme) {
  document.documentElement.removeAttribute('data-theme');
  if (resolvedTheme === 'light') document.documentElement.setAttribute('data-theme', 'light');
  else if (resolvedTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

  // Update meta theme-color
  const color = resolvedTheme === 'dark' ? '#1c1c1e' : '#f5f5f7';
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', color));
}

// ── Language Selection Screen ──────────────────────────────────────────────

function wireLangSelect() {
  const container = document.getElementById('screen-lang-select');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lang]');
    if (!btn) return;

    const lang = btn.dataset.lang;
    setSetting('uiLang', lang);
    setSetting('learnLang', lang);
    setUILang(lang);
    setLearnLang(lang);
    applyTranslations();

    // Proceed to onboarding
    if (shouldShowOnboarding()) {
      showScreen('onboarding');
      startOnboarding();
    } else {
      showScreen('menu');
    }
  });
}

// ── Onboarding ─────────────────────────────────────────────────────────────

function startOnboarding() {
  const circleEl = document.getElementById('onboarding-circle');
  const optionsEl = document.getElementById('onboarding-options');
  const messageEl = document.getElementById('onboarding-message');

  if (!circleEl || !optionsEl || !messageEl) return;

  // Reset UI
  optionsEl.innerHTML = '';
  messageEl.textContent = '';
  messageEl.style.opacity = '0';

  onboardingFlow = runOnboarding({
    async onPlay(text) {
      // Pulse the circle during playback
      circleEl.classList.add('audio-playing');
      const mode = getSetting('mode');
      if (mode === 'focus') {
        // Focus mode: show text instead
        circleEl.innerHTML = `<span class="focus-number">${text}</span>`;
        await delay(1500);
      } else {
        await tts.speak(text, getSetting('speed')).catch(() => {
          // Fallback: show text if TTS fails
          circleEl.innerHTML = `<span class="focus-number">${text}</span>`;
        });
      }
      circleEl.classList.remove('audio-playing');
    },

    onShowOptions(options, correctIndex) {
      optionsEl.innerHTML = '';
      options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn onboarding-option';
        btn.textContent = opt.display;
        btn.style.animationDelay = `${i * 100}ms`;
        btn.classList.add('visible');

        btn.addEventListener('click', () => {
          if (isProcessingAnswer) return;
          isProcessingAnswer = true;
          const isCorrect = i === correctIndex;

          handleOnboardingAnswer(isCorrect, {
            async onResult(correct) {
              if (correct) {
                btn.classList.add('correct');
                const other = optionsEl.children[1 - i];
                if (other) other.classList.add('dimmed');
                if (getSetting('sounds')) sound.playCorrect();
                if (getSetting('haptics')) haptics.correct();
                messageEl.textContent = t('onboarding.perfect');
              } else {
                btn.classList.add('wrong');
                const correctBtn = optionsEl.children[correctIndex];
                if (correctBtn) correctBtn.classList.add('reveal-correct');
                if (getSetting('sounds')) sound.playWrong();
                if (getSetting('haptics')) haptics.wrong();

                // Replay correct audio
                const q = onboardingFlow.question;
                if (getSetting('mode') !== 'focus') {
                  await delay(300);
                  await tts.speak(q.ttsText, getSetting('speed')).catch(() => {});
                }
                messageEl.textContent = t('onboarding.now_you_know');
              }
              messageEl.style.opacity = '1';
            },

            onComplete() {
              isProcessingAnswer = false;
              showScreen('menu');
              renderCategoryMenu();
            },
          });
        });

        optionsEl.appendChild(btn);
      });
    },

    onResult() {},
    onComplete() {},
  });

  // Start the flow
  onboardingFlow.start();
}

// ── Category Menu ──────────────────────────────────────────────────────────

function renderCategoryMenu() {
  const container = document.getElementById('category-grid');
  if (!container) return;

  const unlocked = getUnlockedCategories();
  const mastered = getMasteredCategories();
  const allCategories = UNLOCK_ORDER;
  const totalVisible = allCategories.length;

  // Set data-count for CSS layout
  container.setAttribute('data-count', String(totalVisible));
  container.innerHTML = '';

  for (const catId of allCategories) {
    const meta = CATEGORY_META[catId];
    if (!meta) continue;

    const isUnlocked = unlocked.includes(catId);
    const isMastered = mastered.includes(catId);

    const card = document.createElement('button');
    card.className = 'category-card' + (isUnlocked ? '' : ' locked');
    card.dataset.category = catId;

    // Icon
    const icon = document.createElement('span');
    icon.className = 'category-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = meta.icon;
    card.appendChild(icon);

    // Title
    const title = document.createElement('span');
    title.className = 'category-title';
    title.textContent = getCategoryLabel(catId);
    card.appendChild(title);

    // Mastery checkmark
    if (isMastered) {
      const check = document.createElement('span');
      check.className = 'category-checkmark';
      check.textContent = '✓';
      check.setAttribute('aria-label', 'Mastered');
      card.appendChild(check);
    }

    // Lock icon for locked categories
    if (!isUnlocked) {
      const lock = document.createElement('span');
      lock.className = 'category-lock';
      lock.textContent = '🔒';
      card.appendChild(lock);
    }

    // Click handler
    card.addEventListener('click', () => {
      if (isUnlocked) {
        startTraining(catId);
      } else {
        // Show unlock hint toast
        const prereq = getPrerequisiteCategory(catId);
        const prereqName = prereq ? getCategoryLabel(prereq) : '...';
        showToast(t('categories.unlock_hint').replace('{category}', prereqName));
      }
    });

    container.appendChild(card);
  }
}

// ── Training Loop ──────────────────────────────────────────────────────────

function startTraining(categoryId) {
  currentCategory = categoryId;
  currentStreak = 0;
  maxSessionStreak = 0;
  sessionScore = 0;
  sessionTotal = 0;
  sessionLength = getSetting('sessionLength');
  isProcessingAnswer = false;

  game.startSession(categoryId);
  showScreen('training');

  // Update UI header
  const catLabel = document.getElementById('training-category');
  if (catLabel) catLabel.textContent = getCategoryLabel(categoryId);

  // Update progress bar
  updateProgressBar();

  // Start first round
  playNextRound();
}

function playNextRound() {
  if (sessionLength !== Infinity && sessionTotal >= sessionLength) {
    showSummary();
    return;
  }

  isProcessingAnswer = false;
  const round = game.nextRound();

  // Clear options
  const optionsGrid = document.getElementById('options-grid');
  if (optionsGrid) optionsGrid.innerHTML = '';

  // Update streak display
  updateStreakDisplay();

  // Update progress bar
  updateProgressBar();

  const mode = getSetting('mode');

  if (mode === 'focus') {
    // Focus mode: show number as text card
    showFocusCard(round.target.ttsText);
    // After contemplation pause, show options
    setTimeout(() => renderOptions(round.options, round.target), CONTEMPLATION_PAUSE_MS);
  } else {
    // Audio mode: play via breathing circle
    hideFocusCard();
    playAudioRound(round);
  }
}

async function playAudioRound(round) {
  const circle = document.getElementById('breathing-circle');
  if (circle) {
    circle.classList.add('audio-playing');
  }

  try {
    const sentence = game.getCurrentSentence();
    await tts.speak(sentence, getSetting('speed'));
  } catch {
    // Fallback to focus mode for this round
    showFocusCard(round.target.ttsText);
  }

  if (circle) {
    circle.classList.remove('audio-playing');
  }

  // Contemplation pause
  await delay(CONTEMPLATION_PAUSE_MS);

  // Reveal options with stagger
  renderOptions(round.options, round.target);
}

function renderOptions(options, target) {
  const grid = document.getElementById('options-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const correctDisplay = target.display;

  options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;
    btn.style.animationDelay = `${i * OPTION_STAGGER_MS}ms`;

    // Stagger in
    requestAnimationFrame(() => btn.classList.add('visible'));

    btn.addEventListener('click', () => handleAnswer(opt, i, options, correctDisplay, target));
    grid.appendChild(btn);
  });
}

async function handleAnswer(selectedDisplay, buttonIndex, options, correctDisplay, target) {
  if (isProcessingAnswer) return;
  isProcessingAnswer = true;

  const result = game.submitAnswer(selectedDisplay);
  if (!result) { isProcessingAnswer = false; return; }

  const grid = document.getElementById('options-grid');
  const buttons = grid ? Array.from(grid.children) : [];
  const soundsOn = getSetting('sounds');
  const hapticsOn = getSetting('haptics');

  if (result.isCorrect) {
    // ── Correct flow ──
    currentStreak++;
    if (currentStreak > maxSessionStreak) maxSessionStreak = currentStreak;
    sessionScore++;
    sessionTotal++;

    // Visual feedback
    if (buttons[buttonIndex]) buttons[buttonIndex].classList.add('correct');
    buttons.forEach((btn, i) => { if (i !== buttonIndex) btn.classList.add('dimmed'); });

    // Sound + haptic
    if (soundsOn) sound.playCorrect();
    if (hapticsOn) haptics.correct();

    // Streak effects
    handleStreakEffects();

    // TTS reinforcement (after 200ms)
    if (getSetting('mode') !== 'focus') {
      setTimeout(() => tts.speak(target.ttsText, getSetting('speed')).catch(() => {}), TTS_REINFORCE_DELAY_MS);
    }

    // Hold, then next
    await delay(CORRECT_HOLD_MS);
    playNextRound();

  } else {
    // ── Wrong flow ──
    currentStreak = 0;
    sessionTotal++;

    // Visual feedback
    if (buttons[buttonIndex]) buttons[buttonIndex].classList.add('wrong');
    buttons.forEach((btn, i) => {
      if (i !== buttonIndex && i !== result.correctIndex) btn.classList.add('dimmed');
    });

    // Sound + haptic
    if (soundsOn) sound.playWrong();
    if (hapticsOn) haptics.wrong();

    // Reveal correct after 300ms
    setTimeout(() => {
      if (buttons[result.correctIndex]) buttons[result.correctIndex].classList.add('reveal-correct');

      // Speak correct answer
      if (getSetting('mode') !== 'focus') {
        tts.speak(target.ttsText, getSetting('speed')).catch(() => {});
      }
    }, 300);

    // Reset body hue shift
    document.body.style.filter = '';

    // Hold, then next
    await delay(WRONG_HOLD_MS);
    playNextRound();
  }
}

// ── Streak Effects ─────────────────────────────────────────────────────────

function handleStreakEffects() {
  const circle = document.getElementById('breathing-circle');
  const soundsOn = getSetting('sounds');
  const hapticsOn = getSetting('haptics');

  if (currentStreak >= 3 && circle) {
    circle.style.filter = `brightness(1.08)`;
  }

  if (currentStreak === 5 || currentStreak === 10 || currentStreak === 15) {
    // Bloom animation
    if (circle) {
      circle.classList.add('bloom');
      setTimeout(() => circle.classList.remove('bloom'), 400);
    }
    if (soundsOn) sound.playStreak();
    if (hapticsOn) haptics.streak();
  }

  // Hue shift at 10+
  if (currentStreak >= 10) {
    const extraFives = Math.floor((currentStreak - 10) / 5);
    const deg = Math.min(5 + extraFives, 15);
    document.body.style.transition = 'filter 2s ease';
    document.body.style.filter = `hue-rotate(${deg}deg)`;
  }

  updateStreakDisplay();
}

function updateStreakDisplay() {
  const counter = document.getElementById('streak-counter');
  if (!counter) return;

  if (currentStreak >= 3) {
    counter.textContent = t('streak.counter').replace('{n}', String(currentStreak));
    counter.classList.add('visible');
  } else {
    counter.classList.remove('visible');
  }
}

// ── Progress Bar ───────────────────────────────────────────────────────────

function updateProgressBar() {
  const fill = document.getElementById('progress-fill');
  if (!fill) return;

  if (sessionLength === Infinity || sessionLength <= 0) {
    fill.style.width = '0%';
  } else {
    const pct = Math.min((sessionTotal / sessionLength) * 100, 100);
    fill.style.width = pct + '%';
  }
}

// ── Focus Mode ─────────────────────────────────────────────────────────────

function showFocusCard(text) {
  const card = document.getElementById('focus-card');
  const circle = document.getElementById('breathing-circle');
  if (card) {
    card.querySelector('.focus-number').textContent = text;
    card.querySelector('.focus-prompt').textContent = t('focus.question');
    card.classList.remove('hidden');
  }
  if (circle) circle.classList.add('hidden');
}

function hideFocusCard() {
  const card = document.getElementById('focus-card');
  const circle = document.getElementById('breathing-circle');
  if (card) card.classList.add('hidden');
  if (circle) circle.classList.remove('hidden');
}

// ── Summary Screen ─────────────────────────────────────────────────────────

function showSummary() {
  showScreen('summary');

  const pct = sessionTotal > 0 ? Math.round((sessionScore / sessionTotal) * 100) : 0;

  // Animate percentage
  const pctEl = document.getElementById('summary-percent');
  if (pctEl) {
    pctEl.className = 'summary-percent';
    if (pct >= 80) pctEl.classList.add('excellent');
    else if (pct >= 60) pctEl.classList.add('good');
    else pctEl.classList.add('learning');
    countUp(pctEl, pct);
  }

  // Subtitle
  const subtitleEl = document.getElementById('summary-subtitle');
  if (subtitleEl) {
    subtitleEl.textContent = `${sessionScore} / ${sessionTotal}`;
  }

  // Record to progress system
  const { newUnlocks, newMastery } = recordSession(
    currentCategory, sessionScore, sessionTotal, maxSessionStreak
  );

  // Play completion sound
  if (getSetting('sounds')) sound.playSessionComplete();
  if (getSetting('haptics')) haptics.sessionComplete();

  // Show unlock notification if applicable
  if (newUnlocks.length > 0) {
    const unlockName = getCategoryLabel(newUnlocks[0]);
    setTimeout(() => {
      showToast(t('summary.new_unlock').replace('{category}', unlockName));
    }, 1200);
  }

  // Reset body filter
  document.body.style.filter = '';
}

/**
 * Animate a number counting up.
 */
function countUp(element, target, durationMs = 800) {
  const start = performance.now();
  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / durationMs, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = Math.round(eased * target) + '%';
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// ── Toast ──────────────────────────────────────────────────────────────────

function showToast(message, durationMs = 2000) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('visible');

  setTimeout(() => toast.classList.remove('visible'), durationMs);
}

// ── Event Wiring ───────────────────────────────────────────────────────────

function wireEvents() {
  wireLangSelect();

  // Settings button
  const settingsBtn = document.getElementById('btn-settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showSettings(settingsBtn);
    });
  }

  // Training settings button
  const trainSettingsBtn = document.getElementById('btn-training-settings');
  if (trainSettingsBtn) {
    trainSettingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showSettings(trainSettingsBtn);
    });
  }

  // Back button (training → menu)
  const backBtn = document.getElementById('btn-back');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      tts.stop();
      game.endSession();
      document.body.style.filter = '';
      showScreen('menu');
    });
  }

  // Breathing circle tap → replay audio
  const circle = document.getElementById('breathing-circle');
  if (circle) {
    circle.addEventListener('click', () => {
      if (isProcessingAnswer) return;
      const mode = getSetting('mode');
      if (mode !== 'focus') {
        const sentence = game.getCurrentSentence();
        if (sentence) {
          circle.classList.add('audio-playing');
          tts.speak(sentence, getSetting('speed'))
            .then(() => circle.classList.remove('audio-playing'))
            .catch(() => circle.classList.remove('audio-playing'));
        }
      }
    });
  }

  // Summary buttons
  const againBtn = document.getElementById('btn-again');
  if (againBtn) {
    againBtn.addEventListener('click', () => {
      if (currentCategory) startTraining(currentCategory);
    });
  }

  const menuBtn = document.getElementById('btn-categories');
  if (menuBtn) {
    menuBtn.addEventListener('click', () => showScreen('menu'));
  }

  // Unlock all (from settings or gesture)
  document.addEventListener('nlt-unlock-all', () => {
    unlockAll();
    renderCategoryMenu();
    showToast(t('settings.unlocked_all'));
  });
}

// ── Service Worker ─────────────────────────────────────────────────────────

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
