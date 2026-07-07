'use strict';

/* CepHarçlık — veri localStorage'da yaşar, para integer kuruş olarak saklanır. */

const STORAGE_KEY = 'cepharclik';
const SCHEMA_VERSION = 1;

const DEFAULT_CATEGORIES = [
  { id: 'yemek', name: 'Yemek', icon: '🍽️' },
  { id: 'kahve', name: 'Kahve', icon: '☕' },
  { id: 'ulasim', name: 'Ulaşım', icon: '🚌' },
  { id: 'market', name: 'Market', icon: '🛒' },
  { id: 'eglence', name: 'Eğlence', icon: '🎬' },
  { id: 'diger', name: 'Diğer', icon: '📦' },
];

const TRY_FMT = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });

// ---------- Depolama ----------

function freshState() {
  return {
    schema_version: SCHEMA_VERSION,
    settings: { dailyLimitKurus: null },
    categories: DEFAULT_CATEGORIES,
    expenses: [], // { id, amountKurus, categoryId, note, createdAt(ISO) }
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshState();
    const data = JSON.parse(raw);
    if (!data || data.schema_version !== SCHEMA_VERSION || !Array.isArray(data.expenses)) {
      return freshState();
    }
    if (!data.settings) data.settings = { dailyLimitKurus: null };
    if (!Array.isArray(data.categories) || data.categories.length === 0) {
      data.categories = DEFAULT_CATEGORIES;
    }
    return data;
  } catch {
    return freshState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();
let pendingUndo = null; // { expense, timer }
let summaryMonth = startOfMonth(new Date());
let lastAddedId = null;

// ---------- Yardımcılar ----------

function fmtKurus(kurus) {
  return TRY_FMT.format(kurus / 100);
}

// "12,50" / "12.50" / "12" -> kuruş (integer) ya da null
function parseAmountToKurus(text) {
  const normalized = String(text).trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const kurus = Math.round(parseFloat(normalized) * 100);
  return kurus > 0 ? kurus : null;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function isSameMonth(date, monthStart) {
  return date.getFullYear() === monthStart.getFullYear() &&
    date.getMonth() === monthStart.getMonth();
}

function todayExpenses() {
  const now = new Date();
  return state.expenses.filter((e) => isSameDay(new Date(e.createdAt), now));
}

function categoryById(id) {
  return state.categories.find((c) => c.id === id) ||
    { id, name: 'Diğer', icon: '📦' };
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ---------- Elemanlar ----------

const el = (id) => document.getElementById(id);

const headerDate = el('header-date');
const budgetCard = el('budget-card');
const budgetLabel = el('budget-label');
const budgetAmount = el('budget-amount');
const budgetBar = el('budget-bar');
const budgetBarFill = el('budget-bar-fill');
const limitToggle = el('limit-toggle');
const limitForm = el('limit-form');
const limitInput = el('limit-input');
const limitRemove = el('limit-remove');
const amountInput = el('amount-input');
const noteInput = el('note-input');
const categoryGrid = el('category-grid');
const todayList = el('today-list');
const todayEmpty = el('today-empty');
const viewToday = el('view-today');
const viewSummary = el('view-summary');
const tabToday = el('tab-today');
const tabSummary = el('tab-summary');
const monthTitle = el('month-title');
const monthTotal = el('month-total');
const monthMeta = el('month-meta');
const categoryBreakdown = el('category-breakdown');
const summaryEmpty = el('summary-empty');
const snackbar = el('snackbar');
const snackbarText = el('snackbar-text');
const undoBtn = el('undo-btn');

// ---------- Bugün görünümü ----------

function renderHeader() {
  headerDate.textContent = new Date().toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric', weekday: 'long',
  });
}

// Kalan/toplam tutarı sayaç animasyonuyla günceller (micro-interaction 1)
function animateAmount(fromKurus, toKurus) {
  if (prefersReducedMotion() || fromKurus === toKurus) {
    budgetAmount.textContent = fmtKurus(toKurus);
    return;
  }
  const duration = 250;
  const start = performance.now();
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 2);
    budgetAmount.textContent = fmtKurus(Math.round(fromKurus + (toKurus - fromKurus) * eased));
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function currentBudgetValue() {
  const spent = todayExpenses().reduce((sum, e) => sum + e.amountKurus, 0);
  const limit = state.settings.dailyLimitKurus;
  return limit != null ? limit - spent : spent;
}

function renderBudget(animateFrom = null) {
  const spent = todayExpenses().reduce((sum, e) => sum + e.amountKurus, 0);
  const limit = state.settings.dailyLimitKurus;

  if (limit != null) {
    const remaining = limit - spent;
    budgetLabel.textContent = `Bugün kalan (limit ${fmtKurus(limit)})`;
    budgetCard.classList.toggle('over', remaining < 0); // micro-interaction 2: renk geçişi
    budgetBar.classList.remove('hidden');
    budgetBarFill.style.width = `${Math.min((spent / limit) * 100, 100)}%`;
    limitToggle.textContent = 'Limiti değiştir';
    if (animateFrom != null) animateAmount(animateFrom, remaining);
    else budgetAmount.textContent = fmtKurus(remaining);
  } else {
    budgetLabel.textContent = 'Bugün harcanan';
    budgetCard.classList.remove('over');
    budgetBar.classList.add('hidden');
    limitToggle.textContent = 'Günlük limit belirle';
    if (animateFrom != null) animateAmount(animateFrom, spent);
    else budgetAmount.textContent = fmtKurus(spent);
  }
}

function renderTodayList() {
  const items = todayExpenses().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  todayList.innerHTML = '';
  todayEmpty.classList.toggle('hidden', items.length > 0);

  for (const e of items) {
    const cat = categoryById(e.categoryId);
    const li = document.createElement('li');
    li.className = 'expense-row' + (e.id === lastAddedId ? ' just-added' : '');

    const time = new Date(e.createdAt).toLocaleTimeString('tr-TR', {
      hour: '2-digit', minute: '2-digit',
    });

    const icon = document.createElement('span');
    icon.className = 'expense-icon';
    icon.textContent = cat.icon;

    const info = document.createElement('div');
    info.className = 'expense-info';
    const title = document.createElement('p');
    title.className = 'expense-title';
    title.textContent = e.note ? e.note : cat.name;
    const timeEl = document.createElement('p');
    timeEl.className = 'expense-time';
    timeEl.textContent = e.note ? `${cat.name} · ${time}` : time;
    info.append(title, timeEl);

    const amount = document.createElement('span');
    amount.className = 'expense-amount';
    amount.textContent = fmtKurus(e.amountKurus);

    const del = document.createElement('button');
    del.className = 'expense-delete';
    del.type = 'button';
    del.setAttribute('aria-label', 'Kaydı sil');
    del.textContent = '✕';
    del.addEventListener('click', () => deleteExpense(e.id));

    li.append(icon, info, amount, del);
    todayList.appendChild(li);
  }
  lastAddedId = null;
}

function renderCategories() {
  categoryGrid.innerHTML = '';
  for (const cat of state.categories) {
    const btn = document.createElement('button');
    btn.className = 'category-btn';
    btn.type = 'button';
    const icon = document.createElement('span');
    icon.className = 'cat-icon';
    icon.textContent = cat.icon;
    const name = document.createElement('span');
    name.textContent = cat.name;
    btn.append(icon, name);
    btn.addEventListener('click', () => addExpense(cat.id));
    categoryGrid.appendChild(btn);
  }
}

// ---------- Kayıt ekleme / silme ----------

function addExpense(categoryId) {
  const kurus = parseAmountToKurus(amountInput.value);
  if (kurus == null) {
    amountInput.classList.remove('shake');
    void amountInput.offsetWidth; // animasyonu yeniden tetikle
    amountInput.classList.add('shake');
    amountInput.focus();
    return;
  }

  const before = currentBudgetValue();
  const expense = {
    id: newId(),
    amountKurus: kurus,
    categoryId,
    note: noteInput.value.trim(),
    createdAt: new Date().toISOString(),
  };
  state.expenses.push(expense);
  saveState();

  lastAddedId = expense.id;
  amountInput.value = '';
  noteInput.value = '';
  renderBudget(before);
  renderTodayList();
  amountInput.focus();
}

function deleteExpense(id) {
  const index = state.expenses.findIndex((e) => e.id === id);
  if (index === -1) return;

  finalizeUndo(); // önceki bekleyen geri alma varsa kapat
  const before = currentBudgetValue();
  const [expense] = state.expenses.splice(index, 1);
  saveState();
  renderBudget(before);
  renderTodayList();
  renderSummary();

  snackbarText.textContent = `${fmtKurus(expense.amountKurus)} silindi`;
  snackbar.classList.remove('hidden');
  pendingUndo = {
    expense,
    timer: setTimeout(finalizeUndo, 5000),
  };
}

function finalizeUndo() {
  if (!pendingUndo) return;
  clearTimeout(pendingUndo.timer);
  pendingUndo = null;
  snackbar.classList.add('hidden');
}

undoBtn.addEventListener('click', () => {
  if (!pendingUndo) return;
  const before = currentBudgetValue();
  state.expenses.push(pendingUndo.expense);
  saveState();
  finalizeUndo();
  renderBudget(before);
  renderTodayList();
  renderSummary();
});

// ---------- Günlük limit ----------

limitToggle.addEventListener('click', () => {
  limitForm.classList.toggle('hidden');
  if (!limitForm.classList.contains('hidden')) {
    const limit = state.settings.dailyLimitKurus;
    limitInput.value = limit != null ? String(limit / 100).replace('.', ',') : '';
    limitRemove.classList.toggle('hidden', limit == null);
    limitInput.focus();
  }
});

limitForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const kurus = parseAmountToKurus(limitInput.value);
  if (kurus == null) {
    limitInput.focus();
    return;
  }
  state.settings.dailyLimitKurus = kurus;
  saveState();
  limitForm.classList.add('hidden');
  renderBudget();
});

limitRemove.addEventListener('click', () => {
  state.settings.dailyLimitKurus = null;
  saveState();
  limitForm.classList.add('hidden');
  renderBudget();
});

// ---------- Özet görünümü ----------

function renderSummary() {
  const items = state.expenses.filter((e) => isSameMonth(new Date(e.createdAt), summaryMonth));

  monthTitle.textContent = summaryMonth.toLocaleDateString('tr-TR', {
    month: 'long', year: 'numeric',
  });

  const total = items.reduce((sum, e) => sum + e.amountKurus, 0);
  monthTotal.textContent = fmtKurus(total);

  const days = new Set(items.map((e) => new Date(e.createdAt).toDateString()));
  monthMeta.textContent = items.length === 0
    ? ''
    : `${items.length} kayıt · ${days.size} günde · günlük ort. ${fmtKurus(Math.round(total / days.size))}`;

  categoryBreakdown.innerHTML = '';
  summaryEmpty.classList.toggle('hidden', items.length > 0);

  const byCategory = new Map();
  for (const e of items) {
    byCategory.set(e.categoryId, (byCategory.get(e.categoryId) || 0) + e.amountKurus);
  }
  const rows = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);

  for (const [categoryId, kurus] of rows) {
    const cat = categoryById(categoryId);
    const row = document.createElement('div');
    row.className = 'breakdown-row';

    const head = document.createElement('div');
    head.className = 'breakdown-head';
    const name = document.createElement('span');
    name.className = 'breakdown-name';
    name.textContent = `${cat.icon} ${cat.name}`;
    const amount = document.createElement('span');
    amount.className = 'breakdown-amount';
    amount.textContent = fmtKurus(kurus);
    head.append(name, amount);

    const bar = document.createElement('div');
    bar.className = 'breakdown-bar';
    const fill = document.createElement('div');
    fill.className = 'breakdown-bar-fill';
    fill.style.width = `${(kurus / total) * 100}%`;
    bar.appendChild(fill);

    row.append(head, bar);
    categoryBreakdown.appendChild(row);
  }
}

el('month-prev').addEventListener('click', () => {
  summaryMonth = new Date(summaryMonth.getFullYear(), summaryMonth.getMonth() - 1, 1);
  renderSummary();
});

el('month-next').addEventListener('click', () => {
  summaryMonth = new Date(summaryMonth.getFullYear(), summaryMonth.getMonth() + 1, 1);
  renderSummary();
});

// ---------- Yedek: dışa/içe aktarma ----------

el('export-btn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `cepharclik-yedek-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

el('import-input').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || data.schema_version !== SCHEMA_VERSION || !Array.isArray(data.expenses)) {
        alert('Bu dosya geçerli bir CepHarçlık yedeği değil.');
        return;
      }
      if (!confirm(`Yedekte ${data.expenses.length} kayıt var. Bu cihazdaki veriler yedekle DEĞİŞTİRİLECEK. Devam?`)) {
        return;
      }
      state = data;
      if (!state.settings) state.settings = { dailyLimitKurus: null };
      saveState();
      renderAll();
    } catch {
      alert('Dosya okunamadı: geçerli bir JSON değil.');
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
});

// ---------- Sekmeler ----------

function showView(view) {
  const isToday = view === 'today';
  viewToday.classList.toggle('hidden', !isToday);
  viewSummary.classList.toggle('hidden', isToday);
  tabToday.classList.toggle('active', isToday);
  tabSummary.classList.toggle('active', !isToday);
  if (!isToday) renderSummary();
}

tabToday.addEventListener('click', () => showView('today'));
tabSummary.addEventListener('click', () => showView('summary'));

// ---------- Başlangıç ----------

function renderAll() {
  renderHeader();
  renderCategories();
  renderBudget();
  renderTodayList();
  renderSummary();
}

renderAll();

// Gece yarısını geçince "bugün" tazelensin
setInterval(() => {
  const shownDate = headerDate.textContent;
  renderHeader();
  if (headerDate.textContent !== shownDate) {
    renderBudget();
    renderTodayList();
  }
}, 60 * 1000);
