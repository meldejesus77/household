'use client';

import { useState, useEffect, useRef } from 'react';

// ── Config ─────────────────────────────────────────────────────────────────
const TAGS = [
  { value: 'this-week',  label: 'This Week',  bg: '#e0f0ff', color: '#1a6a9a' },
  { value: 'next-week',  label: 'Next Week',  bg: '#fff0e0', color: '#9a5a1a' },
  { value: 'next-month', label: 'Next Month', bg: '#f0e0ff', color: '#6a1a9a' },
  { value: 'done',       label: 'Done',       bg: '#e0ffe0', color: '#1a7a1a' },
] as const;

type TagValue = typeof TAGS[number]['value'];

// ── Types ──────────────────────────────────────────────────────────────────
interface SubItem {
  id: string;
  text: string;
  checked: boolean;
}

interface TodoItem {
  id: string;
  text: string;
  tag: TagValue;
  subItems: SubItem[];
  createdAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function getISOWeek(): string {
  const now = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const weekNum = Math.ceil((dayOfYear + jan4.getDay() - 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function tagMeta(value: TagValue) {
  return TAGS.find(t => t.value === value) ?? TAGS[0];
}

function truncate(text: string, max = 22): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

const STORAGE_KEY = 'household_todos';
const ROLLOVER_KEY = 'last_rollover_week';

function loadTodos(): TodoItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTodos(todos: TodoItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function applyRollover(todos: TodoItem[]): TodoItem[] {
  const currentWeek = getISOWeek();
  const lastWeek = localStorage.getItem(ROLLOVER_KEY);
  if (lastWeek && lastWeek !== currentWeek) {
    todos = todos.map(t => t.tag === 'this-week' ? { ...t, tag: 'next-week' as TagValue } : t);
    saveTodos(todos);
  }
  localStorage.setItem(ROLLOVER_KEY, currentWeek);
  return todos;
}

// ── Styles (inline) ────────────────────────────────────────────────────────
const styles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f7f7f8; }

  .todo-header {
    position: fixed; top: 0; left: 0; right: 0; height: 48px;
    background: #1a1a1a; color: white; z-index: 200;
    display: flex; align-items: center; gap: 12px; padding: 0 16px;
  }
  .todo-header a.home-link {
    color: #ccc; text-decoration: none; font-size: 0.85rem; white-space: nowrap;
    padding: 4px 8px; border-radius: 4px;
  }
  .todo-header a.home-link:hover { color: #fff; background: rgba(255,255,255,0.08); }

  .filter-pills {
    display: flex; gap: 6px; flex-wrap: wrap; flex: 1;
  }
  .filter-pill {
    border: none; cursor: pointer; font-size: 0.75rem; padding: 3px 10px;
    border-radius: 999px; font-weight: 500; transition: opacity 0.15s;
  }
  .filter-pill.active { background: #00e5ff; color: #0a0a0a; }
  .filter-pill.inactive { background: rgba(255,255,255,0.12); color: #aaa; }

  .add-btn {
    background: #00e5ff; color: #0a0a0a; border: none; cursor: pointer;
    font-size: 0.8rem; font-weight: 600; padding: 5px 12px;
    border-radius: 6px; white-space: nowrap; flex-shrink: 0;
  }
  .add-btn:hover { background: #00cfea; }

  .content {
    padding-top: 4rem; max-width: 700px; margin: 0 auto; padding: 4rem 1.5rem 2rem;
  }

  /* Add row */
  .add-row {
    display: flex; gap: 8px; align-items: center; margin-bottom: 12px;
    background: white; border: 1px solid #ddd; border-radius: 8px; padding: 8px 12px;
  }
  .add-row input {
    flex: 1; border: none; outline: none; font-size: 0.9rem;
  }
  .add-row select {
    border: none; outline: none; font-size: 0.78rem; cursor: pointer;
    background: transparent;
  }
  .add-row button {
    background: #1a1a1a; color: white; border: none; cursor: pointer;
    font-size: 0.78rem; padding: 4px 10px; border-radius: 5px;
  }

  /* Todo rows */
  .todo-list { display: flex; flex-direction: column; gap: 6px; }

  .todo-row {
    display: flex; align-items: center; gap: 10px;
    background: white; border: 1px solid #e5e5e5; border-radius: 8px;
    padding: 10px 12px; cursor: default;
  }
  .todo-row:hover { border-color: #c5c5c5; }
  .todo-row.done-row { opacity: 0.6; }

  .todo-checkbox {
    width: 16px; height: 16px; cursor: pointer; flex-shrink: 0; accent-color: #1a7a1a;
  }

  .todo-text {
    flex: 1; font-size: 0.95rem; overflow: hidden; text-overflow: ellipsis;
    white-space: nowrap; max-width: 400px; cursor: pointer; min-width: 0;
    color: #1a1a1a;
  }
  .todo-text.done-text { text-decoration: line-through; color: #999; }

  .tag-select {
    font-size: 0.72rem; font-weight: 600; padding: 2px 6px;
    border-radius: 999px; border: none; cursor: pointer;
    appearance: none; -webkit-appearance: none; text-align: center;
    flex-shrink: 0;
  }

  /* Empty state */
  .empty-state {
    text-align: center; color: #aaa; font-size: 0.9rem; padding: 40px 0;
  }

  /* Modal overlay */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 500;
    display: flex; align-items: center; justify-content: center; padding: 16px;
  }
  .modal-box {
    background: white; max-width: 480px; width: 100%; border-radius: 8px;
    padding: 1.5rem; box-shadow: 0 20px 60px rgba(0,0,0,0.3); position: relative;
    max-height: 90vh; overflow-y: auto;
  }
  .modal-close {
    position: absolute; top: 12px; right: 12px; background: none; border: none;
    font-size: 1.1rem; cursor: pointer; color: #888; line-height: 1;
  }
  .modal-close:hover { color: #333; }

  .modal-title-input {
    font-size: 1.1rem; font-weight: 600; border: none; outline: none;
    width: 100%; border-bottom: 2px solid #e5e5e5; padding-bottom: 4px;
    margin-bottom: 12px; background: transparent; color: #1a1a1a;
  }
  .modal-title-input:focus { border-bottom-color: #00a8c0; }

  .modal-tag-row {
    display: flex; align-items: center; gap: 8px; margin-bottom: 16px;
  }
  .modal-tag-label { font-size: 0.8rem; color: #777; }
  .modal-tag-select {
    font-size: 0.8rem; padding: 3px 8px; border-radius: 6px;
    border: 1px solid #ddd; cursor: pointer;
  }

  .subtasks-heading {
    font-size: 0.85rem; font-weight: 600; color: #555; margin-bottom: 8px;
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .subtask-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
  .subtask-row {
    display: flex; align-items: center; gap: 8px;
  }
  .subtask-checkbox { width: 14px; height: 14px; cursor: pointer; accent-color: #1a7a1a; }
  .subtask-text {
    flex: 1; font-size: 0.88rem; color: #333;
  }
  .subtask-text.checked { text-decoration: line-through; color: #aaa; }
  .subtask-delete {
    background: none; border: none; cursor: pointer; color: #ccc;
    font-size: 0.85rem; padding: 0 2px; line-height: 1;
  }
  .subtask-delete:hover { color: #e55; }

  .subtask-add-row {
    display: flex; gap: 8px; align-items: center;
  }
  .subtask-add-input {
    flex: 1; border: 1px solid #ddd; border-radius: 6px; padding: 5px 8px;
    font-size: 0.85rem; outline: none;
  }
  .subtask-add-input:focus { border-color: #aaa; }
  .subtask-add-btn {
    background: #f0f0f0; border: none; cursor: pointer; font-size: 0.78rem;
    padding: 5px 10px; border-radius: 6px; color: #555;
  }
  .subtask-add-btn:hover { background: #e0e0e0; }

  .modal-footer {
    display: flex; justify-content: flex-end; margin-top: 20px; padding-top: 12px;
    border-top: 1px solid #f0f0f0;
  }
  .delete-btn {
    background: #fff0f0; border: 1px solid #ffcccc; color: #cc3333;
    cursor: pointer; font-size: 0.82rem; padding: 5px 14px; border-radius: 6px;
  }
  .delete-btn:hover { background: #ffe0e0; }
`;

// ── Component ──────────────────────────────────────────────────────────────
export default function TodoClient() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [activeFilters, setActiveFilters] = useState<TagValue[]>(['this-week']);
  const [showAddRow, setShowAddRow] = useState(false);
  const [newText, setNewText] = useState('');
  const [newTag, setNewTag] = useState<TagValue>('this-week');
  const [modalItem, setModalItem] = useState<TodoItem | null>(null);
  const [subInput, setSubInput] = useState('');
  const addInputRef = useRef<HTMLInputElement>(null);

  // Load + rollover on mount
  useEffect(() => {
    let loaded = loadTodos();
    loaded = applyRollover(loaded);
    setTodos(loaded);
  }, []);

  // Persist whenever todos change (after initial mount)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    saveTodos(todos);
  }, [todos]);

  // Focus add input when shown
  useEffect(() => {
    if (showAddRow) addInputRef.current?.focus();
  }, [showAddRow]);

  // Sync modal item when todos change
  useEffect(() => {
    if (modalItem) {
      const updated = todos.find(t => t.id === modalItem.id);
      if (updated) setModalItem(updated);
    }
  }, [todos]);

  // ── Mutations ────────────────────────────────────────────────────────────
  function updateTodo(id: string, patch: Partial<TodoItem>) {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  }

  function checkTodo(id: string, checked: boolean) {
    updateTodo(id, { tag: checked ? 'done' : 'this-week' });
  }

  function addTodo() {
    const text = newText.trim();
    if (!text) return;
    const item: TodoItem = {
      id: uid(), text, tag: newTag, subItems: [], createdAt: new Date().toISOString(),
    };
    setTodos(prev => [item, ...prev]);
    setNewText('');
    setNewTag('this-week');
    setShowAddRow(false);
  }

  function deleteTodo(id: string) {
    setTodos(prev => prev.filter(t => t.id !== id));
    setModalItem(null);
  }

  function addSubItem(todoId: string) {
    const text = subInput.trim();
    if (!text) return;
    const sub: SubItem = { id: uid(), text, checked: false };
    setTodos(prev => prev.map(t =>
      t.id === todoId ? { ...t, subItems: [...t.subItems, sub] } : t
    ));
    setSubInput('');
  }

  function toggleSubItem(todoId: string, subId: string) {
    setTodos(prev => prev.map(t =>
      t.id === todoId
        ? { ...t, subItems: t.subItems.map(s => s.id === subId ? { ...s, checked: !s.checked } : s) }
        : t
    ));
  }

  function deleteSubItem(todoId: string, subId: string) {
    setTodos(prev => prev.map(t =>
      t.id === todoId
        ? { ...t, subItems: t.subItems.filter(s => s.id !== subId) }
        : t
    ));
  }

  function toggleFilter(tag: TagValue) {
    setActiveFilters(prev => {
      if (prev.includes(tag)) {
        const next = prev.filter(t => t !== tag);
        return next.length === 0 ? [tag] : next; // never empty
      }
      return [...prev, tag];
    });
  }

  // ── Filtered list ────────────────────────────────────────────────────────
  const visible = todos.filter(t => activeFilters.includes(t.tag));

  // ── Modal helpers ────────────────────────────────────────────────────────
  const modal = modalItem;

  return (
    <>
      <style>{styles}</style>

      {/* Header */}
      <header className="todo-header">
        <a href="/" className="home-link">← Home</a>

        <div className="filter-pills">
          {TAGS.map(tag => (
            <button
              key={tag.value}
              className={`filter-pill ${activeFilters.includes(tag.value) ? 'active' : 'inactive'}`}
              onClick={() => toggleFilter(tag.value)}
            >
              {tag.label}
            </button>
          ))}
        </div>

        <button className="add-btn" onClick={() => setShowAddRow(v => !v)}>
          + Add
        </button>
      </header>

      {/* Content */}
      <main className="content">

        {/* Add row */}
        {showAddRow && (
          <div className="add-row">
            <input
              ref={addInputRef}
              value={newText}
              onChange={e => setNewText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addTodo(); if (e.key === 'Escape') setShowAddRow(false); }}
              placeholder="New todo…"
            />
            <select value={newTag} onChange={e => setNewTag(e.target.value as TagValue)}>
              {TAGS.filter(t => t.value !== 'done').map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <button onClick={addTodo}>Add</button>
          </div>
        )}

        {/* List */}
        <div className="todo-list">
          {visible.length === 0 && (
            <div className="empty-state">No items for selected filter{activeFilters.length > 1 ? 's' : ''}.</div>
          )}
          {visible.map(todo => {
            const meta = tagMeta(todo.tag);
            const isDone = todo.tag === 'done';
            return (
              <div key={todo.id} className={`todo-row${isDone ? ' done-row' : ''}`}>
                <input
                  type="checkbox"
                  className="todo-checkbox"
                  checked={isDone}
                  onChange={e => checkTodo(todo.id, e.target.checked)}
                />
                <span
                  className={`todo-text${isDone ? ' done-text' : ''}`}
                  onClick={() => setModalItem(todo)}
                  title={todo.text}
                >
                  {truncate(todo.text)}
                </span>
                <select
                  className="tag-select"
                  value={todo.tag}
                  style={{ background: meta.bg, color: meta.color }}
                  onChange={e => updateTodo(todo.id, { tag: e.target.value as TagValue })}
                  onClick={e => e.stopPropagation()}
                >
                  {TAGS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </main>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModalItem(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setModalItem(null)}>✕</button>

            {/* Title */}
            <input
              className="modal-title-input"
              value={modal.text}
              onChange={e => updateTodo(modal.id, { text: e.target.value })}
            />

            {/* Tag */}
            <div className="modal-tag-row">
              <span className="modal-tag-label">Tag:</span>
              <select
                className="modal-tag-select"
                value={modal.tag}
                onChange={e => updateTodo(modal.id, { tag: e.target.value as TagValue })}
              >
                {TAGS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Sub-tasks */}
            <div className="subtasks-heading">Sub-tasks</div>
            <div className="subtask-list">
              {modal.subItems.map(sub => (
                <div key={sub.id} className="subtask-row">
                  <input
                    type="checkbox"
                    className="subtask-checkbox"
                    checked={sub.checked}
                    onChange={() => toggleSubItem(modal.id, sub.id)}
                  />
                  <span className={`subtask-text${sub.checked ? ' checked' : ''}`}>{sub.text}</span>
                  <button className="subtask-delete" onClick={() => deleteSubItem(modal.id, sub.id)}>✕</button>
                </div>
              ))}
            </div>

            {/* Add sub-task */}
            <div className="subtask-add-row">
              <input
                className="subtask-add-input"
                placeholder="Add sub-task…"
                value={subInput}
                onChange={e => setSubInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addSubItem(modal.id); }}
              />
              <button className="subtask-add-btn" onClick={() => addSubItem(modal.id)}>Add</button>
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button className="delete-btn" onClick={() => deleteTodo(modal.id)}>Delete item</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
