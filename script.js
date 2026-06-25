// ===== Estado =====
const COLUMNS = [
  { id: 'todo', name: 'A Fazer', color: 'var(--todo)' },
  { id: 'doing', name: 'Fazendo', color: 'var(--doing)' },
  { id: 'done', name: 'Concluído', color: 'var(--done)' },
];

const SEED = {
  todo: [{ id: uid(), text: 'Arraste-me para a coluna "Fazendo" →' }, { id: uid(), text: 'Adicione uma nova tarefa no campo abaixo' }],
  doing: [{ id: uid(), text: 'Clicar no ✕ remove o card' }],
  done: [{ id: uid(), text: 'Os dados ficam salvos no seu navegador' }],
};

function uid() { return Math.random().toString(36).slice(2, 9); }

let state = load();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem('taskflow'));
    if (saved && saved.todo) return saved;
  } catch {}
  return structuredClone(SEED);
}
function save() { localStorage.setItem('taskflow', JSON.stringify(state)); }

// ===== Render =====
const board = document.getElementById('board');

function render() {
  board.innerHTML = COLUMNS.map(col => `
    <section class="column" data-col="${col.id}">
      <div class="column__head">
        <span class="column__dot" style="background:${col.color}"></span>
        ${col.name}
        <span class="column__count">${state[col.id].length}</span>
      </div>
      <div class="cards" data-col="${col.id}">
        ${state[col.id].map(card => `
          <div class="card" draggable="true" data-id="${card.id}">
            <div class="card__text">${escapeHtml(card.text)}</div>
            <button class="card__del" data-id="${card.id}" data-col="${col.id}" aria-label="Remover">✕</button>
          </div>`).join('')}
      </div>
      <div class="add">
        <input type="text" placeholder="+ Nova tarefa..." data-add="${col.id}" />
      </div>
    </section>`).join('');
  bind();
  save();
}

const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ===== Eventos =====
let draggingId = null;

function bind() {
  // Adicionar tarefa
  document.querySelectorAll('[data-add]').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value.trim()) {
        state[input.dataset.add].push({ id: uid(), text: input.value.trim() });
        render();
        // refoca o mesmo campo após re-render
        const again = document.querySelector(`[data-add="${input.dataset.add}"]`);
        if (again) again.focus();
      }
    });
  });

  // Remover
  document.querySelectorAll('.card__del').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const { id, col } = btn.dataset;
      state[col] = state[col].filter(c => c.id !== id);
      render();
    });
  });

  // Drag & drop
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('dragstart', () => { draggingId = card.dataset.id; card.classList.add('dragging'); });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
  });

  document.querySelectorAll('.column').forEach(colEl => {
    colEl.addEventListener('dragover', (e) => { e.preventDefault(); colEl.classList.add('drag-over'); });
    colEl.addEventListener('dragleave', () => colEl.classList.remove('drag-over'));
    colEl.addEventListener('drop', (e) => {
      e.preventDefault();
      colEl.classList.remove('drag-over');
      const target = colEl.dataset.col;
      moveCard(draggingId, target);
    });
  });
}

function moveCard(id, targetCol) {
  let card = null;
  for (const col of COLUMNS.map(c => c.id)) {
    const idx = state[col].findIndex(c => c.id === id);
    if (idx > -1) { card = state[col].splice(idx, 1)[0]; break; }
  }
  if (card) { state[targetCol].push(card); render(); }
}

// Botões topo
document.getElementById('clearBtn').addEventListener('click', () => {
  if (confirm('Limpar todas as tarefas?')) { state = { todo: [], doing: [], done: [] }; render(); }
});

// ===== PWA =====
let deferredPrompt = null;
const installBtn = document.getElementById('installBtn');
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; installBtn.hidden = false; });
installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null; installBtn.hidden = true;
});
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

render();
