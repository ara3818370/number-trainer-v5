// app.js — Orchestrator for Number Trainer v5 "Steve Edition"
// Complete rewrite: wires together all modules with progressive disclosure,
// onboarding, settings, focus mode, and training loop.
// THIS is the single source of truth for the training loop.

import { initSettings, getSetting, setSetting, onSettingChange, showSettings, hideSettings, getThemeForSystem } from './settings.js';
import { initI18n, t, applyTranslations, setUILang, setLearnLang, getLearnLang, getUILang, getCategoryLabel } from './i18n.js';
import { initProgress, getUnlockedCategories, getMasteredCategories, isCategoryUnlocked, recordSession, getNextUnlock, getPrerequisiteCategory, unlockAll, isOnboardingDone, UNLOCK_ORDER } from './progress.js';
import { shouldShowOnboarding, runOnboarding, handleOnboardingAnswer } from './onboarding.js';
import { CATEGORY_META } from './categories.js';
import * as game from './game.js';
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
        applyTheme(getThemeForSystem());
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

function showScreen(screenId) {
  for (const id of SCREENS) {
    const el = document.getElementById('screen-' + id);
    if (!el) continue;
    if (id === screenId) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  }
  if (screenId === 'menu') renderCategoryMenu();
}

// ── Theme ──────────────────────────────────────────────────────────────────

function applyTheme(resolvedTheme) {
  document.documentElement.removeAttribute('data-theme');
  if (resolvedTheme === 'light') document.documentElement.setAttribute('data-theme', 'light');
  else if (resolvedTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
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
  messageEl.classList.add('hidden');

  onboardingFlow = runOnboarding({
    async onPlay(text) {
      circleEl.classList.add('playing');
      const mode = getSetting('mode');
      if (mode === 'focus') {
        circleEl.innerHTML = `<span class="focus-number">${text}</span>`;
        await delay(1500);
      } else {
        await tts.speak(text, getSetting('speed')).catch(() => {
          circleEl.innerHTML = `<span class="focus-number">${text}</span>`;
        });
      }
      circleEl.classList.remove('playing');
    },

    onShowOptions(options, correctIndex) {
      optionsEl.innerHTML = '';
      options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn onboarding-option';
        btn.textContent = opt.display;
        btn.style.opacity = '1';
        btn.style.transform = 'none';

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
                if (getSetting('haptics')) haptics.hapticCorrect();
                messageEl.textContent = t('onboarding.perfect');
              } else {
                btn.classList.add('wrong');
                const correctBtn = optionsEl.children[correctIndex];
                if (correctBtn) correctBtn.classList.add('reveal-correct');
                if (getSetting('sounds')) sound.playWrong();
                if (getSetting('haptics')) haptics.hapticWrong();

                const q = onboardingFlow.question;
                if (getSetting('mode') !== 'focus') {
                  await delay(300);
                  await tts.speak(q.ttsText, getSetting('speed')).catch(() => {});
                }
                messageEl.textContent = t('onboarding.now_you_know');
              }
              messageEl.classList.remove('hidden');
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

    card.addEventListener('click', () => {
      if (isUnlocked) {
        startTraining(catId);
      } else {
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
  sessionLength = getSetting('sessionLength');
  isProcessingAnswer = false;

  // Start game state
  game.startSession(categoryId);

  // Ensure audio context (user gesture chain)
  sound.ensureContext();

  showScreen('training');

  // Update UI header
  const catLabel = document.getElementById('category-indicator');
  if (catLabel) catLabel.textContent = getCategoryLabel(categoryId);

  // Update progress bar
  updateProgressBar(0);

  // Reset streak display
  updateStreakDisplay(0);

  // Reset body filter
  document.body.style.filter = '';

  // Start first round
  playNextRound();
}

function playNextRound() {
  // Check session completion
  if (game.isSessionComplete(sessionLength)) {
    showSummary();
    return;
  }

  isProcessingAnswer = false;

  // Generate question (pure data from game.js)
  const round = game.generateQuestion();
  if (!round) {
    console.error('game.generateQuestion() returned null');
    showScreen('menu');
    return;
  }

  // Clear options
  const optionsGrid = document.getElementById('options-grid');
  if (optionsGrid) optionsGrid.innerHTML = '';

  // Update streak display
  const streak = game.getStreak();
  updateStreakDisplay(streak.current);

  // Update progress bar
  const score = game.getScore();
  updateProgressBar(score.total);

  const mode = getSetting('mode');

  if (mode === 'focus') {
    showFocusCard(round.target.ttsText);
    setTimeout(() => renderOptions(round.options, round.target), CONTEMPLATION_PAUSE_MS);
  } else {
    hideFocusCard();
    playAudioRound(round);
  }
}

async function playAudioRound(round) {
  const circle = document.getElementById('breathing-circle');
  if (circle) circle.classList.add('playing');

  try {
    const sentence = game.getCurrentSentence();
    if (sentence) {
      await tts.speak(sentence, getSetting('speed'));
    }
  } catch {
    // TTS failed — show focus card as fallback for this round
    showFocusCard(round.target.ttsText);
  }

  if (circle) circle.classList.remove('playing');

  // Contemplation pause
  await delay(CONTEMPLATION_PAUSE_MS);

  // Reveal options with stagger
  renderOptions(round.options, round.target);
}

function renderOptions(options, target) {
  const grid = document.getElementById('options-grid');
  if (!grid) return;
  grid.innerHTML = '';

  options.forEach((displayText, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = displayText;

    // Start invisible for stagger animation
    btn.style.opacity = '0';
    btn.style.transform = 'translateY(8px)';

    btn.addEventListener('click', () => handleAnswer(displayText, i, options, target));
    grid.appendChild(btn);

    // Stagger reveal
    setTimeout(() => {
      btn.style.transition = 'opacity 200ms ease-out, transform 200ms ease-out';
      btn.style.opacity = '1';
      btn.style.transform = 'translateY(0)';
    }, i * OPTION_STAGGER_MS);
  });
}

async function handleAnswer(selectedDisplay, buttonIndex, options, target) {
  if (isProcessingAnswer) return;
  isProcessingAnswer = true;

  // Record answer in game state (single source of truth)
  const result = game.recordAnswer(selectedDisplay);
  if (!result) { isProcessingAnswer = false; return; }

  const grid = document.getElementById('options-grid');
  const buttons = grid ? Array.from(grid.children) : [];
  const soundsOn = getSetting('sounds');
  const hapticsOn = getSetting('haptics');

  if (result.isCorrect) {
    // ── Correct flow ──
    if (buttons[buttonIndex]) buttons[buttonIndex].classList.add('correct');
    buttons.forEach((btn, i) => { if (i !== buttonIndex) btn.classList.add('dimmed'); });

    if (soundsOn) sound.playCorrect();
    if (hapticsOn) haptics.hapticCorrect();

    // Streak effects
    handleStreakEffects(result.streak);

    // TTS reinforcement
    if (getSetting('mode') !== 'focus') {
      setTimeout(() => tts.speak(target.ttsText, getSetting('speed')).catch(() => {}), TTS_REINFORCE_DELAY_MS);
    }

    await delay(CORRECT_HOLD_MS);
    playNextRound();

  } else {
    // ── Wrong flow ──
    if (buttons[buttonIndex]) buttons[buttonIndex].classList.add('wrong');
    buttons.forEach((btn, i) => {
      if (i !== buttonIndex && i !== result.correctIndex) btn.classList.add('dimmed');
    });

    if (soundsOn) sound.playWrong();
    if (hapticsOn) haptics.hapticWrong();

    // Reveal correct after 300ms
    setTimeout(() => {
      if (buttons[result.correctIndex]) buttons[result.correctIndex].classList.add('reveal-correct');
      if (getSetting('mode') !== 'focus') {
        tts.speak(target.ttsText, getSetting('speed')).catch(() => {});
      }
    }, 300);

    // Reset body hue shift
    document.body.style.filter = '';

    // Update streak display (streak is now 0)
    updateStreakDisplay(0);

    await delay(WRONG_HOLD_MS);
    playNextRound();
  }
}

// ── Streak Effects ─────────────────────────────────────────────────────────

function handleStreakEffects(streak) {
  const circle = document.getElementById('breathing-circle');
  const soundsOn = getSetting('sounds');
  const hapticsOn = getSetting('haptics');

  // Circle brightness based on streak
  if (circle) {
    if (streak >= 10) {
      circle.style.filter = 'brightness(1.25)';
    } else if (streak >= 5) {
      circle.style.filter = 'brightness(1.15)';
    } else if (streak >= 3) {
      circle.style.filter = 'brightness(1.08)';
    } else {
      circle.style.filter = '';
    }
  }

  // Milestone effects (bloom + sound)
  if (streak === 5 || (streak >= 10 && streak % 5 === 0)) {
    if (circle) {
      circle.classList.remove('bloom');
      void circle.offsetWidth; // Force reflow
      circle.classList.add('bloom');
      setTimeout(() => circle.classList.remove('bloom'), 400);
    }
    if (soundsOn) sound.playStreak();
    if (hapticsOn) haptics.hapticStreak();
  }

  // Hue shift at 10+
  if (streak >= 10) {
    const extraFives = Math.floor((streak - 10) / 5);
    const deg = Math.min(5 + extraFives, 15);
    document.body.style.transition = 'filter 2s ease';
    document.body.style.filter = `hue-rotate(${deg}deg)`;
  }

  updateStreakDisplay(streak);
}

function updateStreakDisplay(streak) {
  const counter = document.getElementById('streak-counter');
  if (!counter) return;

  if (streak >= 3) {
    counter.textContent = t('streak.counter').replace('{n}', String(streak));
    counter.classList.add('visible');
  } else {
    counter.classList.remove('visible');
  }
}

// ── Progress Bar ───────────────────────────────────────────────────────────

function updateProgressBar(currentTotal) {
  const fill = document.getElementById('progress-fill');
  if (!fill) return;

  if (sessionLength === Infinity || sessionLength <= 0) {
    fill.style.width = '0%';
  } else {
    const pct = Math.min((currentTotal / sessionLength) * 100, 100);
    fill.style.width = pct + '%';
  }
}

// ── Focus Mode ─────────────────────────────────────────────────────────────

function showFocusCard(text) {
  const card = document.getElementById('focus-card');
  const circle = document.getElementById('breathing-circle');
  const numberEl = document.getElementById('focus-number');
  const promptEl = document.getElementById('focus-prompt');

  if (card && numberEl) {
    numberEl.textContent = text;
    if (promptEl) promptEl.textContent = t('focus.question');
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

  const stats = game.getSessionStats();
  const pct = stats.percent;

  // Animate percentage
  const pctEl = document.getElementById('summary-percent');
  if (pctEl) {
    pctEl.className = 'summary-percent';
    if (pct >= 80) pctEl.classList.add('excellent');
    else if (pct >= 60) pctEl.classList.add('good');
    else pctEl.classList.add('learning');
    countUp(pctEl, pct);
  }

  // Update score spans
  const correctEl = document.getElementById('summary-correct');
  if (correctEl) correctEl.textContent = stats.correct;
  const totalEl = document.getElementById('summary-total');
  if (totalEl) totalEl.textContent = stats.total;

  // Record to progress system
  const { newUnlocks, newMastery } = recordSession(
    currentCategory, stats.correct, stats.total, stats.maxStreak
  );

  // Play completion sound
  if (getSetting('sounds')) sound.playComplete();
  if (getSetting('haptics')) haptics.hapticComplete();

  // Show unlock notification
  if (newUnlocks.length > 0) {
    const unlockName = getCategoryLabel(newUnlocks[0]);
    setTimeout(() => {
      showToast(t('summary.new_unlock').replace('{category}', unlockName));
    }, 1200);
  }

  // Reset body filter
  document.body.style.filter = '';
}

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

  // Settings button (menu screen)
  const settingsBtn = document.getElementById('btn-settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showSettings(settingsBtn);
    });
  }

  // Back button (training → menu)
  const backBtn = document.getElementById('btn-back');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      tts.stop();
      game.stopSession();
      document.body.style.filter = '';
      showScreen('menu');
    });
  }

  // Breathing circle tap → replay audio
  const circle = document.getElementById('breathing-circle');
  if (circle) {
    circle.addEventListener('click', () => {
      if (isProcessingAnswer) return;
      if (!game.isActive()) return;
      const mode = getSetting('mode');
      if (mode !== 'focus') {
        const sentence = game.getCurrentSentence();
        if (sentence) {
          circle.classList.add('playing');
          tts.speak(sentence, getSetting('speed'))
            .then(() => circle.classList.remove('playing'))
            .catch(() => circle.classList.remove('playing'));
        }
      }
    });
  }

  // Summary buttons
  const againBtn = document.getElementById('btn-new-session');
  if (againBtn) {
    againBtn.addEventListener('click', () => {
      if (currentCategory) startTraining(currentCategory);
    });
  }

  const menuBtn = document.getElementById('btn-home');
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
