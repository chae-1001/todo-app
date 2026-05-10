/* ═══════════════════════════════════════════════════════════
   My Tasks — script.js
   순수 Vanilla JS, 외부 의존성 없음.
═══════════════════════════════════════════════════════════ */

/* ── 1. 상수 ─────────────────────────────────────────────── */
const STORAGE_KEY = 'todos';
const FILTER_KEY  = 'todos_filter';
const SORT_KEY    = 'todos_sort';
const THEME_KEY   = 'theme';
const QUOTE_KEY   = 'daily_quote';
const CATEGORIES  = ['업무', '개인', '공부'];
// 필터 Alt+1~4 매핑
const FILTER_SHORTCUTS = { '1': '전체', '2': '업무', '3': '개인', '4': '공부' };

// 카테고리 자동 분류 키워드 목록
const CATEGORY_KEYWORDS = {
  '업무': [
    '회의', '미팅', '보고서', '기획서', '기획안', '프로젝트',
    '이메일', '발표', '계약서', '제안서', '클라이언트', '출장',
    '채용', '인사팀', '영업', '결재', '승인', '검토', '피드백',
    '예산', '고객사', '거래처', '청구서', '사무실', '직장',
  ],
  '개인': [
    '장보기', '마트', '청소', '빨래', '세탁소', '요리', '운동',
    '헬스장', '약속', '가족', '여행', '쇼핑', '병원', '친구',
    '식사', '저녁약속', '점심약속', '산책', '영화', '드라마',
    '취미', '이사', '공과금', '보험', '건강검진', '약국', '치과',
  ],
  '공부': [
    '공부', '학습', '독서', '강의', '과제', '시험', '연구',
    '논문', '수업', '강좌', '코딩', '프로그래밍', '알고리즘',
    '영어공부', '어학', '자격증', '토익', '토플', '복습', '예습',
    '인강', '학원', '숙제', '리포트', '레포트', '스터디',
  ],
};

/* ── 2. 오늘의 격언 ────────────────────────────────────────── */
const QUOTES = [
  { text: '천 리 길도 한 걸음부터',                                author: '한국 속담' },
  { text: '오늘 할 수 있는 일을 내일로 미루지 마라',               author: '벤자민 프랭클린' },
  { text: '성공은 매일 반복하는 작은 노력들의 합이다',             author: '로버트 콜리어' },
  { text: '시작이 반이다',                                         author: '아리스토텔레스' },
  { text: '계획이 없는 목표는 단지 소망일 뿐이다',                 author: '생텍쥐페리' },
  { text: '당신이 할 수 있다고 생각하면 옳고, 못 한다고 생각해도 옳다', author: '헨리 포드' },
  { text: '완벽하기를 기다리지 말고 지금 당장 시작하라',           author: '작자미상' },
  { text: '작은 진보가 쌓여 큰 변화를 만든다',                     author: '작자미상' },
  { text: '꿈꾸는 사람에게 불가능이란 없다',                       author: '작자미상' },
  { text: '지금 이 순간이 당신의 남은 인생 중 가장 젊은 날이다',   author: '작자미상' },
];

/** 오늘 날짜로 고정된 격언 반환 (localStorage에 캐시) */
function getDailyQuote() {
  const today = new Date().toDateString();
  try {
    const cached = JSON.parse(localStorage.getItem(QUOTE_KEY));
    if (cached?.date === today) return cached.quote;
  } catch { /* 파싱 실패 시 무시 */ }
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  localStorage.setItem(QUOTE_KEY, JSON.stringify({ date: today, quote }));
  return quote;
}

/** 완료율(0~100)에 따른 응원 메시지 */
function getEncouragement(pct) {
  if (pct === 100) return '🎉 완벽해요! 모든 할 일을 완료했습니다!';
  if (pct >= 80)  return '⭐ 훌륭해요! 거의 다 완료했어요.';
  if (pct >= 50)  return '🔥 절반 이상 완료! 계속 달려봐요.';
  if (pct >= 1)   return '💪 잘 하고 있어요! 화이팅!';
  return '🚀 오늘도 화이팅! 첫 번째 완료를 해봐요.';
}

/* ── 3. 스토리지 헬퍼 ───────────────────────────────────────── */
function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []; }
  catch { return []; }
}

/**
 * todos 배열을 localStorage에 저장.
 * QuotaExceededError 발생 시 사용자에게 알림.
 * 디바운스(150ms)로 연속 호출을 일괄 처리.
 */
const _flushSave = debounce(() => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch (e) {
    if (e.name === 'QuotaExceededError') showToast('⚠️ 저장 공간이 가득 찼습니다. 항목을 정리해 주세요.');
    else console.error('[save]', e);
  }
}, 150);

function save() { _flushSave(); }

function loadFilter()  { return localStorage.getItem(FILTER_KEY)  ?? '전체'; }
function saveFilter(f) { localStorage.setItem(FILTER_KEY, f); }
function loadSort()    { return localStorage.getItem(SORT_KEY)    ?? 'status'; }
function saveSort(s)   { localStorage.setItem(SORT_KEY, s); }
function loadTheme()   { return localStorage.getItem(THEME_KEY)   ?? 'light'; }
function saveTheme(t)  { localStorage.setItem(THEME_KEY, t); }

/* ── 4. 유틸리티 ────────────────────────────────────────────── */
/** 콜백을 delay ms 뒤로 지연, 연속 호출 시 재시작 */
function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/** ISO 날짜를 한국어 상대 시간 문자열로 변환 */
function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)       return '방금 전';
  if (diff < 3600)     return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400)    return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400*30) return `${Math.floor(diff / 86400)}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

/**
 * todos를 필터·검색어·정렬 기준에 따라 가공.
 * manual 모드에서는 배열 원본 순서를 유지.
 */
function sortedVisible(list, activeFilter, query, sort) {
  // 카테고리 필터
  let out = activeFilter === '전체' ? list : list.filter(t => t.category === activeFilter);
  // 검색 (대소문자 무시)
  if (query) {
    const q = query.toLowerCase();
    out = out.filter(t => t.text.toLowerCase().includes(q));
  }
  // 정렬
  if (sort === 'manual') return out; // 수동: 배열 순서 유지
  return [...out].sort((a, b) => {
    switch (sort) {
      case 'oldest':
        return new Date(a.createdAt) - new Date(b.createdAt);
      case 'category':
        if (a.category !== b.category) return a.category.localeCompare(b.category, 'ko');
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'newest':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'status':
      default:
        // 미완료 우선, 같은 상태면 최신순
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });
}

/**
 * 검색 키워드를 <mark>로 감싸 반환.
 * XSS 방지: innerHTML 대신 DOM API 사용.
 * 매칭이 없으면 null 반환 → 호출자가 textContent 사용.
 */
function highlightText(text, query) {
  if (!query) return null;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return null;
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createTextNode(text.slice(0, idx)));
  const mark = document.createElement('mark');
  mark.textContent = text.slice(idx, idx + query.length);
  frag.appendChild(mark);
  frag.appendChild(document.createTextNode(text.slice(idx + query.length)));
  return frag;
}

/**
 * 입력 텍스트의 키워드를 분석해 카테고리를 추정.
 * 매칭 키워드가 가장 많은 카테고리 반환, 없으면 null.
 */
function guessCategory(text) {
  const lower = text.toLowerCase();
  let best = null, bestCount = 0;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const count = keywords.filter(kw => lower.includes(kw)).length;
    if (count > bestCount) { bestCount = count; best = cat; }
  }
  return best;
}

/** 스크린리더용 즉시 공지 (assertive aria-live) */
function announce(msg) {
  const el = document.getElementById('sr-live');
  el.textContent = '';
  requestAnimationFrame(() => { el.textContent = msg; });
}

/* ── 5. 상태 ─────────────────────────────────────────────────── */
let todos         = load();
let filter        = loadFilter();
let sortMode      = loadSort();
let searchQuery   = '';
let editingId     = null;
let isDark        = loadTheme() === 'dark';

// 카테고리 자동 분류: 사용자가 직접 변경했으면 true → 자동 분류 억제
let userOverrideCategory = false;

// 애니메이션 추적
const pendingEnter    = new Set(); // 다음 렌더에서 slideIn 재생할 id들
let   pendingToggleId = null;      // 다음 렌더에서 togglePulse 재생할 id

// Undo 버퍼: { items: [{ todo, index }], label: string }
let undoBuffer = null;

// 드래그 & 드롭 추적
let dragSrcId  = null;

/* ── 6. DOM 참조 ─────────────────────────────────────────────── */
const todoInput      = document.getElementById('todo-input');
const addBtn         = document.getElementById('add-btn');
const categorySelect = document.getElementById('category-select');
const listEl         = document.getElementById('todo-list');
const filterBar      = document.getElementById('filter-bar');
const sortSelect     = document.getElementById('sort-select');
const searchInput    = document.getElementById('search-input');
const dashSummary    = document.getElementById('dash-summary');
const dashToday      = document.getElementById('dash-today');
const dashBar        = document.getElementById('dash-bar');
const dashBarTrack   = document.getElementById('dash-bar-track');
const dashCats       = document.getElementById('dash-cats');
const encouragement  = document.getElementById('encouragement');
const remainingBadge = document.getElementById('remaining-badge');
const listFooter     = document.getElementById('list-footer');
const clearBtn       = document.getElementById('clear-btn');
const confirmModal   = document.getElementById('confirm-modal');
const modalMsg       = document.getElementById('modal-msg');
const modalActions   = document.getElementById('modal-actions');
const themeBtn       = document.getElementById('theme-btn');
const themeIcon      = document.getElementById('theme-icon');
const exportBtn      = document.getElementById('export-btn');
const importBtn      = document.getElementById('import-btn');
const importFile     = document.getElementById('import-file');
const autoCatIndicator = document.getElementById('auto-cat-indicator');
const toast          = document.getElementById('toast');
const quoteText      = document.getElementById('quote-text');
const quoteAuthor    = document.getElementById('quote-author');

/* ── 7. 테마 ─────────────────────────────────────────────────── */
function applyTheme() {
  document.body.classList.toggle('dark', isDark);
  themeIcon.textContent = isDark ? '☀️' : '🌙';
}

function toggleTheme() {
  isDark = !isDark;
  applyTheme();
  saveTheme(isDark ? 'dark' : 'light');
  showToast(isDark ? '다크 모드로 전환됐습니다' : '라이트 모드로 전환됐습니다');
}

/* ── 8. 토스트 알림 ──────────────────────────────────────────── */
let _toastTimer = null;

/**
 * @param {string}  msg       - 표시할 메시지
 * @param {boolean} undoable  - true면 "복구" 버튼 포함
 * @param {number}  duration  - 자동 닫힘 시간(ms), undoable이면 기본 4000
 */
function showToast(msg, { undoable = false, duration } = {}) {
  clearTimeout(_toastTimer);
  toast.innerHTML = '';

  // 메시지 텍스트 (XSS: textContent 사용)
  const textEl = document.createElement('span');
  textEl.textContent = msg;
  toast.appendChild(textEl);

  // Undo 버튼
  if (undoable && undoBuffer) {
    const undoBtn = document.createElement('button');
    undoBtn.className = 'toast-undo';
    undoBtn.textContent = '복구';
    undoBtn.setAttribute('aria-label', '삭제 취소');
    undoBtn.addEventListener('click', () => { toast.classList.remove('show'); undoDelete(); });
    toast.appendChild(undoBtn);
  }

  toast.classList.add('show');
  const ms = duration ?? (undoable ? 4000 : 2200);
  _toastTimer = setTimeout(() => {
    toast.classList.remove('show');
    if (!undoable) undoBuffer = null; // undoable이 아닌 경우 버퍼 해제
  }, ms);
}

/* ── 9. 범용 확인 모달 ───────────────────────────────────────── */
let _modalTrigger = null; // 모달 종료 후 포커스 복원 대상

/**
 * 범용 모달 표시.
 * @param {string} message - 표시할 질문 텍스트
 * @param {Array}  buttons - [{ label, cls, action, focus }]
 *   cls: 'modal-btn--ok' | 'modal-btn--cancel' | 'modal-btn--safe' | 'modal-btn--neutral'
 *   focus: true이면 모달 열릴 때 이 버튼에 포커스
 */
function showModal(message, buttons) {
  _modalTrigger = document.activeElement;
  modalMsg.textContent = message;
  modalActions.innerHTML = '';

  const closeModal = () => {
    confirmModal.hidden = true;
    confirmModal.removeEventListener('keydown', trapFocus);
    _modalTrigger?.focus();
  };

  buttons.forEach(({ label, cls = '', action, focus: autoFocus }) => {
    const btn = document.createElement('button');
    btn.className = `modal-btn ${cls}`;
    btn.textContent = label;
    btn.addEventListener('click', () => { closeModal(); action?.(); });
    if (autoFocus) btn.dataset.autofocus = '1';
    modalActions.appendChild(btn);
  });

  confirmModal.hidden = false;

  // 지정된 버튼 또는 첫 번째 버튼에 포커스
  const focusTarget = modalActions.querySelector('[data-autofocus]')
                   ?? modalActions.querySelector('button');
  focusTarget?.focus();

  // 포커스 트랩: Tab이 모달 내 버튼 사이를 순환
  const focusable = () => [...modalActions.querySelectorAll('button')];
  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    const items = focusable();
    const idx = items.indexOf(document.activeElement);
    if (e.shiftKey) {
      if (idx <= 0) { e.preventDefault(); items.at(-1)?.focus(); }
    } else {
      if (idx >= items.length - 1) { e.preventDefault(); items[0]?.focus(); }
    }
  }
  confirmModal.addEventListener('keydown', trapFocus);

  // 오버레이 클릭으로 닫기
  const handleOverlay = e => { if (e.target === confirmModal) closeModal(); };
  confirmModal.addEventListener('click', handleOverlay, { once: true });

  // ESC는 전역 keydown 핸들러에서 처리
  confirmModal._close = closeModal;
}

/* ── 10. 대시보드 렌더 ────────────────────────────────────────── */
function renderDashboard() {
  const total     = todos.length;
  const done      = todos.filter(t => t.completed).length;
  const remaining = total - done;
  const pct       = total === 0 ? 0 : Math.round((done / total) * 100);

  const todayStr   = new Date().toDateString();
  const todayCount = todos.filter(t => new Date(t.createdAt).toDateString() === todayStr).length;

  // 헤더 배지
  remainingBadge.textContent = remaining;
  remainingBadge.hidden = remaining === 0;

  // 대시보드 텍스트
  dashSummary.textContent = `${done}/${total} 완료 (${pct}%)`;
  dashToday.textContent   = `오늘 추가 ${todayCount}개`;
  encouragement.textContent = getEncouragement(pct);

  // ARIA progressbar 동기화
  dashBarTrack.setAttribute('aria-valuenow', pct);

  // 프로그레스 바 — 한 프레임 뒤에 업데이트해 CSS transition 발동
  requestAnimationFrame(() => { dashBar.style.width = `${pct}%`; });

  // 완료 항목 일괄 삭제 버튼 표시 여부
  listFooter.hidden = !todos.some(t => t.completed);

  // 카테고리 미니 통계
  dashCats.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const catList = todos.filter(t => t.category === cat);
    const cTotal  = catList.length;
    const cDone   = catList.filter(t => t.completed).length;
    const cPct    = cTotal === 0 ? 0 : Math.round((cDone / cTotal) * 100);

    const div = document.createElement('div');
    div.className = 'dash-cat';
    div.innerHTML = `
      <div class="dash-cat-header">
        <span class="category-tag tag-${cat}">${cat}</span>
        <span class="dash-cat-count">${cDone}/${cTotal}</span>
      </div>
      <div class="dash-cat-bar-track" role="progressbar"
           aria-label="${cat} 진행률" aria-valuenow="${cPct}"
           aria-valuemin="0" aria-valuemax="100">
        <div class="dash-cat-bar cat-bar-${cat}"></div>
      </div>`;
    dashCats.appendChild(div);

    // double rAF: DOM 추가 직후 transition이 발동하도록
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        div.querySelector('.dash-cat-bar').style.width = `${cPct}%`;
      });
    });
  });
}

/* ── 11. 항목 빌더 ──────────────────────────────────────────────
   수동 정렬(manual) 모드의 드래그&드롭 이벤트를 li에 부착.
   HTML5 Drag and Drop API 사용, 터치 미지원(CSS로 모바일에서 핸들 숨김).
────────────────────────────────────────────────────────────────── */
function attachDragHandlers(li, todo) {
  li.setAttribute('draggable', 'true');

  li.addEventListener('dragstart', e => {
    dragSrcId = todo.id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', todo.id); // Firefox 호환
    // 한 프레임 뒤 .dragging 추가 — dragstart 직후 스타일 변경 시 드래그 이미지가 깨지는 방지
    requestAnimationFrame(() => li.classList.add('dragging'));
  });

  li.addEventListener('dragend', () => {
    dragSrcId = null;
    li.classList.remove('dragging');
    listEl.querySelectorAll('.drag-over-top, .drag-over-bottom')
          .forEach(el => el.classList.remove('drag-over-top', 'drag-over-bottom'));
  });

  li.addEventListener('dragover', e => {
    e.preventDefault();
    if (!dragSrcId || dragSrcId === todo.id) return;
    e.dataTransfer.dropEffect = 'move';

    // 마우스 Y 위치로 삽입 위치(위/아래) 결정
    const rect = li.getBoundingClientRect();
    listEl.querySelectorAll('.drag-over-top, .drag-over-bottom')
          .forEach(el => el.classList.remove('drag-over-top', 'drag-over-bottom'));
    li.classList.add(e.clientY < rect.top + rect.height / 2 ? 'drag-over-top' : 'drag-over-bottom');
  });

  li.addEventListener('dragleave', e => {
    // 자식 요소로 이동 시 오발 방지: li 밖으로 나갔을 때만 제거
    if (!li.contains(e.relatedTarget)) {
      li.classList.remove('drag-over-top', 'drag-over-bottom');
    }
  });

  li.addEventListener('drop', e => {
    e.preventDefault();
    if (!dragSrcId || dragSrcId === todo.id) return;
    const rect = li.getBoundingClientRect();
    reorderTodos(dragSrcId, todo.id, e.clientY < rect.top + rect.height / 2);
  });
}

/** 일반 보기 모드 li 생성 */
function makeViewItem(todo) {
  const li = document.createElement('li');
  li.className = `todo-item${todo.completed ? ' completed' : ''}`;
  li.dataset.id = todo.id;

  // 진입/토글 애니메이션 클래스 적용
  if (pendingEnter.has(todo.id))   li.classList.add('entering');
  if (pendingToggleId === todo.id) { li.classList.add('toggling'); pendingToggleId = null; }

  // 수동 정렬 모드: 드래그 핸들 + 드래그 이벤트
  if (sortMode === 'manual') {
    attachDragHandlers(li, todo);
  }

  // ── 드래그 핸들 (수동 모드에서 CSS로 표시) ──
  const handle = document.createElement('span');
  handle.className = 'drag-handle';
  handle.textContent = '⠿';
  handle.setAttribute('aria-hidden', 'true');

  // ── 체크박스 ──
  const checkbox = document.createElement('input');
  checkbox.type    = 'checkbox';
  checkbox.checked = todo.completed;
  checkbox.setAttribute('aria-label', `완료 토글: ${todo.text}`);
  checkbox.addEventListener('change', () => toggle(todo.id));

  // ── 카테고리 태그 ──
  const tag = document.createElement('span');
  tag.className   = `category-tag tag-${todo.category}`;
  tag.textContent = todo.category;

  // ── 텍스트 + 생성 시간 블록 ──
  const body = document.createElement('div');
  body.className = 'todo-body';

  const textSpan = document.createElement('span');
  textSpan.className = 'todo-text';
  textSpan.title     = '더블클릭으로 수정';
  // 검색어 하이라이트 (XSS-safe)
  const hl = highlightText(todo.text, searchQuery);
  if (hl) textSpan.appendChild(hl);
  else    textSpan.textContent = todo.text;
  textSpan.addEventListener('dblclick', () => startEdit(todo.id));

  const timeSpan = document.createElement('span');
  timeSpan.className   = 'todo-time';
  timeSpan.textContent = timeAgo(todo.createdAt);

  body.append(textSpan, timeSpan);

  // ── 삭제 버튼 ──
  const delBtn = document.createElement('button');
  delBtn.className = 'delete-btn';
  delBtn.textContent = '✕';
  delBtn.setAttribute('aria-label', `삭제: ${todo.text}`);
  delBtn.addEventListener('click', () => removeWithAnim(todo.id, li));

  li.append(handle, checkbox, tag, body, delBtn);
  return li;
}

/** 인라인 편집 모드 li 생성 */
function makeEditItem(todo) {
  const li = document.createElement('li');
  li.className = `todo-item editing${todo.completed ? ' completed' : ''}`;
  li.dataset.id = todo.id;

  // 카테고리 변경 select
  const editSel = document.createElement('select');
  editSel.className = 'edit-select';
  editSel.setAttribute('aria-label', '카테고리 변경');
  CATEGORIES.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat; opt.textContent = cat;
    if (cat === todo.category) opt.selected = true;
    editSel.appendChild(opt);
  });

  // 텍스트 수정 input
  const editInput = document.createElement('input');
  editInput.type        = 'text';
  editInput.className   = 'edit-input';
  editInput.value       = todo.text;
  editInput.maxLength   = 200;
  editInput.placeholder = 'Enter 저장  ·  ESC 취소';
  editInput.setAttribute('aria-label', '할 일 내용 수정');

  const hint = document.createElement('span');
  hint.className   = 'edit-hint';
  hint.textContent = 'Enter 저장  ·  ESC 취소';

  function commit() {
    const newText = editInput.value.trim();
    if (!newText) { cancel(); return; } // 빈 값이면 취소
    const changed = newText !== todo.text || editSel.value !== todo.category;
    if (changed) {
      todos = todos.map(t => t.id === todo.id
        ? { ...t, text: newText, category: editSel.value } : t);
      save();
      showToast('수정됐습니다');
      announce(`수정 완료: ${newText}`);
    }
    editingId = null;
    render();
  }

  function cancel() { editingId = null; render(); }

  editInput.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  });

  // li 외부로 포커스 이동 시 자동 저장
  li.addEventListener('focusout', e => {
    if (!li.contains(e.relatedTarget)) commit();
  });

  li.append(editSel, editInput, hint);
  // 렌더 후 input 포커스 & 전체 선택
  requestAnimationFrame(() => { editInput.focus(); editInput.select(); });
  return li;
}

/* ── 12. 메인 렌더 ─────────────────────────────────────────────
   DocumentFragment을 사용해 DOM reflow를 최소화.
   100개 이상 항목에서도 한 번의 appendChild로 처리.
────────────────────────────────────────────────────────────────── */
function render() {
  // 필터 버튼 동기화
  filterBar.querySelectorAll('.filter-btn').forEach(btn => {
    const active = btn.dataset.filter === filter;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });

  // 정렬 select 동기화
  sortSelect.value = sortMode;

  // 수동 정렬 모드 표시 클래스
  listEl.classList.toggle('is-manual', sortMode === 'manual');

  const visible = sortedVisible(todos, filter, searchQuery, sortMode);

  // Fragment로 일괄 DOM 생성 (reflow 감소)
  const frag = document.createDocumentFragment();

  if (visible.length === 0) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = searchQuery
      ? `"${searchQuery}"에 대한 검색 결과가 없습니다.`
      : todos.length === 0
        ? '할 일이 없습니다.\n추가해보세요!'
        : '이 카테고리의 할 일이 없습니다.';
    frag.appendChild(p);
  } else {
    visible.forEach(todo => {
      frag.appendChild(todo.id === editingId ? makeEditItem(todo) : makeViewItem(todo));
    });
  }

  listEl.innerHTML = '';
  listEl.appendChild(frag);

  pendingEnter.clear();
  renderDashboard();
}

/* ── 13. 액션 ──────────────────────────────────────────────────── */

/** 새 할 일 추가 (중복 감지 포함) */
function addTodo() {
  const text = todoInput.value.trim();
  if (!text) { todoInput.focus(); return; }

  // 동일 텍스트의 미완료 항목이 있으면 경고
  const dup = todos.find(t => !t.completed && t.text.toLowerCase() === text.toLowerCase());
  if (dup) {
    // 입력창 경고 스타일
    todoInput.classList.add('input-warn');
    setTimeout(() => todoInput.classList.remove('input-warn'), 1800);

    // 중복 항목이 현재 목록에 보이면 하이라이트
    const dupLi = listEl.querySelector(`[data-id="${dup.id}"]`);
    if (dupLi) {
      dupLi.classList.add('dup-highlight');
      dupLi.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setTimeout(() => dupLi.classList.remove('dup-highlight'), 1800);
    }
    showToast('⚠️ 동일한 할 일이 이미 있습니다');
    announce('중복된 할 일입니다');
    return;
  }

  const newId = crypto.randomUUID();
  todos.push({
    id:        newId,
    text,
    category:  categorySelect.value,
    completed: false,
    createdAt: new Date().toISOString(),
  });
  pendingEnter.add(newId);
  save();
  render();
  todoInput.value = '';
  todoInput.focus();
  userOverrideCategory = false;
  autoCatIndicator.hidden = true;

  const short = text.length > 22 ? text.slice(0, 22) + '…' : text;
  showToast(`"${short}" 추가됐습니다`);
  announce(`할 일 추가: ${text}`);

  // 남은 배지 bump 애니메이션
  remainingBadge.classList.remove('bump');
  requestAnimationFrame(() => remainingBadge.classList.add('bump'));
}

/** 완료/미완료 토글 */
function toggle(id) {
  pendingToggleId = id;
  todos = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
  save();
  render();
  const t = todos.find(x => x.id === id);
  announce(t?.completed ? `완료: ${t.text}` : `미완료로 변경: ${t.text}`);
}

/**
 * 삭제 애니메이션 → Undo 버퍼 저장 → 상태 즉시 업데이트.
 * animationend 후 목록 리렌더.
 */
function removeWithAnim(id, li) {
  const idx  = todos.findIndex(t => t.id === id);
  if (idx === -1) return;

  // Undo 버퍼에 삭제 항목 저장
  undoBuffer = { items: [{ todo: todos[idx], index: idx }], label: '항목' };

  todos = todos.filter(t => t.id !== id);
  save();
  renderDashboard(); // 통계 즉시 업데이트

  li.classList.add('leaving');
  li.addEventListener('animationend', () => {
    render();
    const short = undoBuffer?.items[0]?.todo.text;
    const label = short ? `"${short.length > 22 ? short.slice(0,22)+'…' : short}" 삭제됨` : '삭제됐습니다';
    showToast(label, { undoable: true });
    announce(label);
  }, { once: true });
}

/** 최근 삭제 항목 복구 */
function undoDelete() {
  if (!undoBuffer) return;
  const { items, label } = undoBuffer;
  undoBuffer = null;

  if (items.length === 1) {
    // 단일 항목: 원래 위치 복원 (최대한)
    const { todo, index } = items[0];
    todos.splice(Math.min(index, todos.length), 0, todo);
    pendingEnter.add(todo.id); // 복구 항목 slideIn 애니메이션
  } else {
    // 일괄 삭제: 맨 뒤에 추가
    items.forEach(({ todo }) => {
      todos.push(todo);
      pendingEnter.add(todo.id);
    });
  }

  save();
  render();
  const msg = items.length === 1
    ? `"${items[0].todo.text.slice(0, 22)}" 복구됐습니다`
    : `${items.length}개 항목 복구됐습니다`;
  showToast(msg);
  announce(msg);
}

/** 완료 항목 일괄 삭제 (Undo 지원) */
function clearCompleted() {
  const completed = todos.filter(t => t.completed);
  if (!completed.length) return;

  // 원래 인덱스 포함해 Undo 버퍼 구성
  undoBuffer = {
    items: completed.map(todo => ({ todo, index: todos.indexOf(todo) })),
    label: `완료된 ${completed.length}개 항목`,
  };

  todos = todos.filter(t => !t.completed);
  save();
  render();
  showToast(`완료된 항목 ${completed.length}개 삭제됨`, { undoable: true, duration: 4000 });
  announce(`완료된 항목 ${completed.length}개가 삭제됐습니다`);
}

/** 인라인 편집 시작 */
function startEdit(id) {
  editingId = id;
  render();
}

/** 카테고리 필터 변경 */
function setFilter(value) {
  filter = value;
  saveFilter(filter);
  editingId = null;
  render();
}

/** 정렬 모드 변경 */
function setSort(value) {
  sortMode = value;
  saveSort(sortMode);
  editingId = null;
  render();
}

/**
 * 드래그&드롭으로 수동 재정렬.
 * srcId 항목을 targetId 항목의 앞(insertBefore=true) 또는 뒤에 삽입.
 */
function reorderTodos(srcId, targetId, insertBefore) {
  const src = todos.find(t => t.id === srcId);
  if (!src) return;

  todos = todos.filter(t => t.id !== srcId);
  const tgtIdx = todos.findIndex(t => t.id === targetId);

  if (tgtIdx === -1) {
    todos.push(src);
  } else {
    todos.splice(insertBefore ? tgtIdx : tgtIdx + 1, 0, src);
  }

  save();
  render();
  showToast('순서를 변경했습니다');
}

/* ── 14. 데이터 내보내기 / 가져오기 ──────────────────────────── */

/** todos 배열을 JSON 파일로 다운로드 */
function exportData() {
  const payload = {
    version:    1,
    exportedAt: new Date().toISOString(),
    appName:    'My Tasks',
    todos,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {
    href:     url,
    download: `my-tasks-${new Date().toISOString().slice(0, 10)}.json`,
  });
  a.click();
  URL.revokeObjectURL(url);
  showToast('데이터를 파일로 내보냈습니다');
  announce('데이터 내보내기 완료');
}

/**
 * FileReader로 JSON 파일 파싱 → 검증 → 모달로 처리 방식 선택.
 * 지원 형식: { version:1, todos:[...] } 또는 직접 배열 [...].
 */
function importData(file) {
  if (!file) return;

  const reader = new FileReader();

  reader.onload = e => {
    let parsed;
    try {
      parsed = JSON.parse(e.target.result);
    } catch {
      showToast('⚠️ 올바른 JSON 파일이 아닙니다');
      return;
    }

    // 형식 정규화
    const rawList = Array.isArray(parsed) ? parsed
                  : Array.isArray(parsed?.todos) ? parsed.todos
                  : null;

    if (!rawList) {
      showToast('⚠️ 파일 형식을 인식할 수 없습니다');
      return;
    }

    // 항목 유효성 검사 및 정규화
    const imported = rawList
      .filter(t => t && typeof t.text === 'string' && t.text.trim())
      .map(t => ({
        id:        typeof t.id === 'string' ? t.id : crypto.randomUUID(),
        text:      t.text.trim().slice(0, 200),
        category:  CATEGORIES.includes(t.category) ? t.category : '개인',
        completed: Boolean(t.completed),
        createdAt: t.createdAt && !isNaN(Date.parse(t.createdAt))
                   ? t.createdAt : new Date().toISOString(),
      }));

    if (!imported.length) {
      showToast('⚠️ 가져올 수 있는 항목이 없습니다');
      return;
    }

    // 처리 방식 선택 모달
    showModal(
      `${imported.length}개의 할 일을 가져옵니다.\n현재 데이터(${todos.length}개)를 어떻게 처리할까요?`,
      [
        {
          label: '백업 후 가져오기',
          cls: 'modal-btn--safe',
          focus: true,
          action: () => {
            exportData();               // 현재 데이터 먼저 백업
            setTimeout(() => {
              todos = imported;
              save();
              render();
              showToast(`${imported.length}개 항목을 가져왔습니다`);
            }, 600);
          },
        },
        {
          label: '바로 가져오기',
          cls: 'modal-btn--neutral',
          action: () => {
            todos = imported;
            save();
            render();
            showToast(`${imported.length}개 항목을 가져왔습니다`);
          },
        },
        { label: '취소', cls: 'modal-btn--cancel', action: null },
      ]
    );
  };

  reader.onerror = () => showToast('⚠️ 파일을 읽을 수 없습니다');
  reader.readAsText(file);

  // 같은 파일 재선택 가능하도록 초기화
  importFile.value = '';
}

/* ── 15. 격언 초기 렌더 ──────────────────────────────────────── */
function renderQuote() {
  const q = getDailyQuote();
  quoteText.textContent   = `"${q.text}"`;
  quoteAuthor.textContent = q.author;
}

/* ── 16. 이벤트 리스너 ───────────────────────────────────────── */

// 할 일 추가
addBtn.addEventListener('click', addTodo);
todoInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(); });

// 카테고리 필터 (이벤트 위임)
filterBar.addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn');
  if (btn) setFilter(btn.dataset.filter);
});

// 정렬
sortSelect.addEventListener('change', () => setSort(sortSelect.value));

// 검색 — 200ms 디바운스로 연속 입력 최적화
searchInput.addEventListener('input', debounce(e => {
  searchQuery = e.target.value.trim();
  editingId   = null;
  render();
}, 200));

// 카테고리 자동 분류 — 한글 IME 조합이 끝난 뒤에만 DOM 변경 (중복 입력 방지)
const _debouncedAutoCategory = debounce(() => {
  const text = todoInput.value.trim();
  if (!text) {
    userOverrideCategory = false;
    autoCatIndicator.hidden = true;
    return;
  }
  if (userOverrideCategory) return;
  const guessed = guessCategory(text);
  if (guessed && guessed !== categorySelect.value) {
    categorySelect.value = guessed;
    autoCatIndicator.hidden = false;
  } else if (!guessed) {
    autoCatIndicator.hidden = true;
  }
}, 150);

todoInput.addEventListener('input', e => {
  if (e.isComposing) return; // 한글 IME 조합 중 DOM 변경 → 글자 중복 오류 방지
  _debouncedAutoCategory();
});

// 사용자가 카테고리 select를 직접 바꾸면 자동 분류 비활성화
categorySelect.addEventListener('change', () => {
  userOverrideCategory = true;
  autoCatIndicator.hidden = true;
});

// 테마 토글
themeBtn.addEventListener('click', toggleTheme);

// 완료 항목 일괄 삭제
clearBtn.addEventListener('click', () => {
  showModal('완료된 항목을 모두 삭제할까요?', [
    { label: '삭제', cls: 'modal-btn--ok', focus: true, action: clearCompleted },
    { label: '취소', cls: 'modal-btn--cancel', action: null },
  ]);
});

// 내보내기
exportBtn.addEventListener('click', exportData);

// 가져오기: 버튼 클릭 → 숨겨진 file input 트리거
importBtn.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', e => importData(e.target.files[0]));

// 모달 ESC 닫기
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !confirmModal.hidden) {
    confirmModal._close?.();
  }
});

// 모달 오버레이 클릭 (ESC와 별개로 중복 보호)
confirmModal.addEventListener('click', e => {
  if (e.target === confirmModal) confirmModal._close?.();
});

// 탭 닫히기 직전 pending save 강제 flush
window.addEventListener('beforeunload', () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
});

/* ── 17. 키보드 단축키 ──────────────────────────────────────────
   Alt+N : 입력창 포커스
   Alt+1~4: 필터 전환 (전체/업무/개인/공부)
   Alt+D  : 다크 모드 토글
   편집 중(editingId 존재)에는 비활성화해 충돌 방지.
────────────────────────────────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (!e.altKey || e.ctrlKey || e.metaKey) return;
  if (editingId) return; // 인라인 편집 중 단축키 비활성

  switch (e.key) {
    case 'n': case 'N':
      e.preventDefault();
      todoInput.focus();
      todoInput.select();
      showToast('새 할 일 입력 (Alt+N)');
      break;
    case 'd': case 'D':
      e.preventDefault();
      toggleTheme();
      break;
    default:
      if (FILTER_SHORTCUTS[e.key]) {
        e.preventDefault();
        const target = FILTER_SHORTCUTS[e.key];
        setFilter(target);
        showToast(`필터: ${target}`);
        announce(`카테고리 필터: ${target}`);
      }
  }
});

/* ── 18. 초기화 ─────────────────────────────────────────────────── */
applyTheme();       // 저장된 테마 즉시 적용 (FOUC 방지)
renderQuote();      // 오늘의 격언 표시
sortSelect.value = sortMode; // 저장된 정렬 기준 복원
render();           // 전체 UI 렌더
