/* ==========================================================================
   Oxford Reading Tree 단어놀이 - 앱 로직
   ========================================================================== */

const QUIZ_ROUND_SIZE = 10;

const QUIZ_TYPES = [
  {
    id: 'en2ko',
    emoji: '🇬🇧 → 🇰🇷',
    title: '영어 → 한글 뜻',
    desc: '영어 단어나 표현을 보고 알맞은 한글 뜻을 골라보세요.',
    pool: (items) => items,
    prompt: (item) => item.word,
    answer: (item) => item.ko,
  },
  {
    id: 'ko2en',
    emoji: '🇰🇷 → 🇬🇧',
    title: '한글 → 영어',
    desc: '한글 뜻을 보고 알맞은 영어 단어나 표현을 골라보세요.',
    pool: (items) => items,
    prompt: (item) => item.ko,
    answer: (item) => item.word,
  },
  {
    id: 'sentence',
    emoji: '📝',
    title: '문장 고르기',
    desc: '한글 뜻을 보고 올바른 영어 표현을 골라보세요. (구/문장 표현 한정)',
    pool: (items) => items.filter((i) => i.word.includes(' ')),
    prompt: (item) => item.ko,
    answer: (item) => item.word,
  },
];

const state = {
  levelId: 'level1',
  unitId: null,
  bookId: null,
  mode: 'cards', // 'cards' | 'quiz'
  recorder: null,
  recordedChunks: [],
  recordedUrl: null,
  isRecording: false,
  studyList: [],
  studyIndex: 0,
  studyImageDir: '',
  studyAudioDir: '',
  quiz: { type: null, questions: [], index: 0, score: 0, answered: false },
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* -------------------------------------------------------------------------
   현재 선택 상태 helper
   ------------------------------------------------------------------------- */

function currentLevel() {
  return LEVELS.find((l) => l.id === state.levelId);
}
function currentUnit() {
  const lv = currentLevel();
  return lv.units.find((u) => u.id === state.unitId) || null;
}
function currentBook() {
  const unit = currentUnit();
  if (!unit) return null;
  return unit.books.find((b) => b.id === state.bookId) || null;
}
function currentImageDir() {
  return `${currentLevel().dirName}/${currentUnit().dirName}`;
}
function currentAudioDir() {
  return `${currentLevel().dirName}/audio`;
}

/* -------------------------------------------------------------------------
   레벨 탭
   ------------------------------------------------------------------------- */

function renderLevelTabs() {
  const nav = $('#levelTabs');
  nav.innerHTML = LEVELS.map((lv) => {
    const theme = LEVEL_THEME_COLORS[lv.id];
    const hasData = lv.units.length > 0;
    const active = lv.id === state.levelId;
    return `
      <button
        class="level-tab ${active ? 'is-active' : ''} ${hasData ? '' : 'is-empty'}"
        data-level="${lv.id}"
        style="--tab-color:${theme.main}; --tab-soft:${theme.soft};"
        ${hasData ? '' : 'aria-disabled="true"'}
      >
        <span class="level-tab-leaf">🍃</span>
        <span>${lv.label}</span>
        ${hasData ? '' : '<span class="level-tab-badge">준비중</span>'}
      </button>
    `;
  }).join('');

  $$('.level-tab', nav).forEach((btn) => {
    btn.addEventListener('click', () => {
      const lv = LEVELS.find((l) => l.id === btn.dataset.level);
      if (!lv || lv.units.length === 0) {
        showLevelComingSoon(lv);
        return;
      }
      state.levelId = lv.id;
      state.unitId = lv.units[0].id;
      state.bookId = lv.units[0].books[0] ? lv.units[0].books[0].id : null;
      state.mode = 'cards';
      resetQuiz();
      renderLevelTabs();
      renderUnitTabs();
      renderBookTabs();
      renderSubTabs();
      renderMainArea();
      applyLevelTheme(lv.id);
    });
  });
}

function applyLevelTheme(levelId) {
  const theme = LEVEL_THEME_COLORS[levelId];
  document.documentElement.style.setProperty('--brand-color', theme.main);
  document.documentElement.style.setProperty('--brand-soft', theme.soft);
}

function showLevelComingSoon(lv) {
  $('#quizArea').hidden = true;
  $('#cardGrid').hidden = false;
  $('#cardGrid').innerHTML = `
    <div class="empty-state">
      <div class="empty-state-tree">🌳</div>
      <p><strong>${lv ? lv.label : '이 레벨'}</strong> 은 아직 준비 중이에요.</p>
      <p class="empty-state-sub">Level1 처럼 유닛/책 폴더에 그림카드를 넣고 data.js 에 등록하면 바로 열려요.</p>
    </div>
  `;
  $('#unitTabs').innerHTML = '';
  $('#bookTabs').innerHTML = '';
  $('#subTabs').innerHTML = '';
}

/* -------------------------------------------------------------------------
   유닛 탭
   ------------------------------------------------------------------------- */

function renderUnitTabs() {
  const lv = currentLevel();
  const nav = $('#unitTabs');
  nav.innerHTML = lv.units.map((u) => {
    const active = u.id === state.unitId;
    const hasBooks = u.books.length > 0;
    return `
      <button class="unit-tab ${active ? 'is-active' : ''} ${hasBooks ? '' : 'is-empty'}" data-unit="${u.id}">
        <span>${escapeHtml(u.label)}</span>
        ${hasBooks ? '' : '<span class="level-tab-badge">준비중</span>'}
      </button>
    `;
  }).join('');

  $$('.unit-tab', nav).forEach((btn) => {
    btn.addEventListener('click', () => {
      const unit = lv.units.find((u) => u.id === btn.dataset.unit);
      state.unitId = unit.id;
      state.bookId = unit.books[0] ? unit.books[0].id : null;
      state.mode = 'cards';
      resetQuiz();
      renderUnitTabs();
      renderBookTabs();
      renderSubTabs();
      renderMainArea();
    });
  });
}

function showUnitComingSoon(unit) {
  $('#quizArea').hidden = true;
  $('#cardGrid').hidden = false;
  $('#cardGrid').innerHTML = `
    <div class="empty-state">
      <div class="empty-state-tree">🌳</div>
      <p><strong>${unit ? unit.label : '이 유닛'}</strong> 책들은 아직 준비 중이에요.</p>
      <p class="empty-state-sub">이 유닛 폴더에 책별 그림카드를 넣고 data.js 에 등록하면 바로 열려요.</p>
    </div>
  `;
  $('#bookTabs').innerHTML = '';
  $('#subTabs').innerHTML = '';
}

/* -------------------------------------------------------------------------
   책 탭
   ------------------------------------------------------------------------- */

function renderBookTabs() {
  const unit = currentUnit();
  const nav = $('#bookTabs');
  if (unit.books.length === 0) {
    nav.innerHTML = '';
    return;
  }
  nav.innerHTML = unit.books.map((b) => {
    const active = b.id === state.bookId;
    return `<button class="book-tab ${active ? 'is-active' : ''}" data-book="${b.id}">📖 ${escapeHtml(b.title)}</button>`;
  }).join('');

  $$('.book-tab', nav).forEach((btn) => {
    btn.addEventListener('click', () => {
      state.bookId = btn.dataset.book;
      state.mode = 'cards';
      resetQuiz();
      renderBookTabs();
      renderSubTabs();
      renderMainArea();
    });
  });
}

/* -------------------------------------------------------------------------
   카드/퀴즈 모드 전환 탭 ("전체 학습하기" 포함)
   ------------------------------------------------------------------------- */

function renderSubTabs() {
  const book = currentBook();
  const subTabsEl = $('#subTabs');
  if (!book) {
    subTabsEl.innerHTML = '';
    return;
  }
  const count = book.items.length;
  const showStudyAll = state.mode !== 'quiz';

  subTabsEl.innerHTML = `
    <button class="sub-tab ${state.mode === 'cards' ? 'is-active' : ''}" data-mode="cards">
      📚 카드 <span class="sub-tab-count">${count}</span>
    </button>
    <button class="sub-tab ${state.mode === 'quiz' ? 'is-active' : ''}" data-mode="quiz">
      🎯 퀴즈
    </button>
    ${showStudyAll ? '<button class="btn btn-study-all" id="btnStudyAll">🌳 전체 학습하기</button>' : ''}
  `;

  $$('.sub-tab', subTabsEl).forEach((btn) => {
    btn.addEventListener('click', () => {
      const enteringQuiz = btn.dataset.mode === 'quiz' && state.mode !== 'quiz';
      state.mode = btn.dataset.mode;
      if (enteringQuiz) resetQuiz();
      renderSubTabs();
      renderMainArea();
    });
  });

  if (showStudyAll) {
    $('#btnStudyAll').addEventListener('click', () => {
      if (book.items.length === 0) return;
      startStudySession(book.items, 0, currentImageDir(), currentAudioDir());
    });
  }
}

function renderMainArea() {
  const unit = currentUnit();
  if (unit.books.length === 0) {
    showUnitComingSoon(unit);
    return;
  }
  const isQuiz = state.mode === 'quiz';
  $('#cardGrid').hidden = isQuiz;
  $('#quizArea').hidden = !isQuiz;
  if (isQuiz) renderQuizArea();
  else renderCardGrid();
}

/* -------------------------------------------------------------------------
   스프라이트 카드(그림카드 낱장) 렌더링
   ------------------------------------------------------------------------- */

function spriteStyle(item, imageDir) {
  const { file, x, y, w, h, sheetW, sheetH, aspect } = item.sheet;
  const bgSizeX = (sheetW / w) * 100;
  const bgSizeY = (sheetH / h) * 100;
  const bgPosX = sheetW === w ? 0 : (x / (sheetW - w)) * 100;
  const bgPosY = sheetH === h ? 0 : (y / (sheetH - h)) * 100;
  const url = `${imageDir}/${encodeURIComponent(file)}`;
  return `aspect-ratio:${aspect}; background-image:url('${url}'); background-size:${bgSizeX}% ${bgSizeY}%; background-position:${bgPosX}% ${bgPosY}%;`;
}

function renderCardGrid() {
  const book = currentBook();
  const imageDir = currentImageDir();
  const audioDir = currentAudioDir();
  const items = book.items;
  const grid = $('#cardGrid');

  if (items.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-tree">🍂</div><p>아직 이 책에는 카드가 없어요.</p></div>`;
    return;
  }

  grid.innerHTML = items.map((item) => `
    <article class="card" data-id="${item.id}">
      <div class="card-image" style="${spriteStyle(item, imageDir)}"></div>
      <div class="card-body">
        <h3 class="card-word">${escapeHtml(item.word)}</h3>
        <p class="card-ko">${escapeHtml(item.ko)}</p>
        <button class="btn btn-study" data-id="${item.id}">🌱 학습하기</button>
      </div>
    </article>
  `).join('');

  $$('.btn-study', grid).forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = items.findIndex((i) => i.id === btn.dataset.id);
      startStudySession(items, index, imageDir, audioDir);
    });
  });
}

/* -------------------------------------------------------------------------
   학습 모달 (발음 듣기 / 녹음 비교)
   ------------------------------------------------------------------------- */

function startStudySession(list, startIndex, imageDir, audioDir) {
  state.studyList = list;
  state.studyIndex = startIndex;
  state.studyImageDir = imageDir;
  state.studyAudioDir = audioDir;
  renderStudyModalContent();
  $('#studyModal').showModal();
}

function currentStudyItem() {
  return state.studyList[state.studyIndex];
}

function renderStudyModalContent() {
  const item = currentStudyItem();
  if (!item) return;
  resetRecordingState();

  $('#modalImage').setAttribute('style', spriteStyle(item, state.studyImageDir));
  $('#modalWord').textContent = item.word;
  $('#modalKo').textContent = item.ko;
  $('#studyCounter').textContent = `${state.studyIndex + 1} / ${state.studyList.length}`;
  $('#recordPlayback').hidden = true;
  $('#recordCompareRow').hidden = true;

  stopPronunciationPlayback();
}

function goToStudyItem(delta) {
  const len = state.studyList.length;
  if (len === 0) return;
  state.studyIndex = (state.studyIndex + delta + len) % len;
  renderStudyModalContent();
}

function closeStudyModal() {
  $('#studyModal').close();
  stopRecordingIfActive();
  stopPronunciationPlayback();
}

// 발음 오디오는 원칙적으로 미리 녹음해 둔 파일(Level{N}/audio/{슬러그}.m4a)을
// 재생합니다. 기기/브라우저에 따라 브라우저 내장 음성 합성(Web Speech API)의
// 지원 여부와 설치된 음성이 제각각이라(특히 일부 안드로이드 기기는 아예
// 소리가 안 나는 경우가 있었음) 미리 만든 오디오 파일을 우선 쓰고,
// 파일이 없거나 재생에 실패할 때만 음성 합성으로 대체합니다.
let nativeAudio = null;

function speakWord(item, audioDir) {
  if (nativeAudio) {
    nativeAudio.pause();
    nativeAudio = null;
  }
  let fellBack = false;
  const fallbackToTTS = () => {
    if (fellBack) return;
    fellBack = true;
    speakWithBrowserTTS(item.word);
  };

  const src = `${audioDir}/${slugify(item.word)}.m4a`;
  const audio = new Audio(src);
  nativeAudio = audio;
  audio.addEventListener('error', fallbackToTTS);
  audio.play().catch(fallbackToTTS);
}

function speakWithBrowserTTS(text) {
  if (!('speechSynthesis' in window)) {
    alert('이 브라우저는 발음을 재생할 수 없어요. Chrome / Edge / Safari 최신 버전을 사용해 보세요.');
    return;
  }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'en-GB';
  utter.rate = 0.85;
  utter.pitch = 1.05;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find((v) => v.lang === 'en-GB') || voices.find((v) => v.lang && v.lang.startsWith('en'));
  if (preferred) utter.voice = preferred;
  window.speechSynthesis.speak(utter);
}

function stopPronunciationPlayback() {
  if (nativeAudio) {
    nativeAudio.pause();
    nativeAudio = null;
  }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

// 일부 브라우저는 getVoices() 가 비동기로 채워지므로 미리 한 번 불러둠
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

async function toggleRecording() {
  if (state.isRecording) {
    state.recorder.stop();
    return;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('이 브라우저/환경에서는 마이크 녹음을 지원하지 않아요. (http://localhost 로 접속했는지 확인해 주세요)');
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    state.recordedChunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) state.recordedChunks.push(e.data); };
    recorder.onstop = () => {
      // Safari 는 audio/mp4 로, Chrome/Firefox 는 보통 audio/webm 으로 녹음하므로
      // Blob 의 타입은 recorder 가 실제로 사용한 mimeType 을 그대로 써야
      // 녹음 재생이 깨지지 않습니다.
      const blob = new Blob(state.recordedChunks, { type: recorder.mimeType || 'audio/webm' });
      if (state.recordedUrl) URL.revokeObjectURL(state.recordedUrl);
      state.recordedUrl = URL.createObjectURL(blob);
      $('#recordPlayback').src = state.recordedUrl;
      $('#recordPlayback').hidden = false;
      $('#recordCompareRow').hidden = false;
      stream.getTracks().forEach((t) => t.stop());
      state.isRecording = false;
      updateRecordButton();
    };
    recorder.start();
    state.recorder = recorder;
    state.isRecording = true;
    updateRecordButton();
  } catch (err) {
    alert('마이크 권한을 허용해야 녹음할 수 있어요.');
  }
}

function stopRecordingIfActive() {
  if (state.isRecording && state.recorder) {
    state.recorder.stop();
  }
}

function resetRecordingState() {
  stopRecordingIfActive();
  state.isRecording = false;
  if (state.recordedUrl) {
    URL.revokeObjectURL(state.recordedUrl);
    state.recordedUrl = null;
  }
  updateRecordButton();
}

function updateRecordButton() {
  const btn = $('#btnRecord');
  if (!btn) return;
  btn.classList.toggle('is-recording', state.isRecording);
  btn.textContent = state.isRecording ? '⏹ 녹음 종료' : '🎤 내 발음 녹음하기';
}

/* -------------------------------------------------------------------------
   퀴즈 (현재 선택된 책의 단어들로 출제)
   ------------------------------------------------------------------------- */

function resetQuiz() {
  state.quiz = { type: null, questions: [], index: 0, score: 0, answered: false };
}

function buildQuizQuestions(quizType, items) {
  const pool = quizType.pool(items);
  const roundSize = Math.min(QUIZ_ROUND_SIZE, pool.length);
  const chosen = shuffle(pool.slice()).slice(0, roundSize);

  return chosen.map((item) => {
    const correctText = quizType.answer(item);
    const norm = (s) => s.trim().toLowerCase();
    const distractorPool = pool.filter((p) => p !== item && norm(quizType.answer(p)) !== norm(correctText));
    const distractors = shuffle(distractorPool.slice()).slice(0, 3).map((p) => quizType.answer(p));
    const options = shuffle([correctText, ...distractors]);
    return { promptText: quizType.prompt(item), correctText, options };
  });
}

function renderQuizArea() {
  const container = $('#quizArea');
  if (!state.quiz.type) {
    renderQuizTypeSelect(container);
  } else if (state.quiz.index >= state.quiz.questions.length) {
    renderQuizResult(container);
  } else {
    renderQuizQuestion(container);
  }
}

function renderQuizTypeSelect(container) {
  const book = currentBook();
  container.innerHTML = `
    <div class="quiz-type-grid">
      ${QUIZ_TYPES.map((qt) => {
        const poolSize = qt.pool(book.items).length;
        const disabled = poolSize < 4;
        return `
          <button class="quiz-type-card" data-quiz-type="${qt.id}" ${disabled ? 'disabled aria-disabled="true"' : ''}>
            <span class="quiz-type-emoji">${qt.emoji}</span>
            <div class="quiz-type-title">${qt.title}</div>
            <div class="quiz-type-desc">${qt.desc}</div>
          </button>
        `;
      }).join('')}
    </div>
  `;
  $$('.quiz-type-card:not([disabled])', container).forEach((btn) => {
    btn.addEventListener('click', () => startQuiz(btn.dataset.quizType));
  });
}

function startQuiz(typeId) {
  const book = currentBook();
  const quizType = QUIZ_TYPES.find((q) => q.id === typeId);
  const questions = buildQuizQuestions(quizType, book.items);
  state.quiz = { type: quizType, questions, index: 0, score: 0, answered: false };
  renderQuizArea();
}

function renderQuizQuestion(container) {
  const { questions, index, type } = state.quiz;
  const q = questions[index];
  const progressPct = Math.round((index / questions.length) * 100);

  container.innerHTML = `
    <div class="quiz-session">
      <div class="quiz-top-row">
        <button class="quiz-back-link" id="quizBackLink">← 퀴즈 종류 다시 고르기</button>
        <span class="quiz-progress-text">${index + 1} / ${questions.length}</span>
      </div>
      <div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:${progressPct}%"></div></div>
      <div class="quiz-prompt-card">
        <p class="quiz-prompt-label">${escapeHtml(type.title)}</p>
        <p class="quiz-prompt-text">${escapeHtml(q.promptText)}</p>
      </div>
      <div class="quiz-options">
        ${q.options.map((opt) => `<button class="quiz-option" data-opt="${escapeHtml(opt)}">${escapeHtml(opt)}</button>`).join('')}
      </div>
      <div class="quiz-next-row" id="quizNextRow" hidden>
        <button class="btn btn-quiz-next" id="btnQuizNext">다음 문제 →</button>
      </div>
    </div>
  `;

  $('#quizBackLink').addEventListener('click', () => {
    resetQuiz();
    renderQuizArea();
  });
  $$('.quiz-option', container).forEach((btn) => {
    btn.addEventListener('click', () => selectQuizAnswer(btn.dataset.opt));
  });
  $('#btnQuizNext').addEventListener('click', () => {
    state.quiz.index += 1;
    state.quiz.answered = false;
    renderQuizArea();
  });
}

function selectQuizAnswer(selectedText) {
  if (state.quiz.answered) return;
  state.quiz.answered = true;
  const q = state.quiz.questions[state.quiz.index];
  if (selectedText === q.correctText) state.quiz.score += 1;

  $$('.quiz-option').forEach((btn) => {
    btn.disabled = true;
    if (btn.dataset.opt === q.correctText) btn.classList.add('is-correct');
    else if (btn.dataset.opt === selectedText) btn.classList.add('is-wrong');
  });
  $('#quizNextRow').hidden = false;
}

function renderQuizResult(container) {
  const { questions, score, type } = state.quiz;
  const total = questions.length;
  const pct = Math.round((score / total) * 100);
  let emoji = '🌱';
  let message = '다시 도전해봐요!';
  if (pct >= 90) { emoji = '🌟'; message = '최고예요! 완벽해요!'; }
  else if (pct >= 70) { emoji = '🎉'; message = '아주 잘했어요!'; }
  else if (pct >= 50) { emoji = '👍'; message = '잘하고 있어요, 조금만 더!'; }

  container.innerHTML = `
    <div class="quiz-result">
      <div class="quiz-result-emoji">${emoji}</div>
      <div class="quiz-result-score">${total}문제 중 ${score}개 정답 (${pct}점)</div>
      <p class="quiz-result-message">${message}</p>
      <div class="quiz-result-actions">
        <button class="btn btn-secondary" id="btnQuizChangeType">퀴즈 종류 다시 고르기</button>
        <button class="btn btn-primary" id="btnQuizRetry">다시 풀기</button>
      </div>
    </div>
  `;

  $('#btnQuizChangeType').addEventListener('click', () => {
    resetQuiz();
    renderQuizArea();
  });
  $('#btnQuizRetry').addEventListener('click', () => startQuiz(type.id));
}

/* -------------------------------------------------------------------------
   초기화
   ------------------------------------------------------------------------- */

function init() {
  const lv = currentLevel();
  state.unitId = lv.units[0].id;
  const firstUnit = lv.units[0];
  state.bookId = firstUnit.books[0] ? firstUnit.books[0].id : null;

  applyLevelTheme(state.levelId);
  renderLevelTabs();
  renderUnitTabs();
  renderBookTabs();
  renderSubTabs();
  renderMainArea();

  $('#btnCloseModal').addEventListener('click', closeStudyModal);
  $('#studyModal').addEventListener('click', (e) => {
    if (e.target === $('#studyModal')) closeStudyModal();
  });
  $('#btnListenNative').addEventListener('click', () => speakWord(currentStudyItem(), state.studyAudioDir));
  $('#btnListenNative2').addEventListener('click', () => speakWord(currentStudyItem(), state.studyAudioDir));
  $('#btnRecord').addEventListener('click', toggleRecording);
  $('#btnPrevItem').addEventListener('click', () => goToStudyItem(-1));
  $('#btnNextItem').addEventListener('click', () => goToStudyItem(1));
}

document.addEventListener('DOMContentLoaded', init);
