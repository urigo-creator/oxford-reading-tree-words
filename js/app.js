/* ==========================================================================
   Oxford Reading Tree 단어놀이 - 앱 로직
   ========================================================================== */

const state = {
  levelId: 'level1',
  tab: 'vocab', // 'vocab' | 'phrase'
  recorder: null,
  recordedChunks: [],
  recordedUrl: null,
  isRecording: false,
  studyList: [],
  studyIndex: 0,
  studyImageDir: '',
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* -------------------------------------------------------------------------
   레벨 탭 & Vocabulary/Phrase 서브탭 렌더링
   ------------------------------------------------------------------------- */

function renderLevelTabs() {
  const nav = $('#levelTabs');
  nav.innerHTML = LEVELS.map((lv) => {
    const theme = LEVEL_THEME_COLORS[lv.id];
    const hasData = lv.items.length > 0;
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
      if (!lv || lv.items.length === 0) {
        showComingSoon(lv);
        return;
      }
      state.levelId = lv.id;
      renderLevelTabs();
      renderSubTabs();
      renderCardGrid();
      applyLevelTheme(lv.id);
    });
  });
}

function applyLevelTheme(levelId) {
  const theme = LEVEL_THEME_COLORS[levelId];
  document.documentElement.style.setProperty('--brand-color', theme.main);
  document.documentElement.style.setProperty('--brand-soft', theme.soft);
}

function showComingSoon(lv) {
  const grid = $('#cardGrid');
  grid.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-tree">🌳</div>
      <p><strong>${lv ? lv.label : '이 레벨'}</strong> 그림카드는 아직 준비 중이에요.</p>
      <p class="empty-state-sub">Level1 처럼 하위 폴더에 그림카드를 넣고 data.js 에 등록하면 바로 열려요.</p>
    </div>
  `;
  $('#subTabs').innerHTML = '';
}

function renderSubTabs() {
  const lv = LEVELS.find((l) => l.id === state.levelId);
  const vocabCount = lv.items.filter((i) => i.type === 'vocab').length;
  const phraseCount = lv.items.filter((i) => i.type === 'phrase').length;

  $('#subTabs').innerHTML = `
    <button class="sub-tab ${state.tab === 'vocab' ? 'is-active' : ''}" data-tab="vocab">
      📚 Vocabulary <span class="sub-tab-count">${vocabCount}</span>
    </button>
    <button class="sub-tab ${state.tab === 'phrase' ? 'is-active' : ''}" data-tab="phrase">
      💬 Phrase <span class="sub-tab-count">${phraseCount}</span>
    </button>
    <button class="btn btn-study-all" id="btnStudyAll">🌳 전체 학습하기</button>
  `;

  $$('.sub-tab', $('#subTabs')).forEach((btn) => {
    btn.addEventListener('click', () => {
      state.tab = btn.dataset.tab;
      renderSubTabs();
      renderCardGrid();
    });
  });

  $('#btnStudyAll').addEventListener('click', () => {
    const items = lv.items.filter((i) => i.type === state.tab);
    if (items.length === 0) return;
    startStudySession(items, 0, lv.imageDir);
  });
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
  const lv = LEVELS.find((l) => l.id === state.levelId);
  const items = lv.items.filter((i) => i.type === state.tab);
  const grid = $('#cardGrid');

  if (items.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-tree">🍂</div><p>아직 이 탭에는 카드가 없어요.</p></div>`;
    return;
  }

  grid.innerHTML = items.map((item) => `
    <article class="card" data-id="${item.id}">
      <div class="card-image" style="${spriteStyle(item, lv.imageDir)}"></div>
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
      startStudySession(items, index, lv.imageDir);
    });
  });
}

/* -------------------------------------------------------------------------
   학습 모달 (발음 듣기 / 녹음 비교 / 영작 첨삭)
   ------------------------------------------------------------------------- */

function startStudySession(list, startIndex, imageDir) {
  state.studyList = list;
  state.studyIndex = startIndex;
  state.studyImageDir = imageDir;
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
  $('#writingInput').value = '';
  $('#feedbackBox').hidden = true;
  $('#feedbackBox').innerHTML = '';
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

function stopPronunciationPlayback() {
  if (nativeAudio) {
    nativeAudio.pause();
    nativeAudio = null;
  }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

// 발음 오디오는 원칙적으로 미리 녹음해 둔 파일(Level{N}/audio/{슬러그}.m4a)을
// 재생합니다. 기기/브라우저에 따라 브라우저 내장 음성 합성(Web Speech API)의
// 지원 여부와 설치된 음성이 제각각이라(특히 일부 안드로이드 기기는 아예
// 소리가 안 나는 경우가 있었음) 미리 만든 오디오 파일을 우선 쓰고,
// 파일이 없거나 재생에 실패할 때만 음성 합성으로 대체합니다.
let nativeAudio = null;

function speakWord(item, imageDir) {
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

  const src = `${imageDir}/audio/${slugify(item.word)}.m4a`;
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
   영작 첨삭 (Claude API 직접 호출)
   ------------------------------------------------------------------------- */

function getSettings() {
  return {
    apiKey: localStorage.getItem('ort_api_key') || '',
    model: localStorage.getItem('ort_model') || 'claude-opus-5',
  };
}

async function requestWritingFeedback() {
  const item = currentStudyItem();
  const sentence = $('#writingInput').value.trim();
  const { apiKey, model } = getSettings();
  const box = $('#feedbackBox');

  if (!sentence) {
    alert('먼저 영어 문장을 입력해 주세요.');
    return;
  }
  if (!apiKey) {
    box.hidden = false;
    box.className = 'feedback-box feedback-warn';
    box.innerHTML = `API 키가 설정되어 있지 않아요. 오른쪽 위 <strong>⚙️ 설정</strong> 에서 Claude API 키를 먼저 입력해 주세요.`;
    return;
  }

  box.hidden = false;
  box.className = 'feedback-box feedback-loading';
  box.innerHTML = `<span class="spinner"></span> 첨삭 중이에요...`;

  const systemPrompt = [
    'You are a warm, encouraging English tutor for Korean parents/teachers helping young children (ages 4-8) learn English words from the Oxford Reading Tree scheme.',
    'The learner just studied one target word or phrase and wrote a practice sentence using it.',
    'Respond ONLY in Korean, in plain text (no markdown headers), using this simple structure with line breaks:',
    '1) 첫 줄: "잘했어요!" 또는 "조금만 고쳐볼까요?" 로 시작하는 한 줄 총평',
    '2) "고친 문장: ..." (문법/표현이 이미 자연스러우면 원문 그대로 반복)',
    '3) "설명: ..." 2~3문장으로, 쉬운 말로 왜 고쳤는지 설명 (아이에게 알려줄 부모님이 이해하기 쉽게)',
    'Keep the whole response under 120 words. Be encouraging, never harsh.',
  ].join('\n');

  const userContent = `학습 단어/표현: "${item.word}"\n학습자가 만든 문장: "${sentence}"`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 512,
        system: systemPrompt,
        output_config: { effort: 'medium' },
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const msg = data && data.error && data.error.message ? data.error.message : `HTTP ${res.status}`;
      box.className = 'feedback-box feedback-warn';
      box.innerHTML = `첨삭 요청에 실패했어요: ${escapeHtml(msg)}`;
      return;
    }

    const textBlock = (data.content || []).find((b) => b.type === 'text');
    const raw = textBlock ? textBlock.text : '(응답이 비어 있어요)';
    box.className = 'feedback-box feedback-ok';
    box.innerHTML = escapeHtml(raw)
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  } catch (err) {
    box.className = 'feedback-box feedback-warn';
    box.innerHTML = `네트워크 오류로 첨삭을 받지 못했어요. (${escapeHtml(String(err.message || err))})`;
  }
}

/* -------------------------------------------------------------------------
   설정 모달 (API 키 관리)
   ------------------------------------------------------------------------- */

function openSettingsModal() {
  const { apiKey, model } = getSettings();
  $('#settingsApiKey').value = apiKey;
  $('#settingsModel').value = model;
  $('#settingsModal').showModal();
}

function saveSettings() {
  const key = $('#settingsApiKey').value.trim();
  const model = $('#settingsModel').value;
  if (key) localStorage.setItem('ort_api_key', key);
  else localStorage.removeItem('ort_api_key');
  localStorage.setItem('ort_model', model);
  $('#settingsModal').close();
}

function clearApiKey() {
  localStorage.removeItem('ort_api_key');
  $('#settingsApiKey').value = '';
}

/* -------------------------------------------------------------------------
   초기화
   ------------------------------------------------------------------------- */

function init() {
  applyLevelTheme(state.levelId);
  renderLevelTabs();
  renderSubTabs();
  renderCardGrid();

  $('#btnCloseModal').addEventListener('click', closeStudyModal);
  $('#studyModal').addEventListener('click', (e) => {
    if (e.target === $('#studyModal')) closeStudyModal();
  });
  $('#btnListenNative').addEventListener('click', () => speakWord(currentStudyItem(), state.studyImageDir));
  $('#btnListenNative2').addEventListener('click', () => speakWord(currentStudyItem(), state.studyImageDir));
  $('#btnRecord').addEventListener('click', toggleRecording);
  $('#btnGetFeedback').addEventListener('click', requestWritingFeedback);
  $('#btnPrevItem').addEventListener('click', () => goToStudyItem(-1));
  $('#btnNextItem').addEventListener('click', () => goToStudyItem(1));

  $('#btnOpenSettings').addEventListener('click', openSettingsModal);
  $('#btnCloseSettings').addEventListener('click', () => $('#settingsModal').close());
  $('#btnSaveSettings').addEventListener('click', saveSettings);
  $('#btnClearKey').addEventListener('click', clearApiKey);
  $('#settingsModal').addEventListener('click', (e) => {
    if (e.target === $('#settingsModal')) $('#settingsModal').close();
  });
}

document.addEventListener('DOMContentLoaded', init);
