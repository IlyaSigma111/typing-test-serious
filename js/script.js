const menuScreen = document.getElementById('menuScreen');
const gameScreen = document.getElementById('gameScreen');
const startBtn = document.getElementById('startBtn');
const backToMenu = document.getElementById('backToMenu');
const parallaxBg = document.getElementById('parallaxBg');
const particles = document.getElementById('particles');
const diffSel = document.getElementById('difficulty');
const catSel = document.getElementById('category');
const display = document.getElementById('textDisplay');
const input = document.getElementById('hiddenInput');
const textContainer = document.getElementById('textContainer');
const timerDisplay = document.getElementById('timerDisplay');
const timerRing = document.getElementById('timerRing');
const wpmDisplay = document.getElementById('wpmDisplay');
const accDisplay = document.getElementById('accuracyDisplay');
const progressFill = document.getElementById('progressFill');
const textSource = document.getElementById('textSource');
const textCategory = document.getElementById('textCategory');
const restartBtn = document.getElementById('restartBtn');
const overlay = document.getElementById('resultsOverlay');
const rWpm = document.getElementById('resultWpm');
const rAcc = document.getElementById('resultAccuracy');
const rRaw = document.getElementById('resultRaw');
const rChars = document.getElementById('resultChars');
const rTime = document.getElementById('resultTime');
const rErrors = document.getElementById('resultErrors');
const rRestart = document.getElementById('resultRestart');
const rNewText = document.getElementById('resultNewText');
const modeLabel = document.getElementById('modeLabel');
const closeResults = document.getElementById('closeResults');

const CIRC = 97.4;
let gameMode = localStorage.getItem('st-mode') || 'text';

function getTheme() { return localStorage.getItem('st-theme') || 'light'; }
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('st-theme', t);
  document.querySelectorAll('[name="theme"]').forEach(r => r.checked = r.value === t);
}
setTheme(getTheme());

function showScreen(s) {
  [menuScreen, gameScreen].forEach(x => x.classList.remove('active'));
  s.classList.add('active');
}

for (let i = 30; i--;) {
  const p = document.createElement('div');
  p.className = 'particle';
  p.style.cssText = `left:${Math.random()*100}%;width:${p.style.height=2+Math.random()*3+'px'};animation-duration:${15+Math.random()*25}s;animation-delay:${Math.random()*20}s`;
  particles.appendChild(p);
}
document.addEventListener('mousemove', e => {
  if (!menuScreen.classList.contains('active')) return;
  parallaxBg.style.transform = `translate(${(e.clientX/innerWidth-.5)*20}px,${(e.clientY/innerHeight-.5)*20}px)`;
});

let mode = 'text';
let timerVal = 0;
let timerStart = null;
let timerInterval = null;
let isRunning = false;
let isFinished = false;

let chars = [];
let currentIndex = 0;
let correctCount = 0;
let totalTyped = 0;
let errors = 0;

let tTotalTyped = 0;
let tCorrect = 0;
let tErrors = 0;

function getTextPool() {
  const d = diffSel.value, c = catSel.value;
  return NORMAL_TEXTS.filter(t => (d === 'all' || t.difficulty === d) && (c === 'all' || t.category === c));
}

let currentTextObj = null;

function pickText() {
  if (selectedTextObj) {
    currentTextObj = selectedTextObj;
    selectedTextObj = null;
    textSource.textContent = currentTextObj.source;
    const labels = {classic:'Классика',modern:'Современное',science:'Наука',tech:'Технологии',prose:'Проза'};
    textCategory.textContent = labels[currentTextObj.category] || currentTextObj.category;
    return currentTextObj.text;
  }
  let pool = getTextPool();
  if (!pool.length) pool = NORMAL_TEXTS;
  currentTextObj = pool[Math.floor(Math.random() * pool.length)];
  textSource.textContent = currentTextObj.source;
  const labels = {classic:'Классика',modern:'Современное',science:'Наука',tech:'Технологии',prose:'Проза'};
  textCategory.textContent = labels[currentTextObj.category] || currentTextObj.category;
  return currentTextObj.text;
}

function prepText(text) {
  chars = [...text].map(ch => ({ char: ch, status: 'pending' }));
  currentIndex = 0;
  if (mode === 'text') { correctCount = 0; totalTyped = 0; errors = 0; }
  renderText();
  updateStats();
}

function renderText() {
  display.innerHTML = chars.map((ch, i) => {
    let cls = 'char';
    if (ch.char === ' ') cls += ' space';
    if (ch.status === 'pending') cls += ' pending';
    if (ch.status === 'correct') cls += ' correct';
    if (ch.status === 'incorrect') cls += ' incorrect';
    if (i === currentIndex && !isFinished) cls += ' current';
    const txt = ch.char === ' ' ? '\u00A0' : ch.char;
    return `<span class="${cls}">${txt}</span>`;
  }).join('');
  if (!isFinished) {
    const el = display.querySelector('.char.current');
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function updateStats() {
  const elapsed = timerStart ? (Date.now() - timerStart) / 1000 : 0;
  const mins = elapsed / 60;
  const cc = mode === 'timed' ? tCorrect : correctCount;
  const tt = mode === 'timed' ? tTotalTyped : totalTyped;
  const ee = mode === 'timed' ? tErrors : errors;
  const raw = mins > 0 ? Math.round(tt / mins) : 0;
  const net = mins > 0 ? Math.round(cc / mins) : 0;
  const dnom = cc + ee;
  const acc = dnom > 0 ? Math.round(cc / dnom * 100) : 100;

  wpmDisplay.textContent = net;
  accDisplay.textContent = acc + '%';

  const idx = currentIndex;
  progressFill.style.width = chars.length > 0 ? (idx / chars.length * 100) + '%' : '0%';
}

function updateTimer() {
  if (!timerStart) return;
  const elapsed = (Date.now() - timerStart) / 1000;
  if (mode === 'text') {
    timerVal = elapsed;
    const m = Math.floor(timerVal / 60);
    const s = Math.floor(timerVal % 60);
    timerDisplay.textContent = m + ':' + String(s).padStart(2, '0');
    updateTimerRing(0);
  } else {
    timerVal = Math.max(0, 60 - elapsed);
    timerDisplay.textContent = Math.ceil(timerVal);
    updateTimerRing(timerVal);
    if (timerVal <= 0) { timerVal = 0; updateTimerRing(0); endGame(); }
  }
  updateStats();
}

function updateTimerRing(t) {
  if (mode === 'text') { timerRing.setAttribute('stroke-dashoffset', 0); return; }
  const frac = timerVal / 60;
  timerRing.setAttribute('stroke-dashoffset', CIRC * (1 - frac));
}

function stopTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }

function startGame() {
  stopTimer();
  timerStart = null;
  mode = gameMode;
  isRunning = true;
  isFinished = false;
  tTotalTyped = 0; tCorrect = 0; tErrors = 0;
  overlay.classList.remove('active');
  showScreen(gameScreen);
  loadText();
  input.value = '';
  input.focus();
  timerDisplay.textContent = mode === 'text' ? '0:00' : '60';
  updateTimerRing(0);
  modeLabel.textContent = mode === 'text' ? '⏱ ' : '⏳ ';
}

function loadText() {
  const t = pickText();
  prepText(t);
}

function endGame() {
  isRunning = false;
  isFinished = true;
  stopTimer();
  renderText();

  const elapsed = timerStart ? (Date.now() - timerStart) / 1000 : 0;
  const mins = elapsed / 60;
  const cc = mode === 'timed' ? tCorrect : correctCount;
  const tt = mode === 'timed' ? tTotalTyped : totalTyped;
  const ee = mode === 'timed' ? tErrors : errors;
  const net = mins > 0 ? Math.round(cc / mins) : 0;
  const raw = mins > 0 ? Math.round(tt / mins) : 0;
  const dnom = cc + ee;
  const acc = dnom > 0 ? Math.round(cc / dnom * 100) : 100;

  rWpm.textContent = net;
  rAcc.textContent = acc + '%';
  rRaw.textContent = raw;
  rChars.textContent = cc + '/' + (cc + ee);
  rTime.textContent = Math.round(elapsed) + 'с';
  rErrors.textContent = ee;

  overlay.classList.add('active');
}

function handleChar(char) {
  if (!isRunning || isFinished) return;
  if (currentIndex >= chars.length) return;

  if (!timerStart) { timerStart = Date.now(); timerInterval = setInterval(updateTimer, 100); }

  const normalize = c => c === 'ё' ? 'е' : c === 'Ё' ? 'Е' : c;
  const expected = chars[currentIndex].char;
  const isCorrect = normalize(char) === normalize(expected);
  totalTyped++;

  if (isCorrect) {
    if (chars[currentIndex].status !== 'correct') correctCount++;
    chars[currentIndex].status = 'correct';
    currentIndex++;
  } else {
    if (chars[currentIndex].status !== 'incorrect') errors++;
    chars[currentIndex].status = 'incorrect';
  }

  renderText();
  updateStats();

  if (currentIndex >= chars.length) {
    if (mode === 'timed') {
      tCorrect += correctCount;
      tTotalTyped += totalTyped;
      tErrors += errors;
      if (timerVal > 0) { loadText(); input.focus(); return; }
      else { endGame(); return; }
    } else {
      endGame();
    }
  }
}

input.addEventListener('keydown', e => {
  if (e.key === 'Backspace' || e.ctrlKey || e.metaKey || e.altKey) e.preventDefault();
});
input.addEventListener('input', () => {
  if (isFinished) { input.value = ''; return; }
  const v = input.value;
  if (v.length) handleChar(v[v.length - 1]);
  input.value = '';
});
textContainer.addEventListener('click', () => { if (!isFinished) input.focus(); });

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
rRestart.addEventListener('click', () => { overlay.classList.remove('active'); startGame(); });
rNewText.addEventListener('click', () => { overlay.classList.remove('active'); showScreen(menuScreen); });
backToMenu.addEventListener('click', () => { stopTimer(); isRunning = false; isFinished = true; showScreen(menuScreen); });

closeResults.addEventListener('click', () => overlay.classList.remove('active'));
overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('active'); });

document.addEventListener('keydown', e => {
  if (e.key === 'Tab') { e.preventDefault(); if (!isRunning || isFinished) startGame(); input.focus(); }
  if (e.key === 'Escape') { overlay.classList.remove('active'); settingsOverlay.classList.remove('active'); if (gameScreen.classList.contains('active')) showScreen(menuScreen); }
  if (e.key === 'Enter' && overlay.classList.contains('active')) rRestart.click();
});

const settingsOverlay = document.getElementById('settingsOverlay');
const settingsBtn = document.getElementById('settingsBtn');
const closeSettings = document.getElementById('closeSettings');

function openSettings() {
  document.querySelectorAll('[name="mode"]').forEach(r => r.checked = r.value === gameMode);
  settingsOverlay.classList.add('active');
}

settingsBtn.addEventListener('click', openSettings);
closeSettings.addEventListener('click', () => settingsOverlay.classList.remove('active'));
settingsOverlay.addEventListener('click', e => { if (e.target === settingsOverlay) settingsOverlay.classList.remove('active'); });

document.querySelectorAll('[name="mode"]').forEach(r => r.addEventListener('change', () => {
  if (r.checked) { gameMode = r.value; localStorage.setItem('st-mode', gameMode); settingsOverlay.classList.remove('active'); }
}));

document.querySelectorAll('[name="theme"]').forEach(r => r.addEventListener('change', () => {
  if (r.checked) setTheme(r.value);
}));

// ====== TEXT PICKER ======
const textPickerOverlay = document.getElementById('textPickerOverlay');
const textPickerList = document.getElementById('textPickerList');
const closeTextPicker = document.getElementById('closeTextPicker');
const pickTextBtn = document.getElementById('pickTextBtn');

let selectedTextObj = null;

function openTextPicker() {
  const pool = getTextPool();
  textPickerList.innerHTML = '';
  if (!pool.length) {
    textPickerList.innerHTML = '<div class="text-picker-empty">Нет текстов под эти фильтры</div>';
  } else {
    pool.forEach(t => {
      const item = document.createElement('div');
      item.className = 'text-picker-item' + (selectedTextObj === t ? ' selected' : '');
      const preview = t.text.length > 80 ? t.text.slice(0, 80) + '…' : t.text;
      const diffLabels = {easy:'Лёгкая',medium:'Средняя',hard:'Сложная'};
      const catLabels = {classic:'Классика',modern:'Современное',science:'Наука',tech:'Технологии',prose:'Проза'};
      item.innerHTML = `
        <div class="text-picker-item-source">${t.source}</div>
        <div class="text-picker-item-meta">${catLabels[t.category]||t.category} · ${diffLabels[t.difficulty]||t.difficulty}</div>
        <div class="text-picker-item-preview">${preview}</div>
      `;
      item.addEventListener('click', () => {
        selectedTextObj = t;
        textSource.innerHTML = t.source + ' <span class="text-picker-selected-badge">Выбран</span>';
        textPickerOverlay.classList.remove('active');
      });
      textPickerList.appendChild(item);
    });
  }
  textPickerOverlay.classList.add('active');
}

pickTextBtn.addEventListener('click', openTextPicker);
closeTextPicker.addEventListener('click', () => textPickerOverlay.classList.remove('active'));
textPickerOverlay.addEventListener('click', e => { if (e.target === textPickerOverlay) textPickerOverlay.classList.remove('active'); });

showScreen(menuScreen);
