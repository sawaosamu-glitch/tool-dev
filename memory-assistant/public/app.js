// C-09 StaticUI: ビルド不要の素のJS。ユーザー入力の描画は必ずtextContent/DOM APIで行いinnerHTMLへの生挿入は行わない（C-SEC-003, C-BAN-002）

const state = { notes: [], tag: '', mode: 'list' /* 'list' | 'search' */ };

const el = {
  ollamaStatus: document.getElementById('ollamaStatus'),
  askForm: document.getElementById('askForm'),
  askInput: document.getElementById('askInput'),
  askResult: document.getElementById('askResult'),
  uxGuide: document.getElementById('uxGuide'),
  uxGuideLink: document.getElementById('uxGuideLink'),
  noteForm: document.getElementById('noteForm'),
  noteId: document.getElementById('noteId'),
  noteTitle: document.getElementById('noteTitle'),
  noteBody: document.getElementById('noteBody'),
  noteTags: document.getElementById('noteTags'),
  noteSubmit: document.getElementById('noteSubmit'),
  noteCancelEdit: document.getElementById('noteCancelEdit'),
  searchInput: document.getElementById('searchInput'),
  tagFilter: document.getElementById('tagFilter'),
  exportMd: document.getElementById('exportMd'),
  exportJson: document.getElementById('exportJson'),
  backupWarning: document.getElementById('backupWarning'),
  noteList: document.getElementById('noteList'),
};

async function api(path, options) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function formatTags(tags) {
  return tags ? tags.split(',') : [];
}

function renderNoteCard(note) {
  const card = document.createElement('article');
  card.className = 'note-card';

  const title = document.createElement('h3');
  title.textContent = note.title || '(無題)';
  card.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'note-meta';
  meta.textContent = note.created_at;
  card.appendChild(meta);

  const body = document.createElement('p');
  body.className = 'note-body';
  body.textContent = note.body;
  card.appendChild(body);

  if (note.tags) {
    const tagsEl = document.createElement('div');
    tagsEl.className = 'note-tags';
    for (const t of formatTags(note.tags)) {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = t;
      tagsEl.appendChild(span);
    }
    card.appendChild(tagsEl);
  }

  const actions = document.createElement('div');
  actions.className = 'note-actions';

  const editBtn = document.createElement('button');
  editBtn.textContent = '編集';
  editBtn.addEventListener('click', () => startEdit(note));
  actions.appendChild(editBtn);

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = '削除';
  deleteBtn.addEventListener('click', () => deleteNote(note.id));
  actions.appendChild(deleteBtn);

  card.appendChild(actions);
  return card;
}

function renderEmptyState(message) {
  clear(el.noteList);
  const p = document.createElement('p');
  p.className = 'empty-state';
  p.textContent = message;
  el.noteList.appendChild(p);
}

function renderNoteList(notes) {
  clear(el.noteList);
  if (notes.length === 0) {
    renderEmptyState(
      state.tag
        ? 'このタグのメモはありません'
        : 'まだメモがありません。最初のメモを登録しましょう'
    );
    return;
  }
  for (const note of notes) {
    el.noteList.appendChild(renderNoteCard(note));
  }
}

// サーバーのsnippet()は制御文字(charCode 1/2)でハイライト区間を区切って返す（HTMLタグではない。searchService.js参照）。
// メモ本文はユーザー入力そのものなのでinnerHTMLは使わず、textNodeと<mark>要素に分解して安全に組み立てる。
const SNIPPET_MARK_START = String.fromCharCode(1);
const SNIPPET_MARK_END = String.fromCharCode(2);

function buildSnippetFragment(rawSnippet) {
  const frag = document.createDocumentFragment();
  const segments = rawSnippet.split(SNIPPET_MARK_START);
  frag.appendChild(document.createTextNode(segments[0]));
  for (let i = 1; i < segments.length; i++) {
    const closeIdx = segments[i].indexOf(SNIPPET_MARK_END);
    const marked = closeIdx === -1 ? segments[i] : segments[i].slice(0, closeIdx);
    const rest = closeIdx === -1 ? '' : segments[i].slice(closeIdx + 1);
    const mark = document.createElement('mark');
    mark.textContent = marked;
    frag.appendChild(mark);
    if (rest) frag.appendChild(document.createTextNode(rest));
  }
  return frag;
}

function renderSearchResults(results) {
  clear(el.noteList);
  if (results.length === 0) {
    renderEmptyState('該当するメモが見つかりませんでした');
    return;
  }
  for (const r of results) {
    const card = renderNoteCard(r.note);
    const snippet = document.createElement('div');
    snippet.className = 'snippet';
    snippet.appendChild(buildSnippetFragment(r.snippet));
    card.insertBefore(snippet, card.querySelector('.note-actions'));
    el.noteList.appendChild(card);
  }
}

async function refreshTagFilterOptions() {
  const current = el.tagFilter.value;
  clear(el.tagFilter);
  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = 'タグで絞り込み（すべて）';
  el.tagFilter.appendChild(allOption);

  const tagSet = new Set();
  for (const n of state.notes) {
    for (const t of formatTags(n.tags)) tagSet.add(t);
  }
  for (const t of Array.from(tagSet).sort()) {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    el.tagFilter.appendChild(opt);
  }
  el.tagFilter.value = current;
}

async function loadNotes() {
  const query = state.tag ? `?tag=${encodeURIComponent(state.tag)}` : '';
  const data = await api(`/api/notes${query}`);
  state.notes = data.notes;
  state.mode = 'list';
  renderNoteList(state.notes);
  await refreshTagFilterOptions();
}

function resetNoteForm() {
  el.noteId.value = '';
  el.noteTitle.value = '';
  el.noteBody.value = '';
  el.noteTags.value = '';
  el.noteSubmit.textContent = '保存';
  el.noteCancelEdit.hidden = true;
}

function startEdit(note) {
  el.noteId.value = note.id;
  el.noteTitle.value = note.title;
  el.noteBody.value = note.body;
  el.noteTags.value = note.tags;
  el.noteSubmit.textContent = '更新';
  el.noteCancelEdit.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteNote(id) {
  if (!window.confirm('このメモを削除しますか？この操作は元に戻せません（直近のバックアップからのみ復旧可能です）。')) {
    return;
  }
  await api(`/api/notes/${id}`, { method: 'DELETE', body: JSON.stringify({ confirm: true }) });
  await loadNotes();
}

el.noteForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    title: el.noteTitle.value,
    body: el.noteBody.value,
    tags: el.noteTags.value,
  };
  try {
    if (el.noteId.value) {
      await api(`/api/notes/${el.noteId.value}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await api('/api/notes', { method: 'POST', body: JSON.stringify(payload) });
    }
    resetNoteForm();
    await loadNotes();
  } catch (err) {
    window.alert(err.message);
  }
});

el.noteCancelEdit.addEventListener('click', resetNoteForm);

el.tagFilter.addEventListener('change', async () => {
  state.tag = el.tagFilter.value;
  await loadNotes();
});

let searchDebounceTimer = null;
el.searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(runSearch, 250);
});

async function runSearch() {
  const q = el.searchInput.value.trim();
  if (q.length === 0) {
    await loadNotes();
    return;
  }
  if (Array.from(q).length < 3) {
    renderEmptyState('3文字以上入力してください');
    return;
  }
  try {
    const data = await api(`/api/search?q=${encodeURIComponent(q)}`);
    state.mode = 'search';
    renderSearchResults(data.results);
  } catch (err) {
    renderEmptyState(err.message);
  }
}

el.askForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const question = el.askInput.value.trim();
  if (!question) return;

  el.askResult.hidden = false;
  clear(el.askResult);
  const loading = document.createElement('p');
  loading.textContent = '考えています…';
  el.askResult.appendChild(loading);

  try {
    const data = await api('/api/ask', { method: 'POST', body: JSON.stringify({ question }) });
    clear(el.askResult);
    renderAskResult(data);
  } catch (err) {
    clear(el.askResult);
    const p = document.createElement('p');
    p.textContent = `エラー: ${err.message}`;
    el.askResult.appendChild(p);
  }
});

function renderAskResult(data) {
  if (data.mode === 'refused') {
    const p = document.createElement('p');
    p.textContent = 'メモの中に関連情報が見つかりませんでした。別のキーワードで質問するか、まずメモを登録してください。';
    el.askResult.appendChild(p);
    return;
  }

  if (data.mode === 'generated' && data.answer) {
    const answer = document.createElement('p');
    answer.className = 'ask-answer';
    answer.textContent = data.answer;
    el.askResult.appendChild(answer);
  }

  const sourcesTitle = document.createElement('p');
  sourcesTitle.className = 'sources-title';
  sourcesTitle.textContent = '出典:';
  el.askResult.appendChild(sourcesTitle);

  const list = document.createElement('ul');
  list.className = 'sources-list';
  for (const r of data.results) {
    const li = document.createElement('li');
    li.textContent = `${r.note.title || '(無題)'}（${r.note.created_at}）: ${r.note.body.slice(0, 80)}`;
    list.appendChild(li);
  }
  el.askResult.appendChild(list);
}

async function refreshStatus() {
  try {
    const data = await api('/api/status');
    el.ollamaStatus.textContent = data.ollamaAvailable ? '● 生成AI利用可' : '○ 検索のみ';
    el.uxGuide.hidden = data.ollamaAvailable;
    el.backupWarning.hidden = !data.backupWarning;
  } catch {
    el.ollamaStatus.textContent = '○ 検索のみ';
  }
}

el.uxGuideLink.addEventListener('click', (e) => {
  e.preventDefault();
  window.alert(
    '生成AIによる要約回答を使うには、Ollama（無料のローカルAI実行ソフト）を導入します。\n\n' +
      '1. https://ollama.com/download からダウンロード・インストール\n' +
      '2. ターミナルで「ollama pull qwen3:4b」を実行\n' +
      '3. memory-assistantを再起動\n\n' +
      '詳しくはREADME.mdの「生成AIを使いたい場合（任意）」を参照してください。'
  );
});

el.exportMd.addEventListener('click', async () => {
  const data = await api('/api/export', { method: 'POST', body: JSON.stringify({ format: 'markdown' }) });
  window.alert(`エクスポートしました: ${data.path}`);
});
el.exportJson.addEventListener('click', async () => {
  const data = await api('/api/export', { method: 'POST', body: JSON.stringify({ format: 'json' }) });
  window.alert(`エクスポートしました: ${data.path}`);
});

(async function init() {
  await refreshStatus();
  await loadNotes();
})();
