// i18n.js — Lightweight internationalization framework
// Number Trainer v5 "Steve Edition" — updated with all new keys

// ── Translation dictionary ─────────────────────────────────────────────────

const TRANSLATIONS = {
  // ── Onboarding (Steve Edition) ──────────────────────────────────────────
  'onboarding.title':       { en: 'Number Trainer', de: 'Zahlentrainer', uk: 'Тренажер чисел' },
  'onboarding.subtitle':    { en: 'Learn to recognize numbers by ear', de: 'Lerne Zahlen nach Gehör zu erkennen', uk: 'Вчись розпізнавати числа на слух' },
  'onboarding.perfect':     { en: "Perfect. You're ready.", de: 'Perfekt. Los geht\'s.', uk: 'Чудово. Починаймо.' },
  'onboarding.ready':       { en: "You're ready.", de: 'Du bist bereit.', uk: 'Ти готовий.' },
  'onboarding.now_you_know':{ en: "Now you know. Let's begin.", de: "Jetzt weißt du's. Los!", uk: 'Тепер знаєш. Поїхали.' },
  'onboarding.lets_begin':  { en: "Let's begin.", de: "Los geht's.", uk: 'Поїхали.' },

  // ── Menu ────────────────────────────────────────────────────────────────
  'menu.title':             { en: 'Number Trainer', de: 'Zahlentrainer', uk: 'Тренажер чисел' },

  // ── Category group labels ───────────────────────────────────────────────
  'group.basic':            { en: 'Basic', de: 'Grundlagen', uk: 'Основи' },
  'group.context':          { en: 'Numbers in context', de: 'Zahlen im Kontext', uk: 'Числа в контексті' },
  'group.realworld':        { en: 'Real-world', de: 'Alltag', uk: 'Побут' },
  'group.challenge':        { en: 'Challenge', de: 'Herausforderung', uk: 'Виклик' },

  // ── Category names ──────────────────────────────────────────────────────
  'cat.cardinals.label':    { en: 'Cardinals', de: 'Grundzahlen', uk: 'Кількісні' },
  'cat.cardinals.desc':     { en: '1 - 100', de: '1 - 100', uk: '1 - 100' },
  'cat.ordinals.label':     { en: 'Ordinals', de: 'Ordnungszahlen', uk: 'Порядкові' },
  'cat.ordinals.desc':      { en: '1st - 100th', de: '1. - 100.', uk: '1-й - 100-й' },
  'cat.years.label':        { en: 'Years', de: 'Jahre', uk: 'Роки' },
  'cat.years.desc':         { en: '1200 - 2026', de: '1200 - 2026', uk: '1200 - 2026' },
  'cat.fractions.label':    { en: 'Fractions', de: 'Brüche', uk: 'Дроби' },
  'cat.fractions.desc':     { en: '1/2, 3/4, 2 1/3', de: '1/2, 3/4, 2 1/3', uk: '1/2, 3/4, 2 1/3' },
  'cat.decimals.label':     { en: 'Decimals', de: 'Dezimalzahlen', uk: 'Десяткові' },
  'cat.decimals.desc':      { en: '0.01 - 99.99', de: '0,01 - 99,99', uk: '0,01 - 99,99' },
  'cat.currencies.label':   { en: 'Currencies', de: 'Währungen', uk: 'Валюти' },
  'cat.currencies.desc':    { en: '$0.01 - $999.99', de: '€0,01 - €999,99', uk: '₴0,01 - ₴999,99' },
  'cat.percentages.label':  { en: 'Percentages', de: 'Prozent', uk: 'Відсотки' },
  'cat.percentages.desc':   { en: '0.01% - 100%', de: '0,01% - 100%', uk: '0,01% - 100%' },
  'cat.roomBus.label':      { en: 'Room / Bus', de: 'Raum / Bus', uk: 'Кімната / Автобус' },
  'cat.roomBus.desc':       { en: 'Room 101, Bus 305', de: 'Raum 101, Bus 305', uk: 'Кімната 101, Автобус 305' },
  'cat.sports.label':       { en: 'Sports', de: 'Sport', uk: 'Спорт' },
  'cat.sports.desc':        { en: '5:0, 2:1', de: '5:0, 2:1', uk: '5:0, 2:1' },
  'cat.temperatures.label': { en: 'Temperatures', de: 'Temperaturen', uk: 'Температури' },
  'cat.temperatures.desc':  { en: '-30°C - 45°C', de: '-30°C - 45°C', uk: '-30°C - 45°C' },
  'cat.largeNumbers.label': { en: 'Large Numbers', de: 'Große Zahlen', uk: 'Великі числа' },
  'cat.largeNumbers.desc':  { en: '100 - 999,999', de: '100 - 999.999', uk: '100 - 999 999' },
  'cat.large.label':        { en: 'Large Numbers', de: 'Große Zahlen', uk: 'Великі числа' },
  'cat.large.desc':         { en: '100 - 999,999', de: '100 - 999.999', uk: '100 - 999 999' },
  'cat.mixed.label':        { en: 'Mixed', de: 'Gemischt', uk: 'Мікс' },
  'cat.mixed.desc':         { en: 'all together', de: 'alles zusammen', uk: 'все разом' },

  // ── Categories (progressive disclosure) ─────────────────────────────────
  'categories.locked':       { en: 'Locked', de: 'Gesperrt', uk: 'Заблоковано' },
  'categories.unlock_hint':  { en: 'Complete {category} to unlock', de: '{category} abschließen zum Freischalten', uk: 'Завершіть {category} для розблокування' },

  // ── Settings ────────────────────────────────────────────────────────────
  'settings.speed':          { en: 'Speed', de: 'Tempo', uk: 'Швидкість' },
  'settings.session':        { en: 'Questions', de: 'Fragen', uk: 'Питань' },
  'settings.mode':           { en: 'Mode', de: 'Modus', uk: 'Режим' },
  'settings.theme':          { en: 'Theme', de: 'Design', uk: 'Тема' },
  'settings.language':       { en: 'Language', de: 'Sprache', uk: 'Мова' },
  'settings.slow':           { en: 'Slow', de: 'Langsam', uk: 'Повільно' },
  'settings.normal':         { en: 'Normal', de: 'Normal', uk: 'Нормально' },
  'settings.fast':           { en: 'Fast', de: 'Schnell', uk: 'Швидко' },
  'settings.audio':          { en: 'Audio', de: 'Audio', uk: 'Аудіо' },
  'settings.focus':          { en: 'Focus', de: 'Fokus', uk: 'Фокус' },
  'settings.unlock_all':     { en: 'Unlock all categories', de: 'Alle freischalten', uk: 'Відкрити все' },
  'settings.unlocked_all':   { en: 'All categories unlocked!', de: 'Alle Kategorien freigeschaltet!', uk: 'Усі категорії розблоковано!' },

  // ── Focus mode ──────────────────────────────────────────────────────────
  'focus.question':          { en: 'What number is this?', de: 'Welche Zahl ist das?', uk: 'Яке це число?' },

  // ── Training screen ─────────────────────────────────────────────────────
  'training.replay':         { en: '🔊 Replay', de: '🔊 Wiederholen', uk: '🔊 Повторити' },
  'training.skip':           { en: 'Skip', de: 'Überspringen', uk: 'Пропустити' },
  'training.next':           { en: 'Next', de: 'Weiter', uk: 'Далі' },
  'training.end':            { en: 'End', de: 'Beenden', uk: 'Завершити' },

  // ── Summary screen ──────────────────────────────────────────────────────
  'summary.title':           { en: 'Result', de: 'Ergebnis', uk: 'Результат' },
  'summary.correct':         { en: 'Correct:', de: 'Richtig:', uk: 'Правильно:' },
  'summary.again':           { en: 'Continue', de: 'Weiter', uk: 'Продовжити' },
  'summary.categories':      { en: 'Back to Menu', de: 'Zum Menü', uk: 'До меню' },
  'summary.new_unlock':      { en: '🔓 {category} unlocked!', de: '🔓 {category} freigeschaltet!', uk: '🔓 {category} розблоковано!' },

  // ── Streak ──────────────────────────────────────────────────────────────
  'streak.counter':          { en: '{n} 🔥', de: '{n} 🔥', uk: '{n} 🔥' },

  // ── Language selection ──────────────────────────────────────────────────
  'lang.select_title':       { en: 'Choose your language', de: 'Wähle deine Sprache', uk: 'Обери свою мову' },

  // ── Speed controls (legacy compat) ──────────────────────────────────────
  'speed.label':             { en: 'Speed:', de: 'Tempo:', uk: 'Швидкість:' },
  'speed.slow':              { en: 'Slow', de: 'Langsam', uk: 'Повільно' },
  'speed.normal':            { en: 'Normal', de: 'Normal', uk: 'Нормально' },
  'speed.fast':              { en: 'Fast', de: 'Schnell', uk: 'Швидко' },

  // ── Session length (legacy compat) ──────────────────────────────────────
  'session.length.label':    { en: 'Questions:', de: 'Fragen:', uk: 'Питань:' },

  // ── Error screen ────────────────────────────────────────────────────────
  'error.title':             { en: 'Speech problem', de: 'Sprachproblem', uk: 'Проблема з мовленням' },
  'error.message':           { en: 'Your browser does not support speech synthesis.', de: 'Ihr Browser unterstützt keine Sprachsynthese.', uk: 'Ваш браузер не підтримує синтез мовлення.' },
  'error.retry':             { en: 'Try again', de: 'Erneut versuchen', uk: 'Спробувати знову' },

  // ── Theme toast ─────────────────────────────────────────────────────────
  'theme.auto':              { en: 'Theme: auto', de: 'Thema: automatisch', uk: 'Тема: авто' },
  'theme.light':             { en: 'Theme: light', de: 'Thema: hell', uk: 'Тема: світла' },
  'theme.dark':              { en: 'Theme: dark', de: 'Thema: dunkel', uk: 'Тема: темна' },

  // ── Toasts / feedback ───────────────────────────────────────────────────
  'toast.offline':           { en: 'Internet connection needed for speech.', de: 'Internetverbindung für Sprache erforderlich.', uk: 'Потрібне з\'єднання з інтернетом для мовлення.' },
  'toast.tts_failed':        { en: 'Speech failed. Try again.', de: 'Sprachausgabe fehlgeschlagen.', uk: 'Помилка мовлення.' },
  'toast.no_voice_en':       { en: 'No English voice found on your device.', de: 'Keine englische Stimme gefunden.', uk: 'Не знайдено англійський голос.' },
  'toast.no_voice_de':       { en: 'No German voice found on your device.', de: 'Keine deutsche Stimme gefunden.', uk: 'Не знайдено німецький голос.' },
  'toast.no_voice_uk':       { en: 'No Ukrainian voice found on your device.', de: 'Keine ukrainische Stimme gefunden.', uk: 'Не знайдено український голос.' },

  // ── Language switchers ──────────────────────────────────────────────────
  'lang.ui_label':           { en: 'Interface:', de: 'Oberfläche:', uk: 'Інтерфейс:' },
  'lang.learn_label':        { en: 'Learning:', de: 'Lernsprache:', uk: 'Вивчаю:' },

  // ── Reading mode (legacy compat) ────────────────────────────────────────
  'reading.mode_audio':      { en: 'Audio mode', de: 'Audiomodus', uk: 'Аудіорежим' },
  'reading.mode_reading':    { en: 'Reading mode', de: 'Lesemodus', uk: 'Режим читання' },
  'reading.lang_en':         { en: 'English', de: 'Englisch', uk: 'англійської' },
  'reading.lang_de':         { en: 'German', de: 'Deutsch', uk: 'німецької' },
  'reading.lang_uk':         { en: 'Ukrainian', de: 'Ukrainisch', uk: 'української' },
};

// ── State ──────────────────────────────────────────────────────────────────

let currentUILang = 'en';
let currentLearnLang = 'en';
const SUPPORTED_LANGS = ['en', 'de', 'uk'];
const UI_LANG_KEY = 'nlt-ui-lang';
const LEARN_LANG_KEY = 'nlt-learn-lang';

// ── Initialization ─────────────────────────────────────────────────────────

export function initI18n() {
  const savedUI = localStorage.getItem(UI_LANG_KEY);
  if (savedUI && SUPPORTED_LANGS.includes(savedUI)) {
    currentUILang = savedUI;
  } else {
    currentUILang = detectBrowserLanguage();
  }

  const savedLearn = localStorage.getItem(LEARN_LANG_KEY);
  if (savedLearn && SUPPORTED_LANGS.includes(savedLearn)) {
    currentLearnLang = savedLearn;
  } else {
    currentLearnLang = 'en';
  }
}

function detectBrowserLanguage() {
  const lang = (navigator.language || 'en').toLowerCase();
  if (lang.startsWith('uk')) return 'uk';
  if (lang.startsWith('de')) return 'de';
  return 'en';
}

// ── Translation function ───────────────────────────────────────────────────

export function t(key, lang) {
  const useLang = lang || currentUILang;
  const entry = TRANSLATIONS[key];
  if (!entry) return key;
  return entry[useLang] || entry['en'] || key;
}

// ── Language getters/setters ───────────────────────────────────────────────

export function getUILang() { return currentUILang; }

export function setUILang(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  currentUILang = lang;
  localStorage.setItem(UI_LANG_KEY, lang);
  applyTranslations();
}

export function getLearnLang() { return currentLearnLang; }

export function setLearnLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  currentLearnLang = lang;
  localStorage.setItem(LEARN_LANG_KEY, lang);
}

// ── DOM translation application ────────────────────────────────────────────

export function applyTranslations() {
  document.documentElement.lang = currentUILang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translated = t(key);
    if (translated !== key) el.textContent = translated;
  });
}

export function getCategoryLabel(catId) { return t('cat.' + catId + '.label'); }
export function getCategoryDesc(catId) { return t('cat.' + catId + '.desc'); }
export function getGroupLabel(groupId) { return t('group.' + groupId); }
export function getLangName(langCode) { return t('reading.lang_' + langCode); }
