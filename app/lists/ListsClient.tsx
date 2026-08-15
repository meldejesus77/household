'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

// ── Types ──────────────────────────────────────────────────────────────────
interface Item {
  id: string;
  text: string;
  url: string;
  checked: boolean;
  starred: boolean;
}

interface HistoryEntry {
  id: string;
  category: string;
  items: Item[];
  closedAt: string;
}

interface ListsState {
  categories: string[];
  active: string;
  items: Record<string, Item[]>;
  history: HistoryEntry[];
}

// ── Constants ──────────────────────────────────────────────────────────────
const DEFAULT_CATEGORIES = [
  'Target',
  'Home Depot',
  'Whole Foods',
  'Food Lion',
  "Aldi's",
  'Harris Teeter',
  'Amazon',
  'Big Purchases',
];

const DEFAULT_STATE: ListsState = {
  categories: DEFAULT_CATEGORIES,
  active: DEFAULT_CATEGORIES[0],
  items: Object.fromEntries(DEFAULT_CATEGORIES.map(c => [c, []])),
  history: [],
};

// ── Helpers ────────────────────────────────────────────────────────────────
function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function normalizeState(parsed: ListsState): ListsState {
  const items = { ...parsed.items };
  for (const cat of parsed.categories) {
    if (!items[cat]) items[cat] = [];
  }
  return { ...parsed, items };
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #fdf2f8; }

  .lists-header {
    position: fixed; top: 0; left: 0; right: 0; height: 48px;
    background: #1a1a1a; color: white; z-index: 200;
    display: flex; align-items: center; gap: 12px; padding: 0 16px;
  }
  .lists-header a.home-link {
    color: #ccc; text-decoration: none; font-size: 0.85rem; white-space: nowrap;
    padding: 4px 8px; border-radius: 4px;
  }
  .lists-header a.home-link:hover { color: #fff; background: rgba(255,255,255,0.08); }
  .lists-header-title {
    font-size: 1rem; font-weight: 700; color: #fbcfe8; white-space: nowrap;
  }
  .save-status {
    margin-left: auto; font-size: 0.72rem; font-weight: 500; padding: 2px 8px;
    border-radius: 6px; white-space: nowrap;
  }
  .save-status.saving { color: #f9a8d4; }
  .save-status.saved { color: #86efac; }
  .save-status.error { color: #fca5a5; font-weight: 700; }

  .lists-content {
    padding-top: 48px; max-width: 680px; margin: 0 auto; padding: 48px 1rem 3rem;
  }

  /* Category tabs */
  .category-tabs-wrap {
    position: sticky; top: 48px; z-index: 100;
    background: #fdf2f8; padding: 8px 0 0;
    margin: 0 -1rem;
  }
  .category-tabs {
    display: flex; overflow-x: auto; gap: 6px; padding: 0 1rem 8px;
    scrollbar-width: none;
  }
  .category-tabs::-webkit-scrollbar { display: none; }
  .cat-tab {
    flex-shrink: 0; border: 1.5px solid #fbcfe8; border-radius: 999px;
    background: white; color: #9d174d; font-size: 0.78rem; font-weight: 600;
    padding: 5px 14px; cursor: pointer; white-space: nowrap;
    transition: background 0.15s, color 0.15s;
  }
  .cat-tab:hover { background: #fce7f3; }
  .cat-tab.active { background: #db2777; color: white; border-color: #db2777; }
  .cat-tab-add {
    flex-shrink: 0; border: 1.5px dashed #fbcfe8; border-radius: 999px;
    background: transparent; color: #ec4899; font-size: 0.85rem; font-weight: 700;
    padding: 5px 12px; cursor: pointer; white-space: nowrap;
  }
  .cat-tab-add:hover { background: #fce7f3; }

  /* Add-item row */
  .add-area {
    background: white; border: 1.5px solid #fbcfe8; border-radius: 12px;
    padding: 10px 12px; margin-top: 12px; margin-bottom: 4px;
  }
  .add-main-row {
    display: flex; gap: 8px; align-items: center;
  }
  .add-text-input {
    flex: 1; border: none; outline: none; font-size: 0.95rem;
    background: transparent; color: #1a1a1a; min-width: 0;
  }
  .add-text-input::placeholder { color: #f9a8d4; }
  .url-toggle-btn {
    background: none; border: none; cursor: pointer; font-size: 1rem;
    line-height: 1; padding: 2px 4px; border-radius: 4px; opacity: 0.5;
    transition: opacity 0.15s;
  }
  .url-toggle-btn.active { opacity: 1; }
  .url-toggle-btn:hover { opacity: 1; }
  .add-submit-btn {
    background: #db2777; color: white; border: none; cursor: pointer;
    font-size: 0.8rem; font-weight: 600; padding: 5px 14px;
    border-radius: 8px; white-space: nowrap;
  }
  .add-submit-btn:hover { background: #be185d; }
  .add-url-row {
    display: flex; align-items: center; gap: 6px; margin-top: 8px;
    padding-top: 8px; border-top: 1px solid #fce7f3;
  }
  .add-url-input {
    flex: 1; border: 1px solid #fbcfe8; border-radius: 6px;
    padding: 5px 8px; font-size: 0.82rem; outline: none; color: #1a1a1a;
  }
  .add-url-input:focus { border-color: #ec4899; }
  .add-url-label { font-size: 0.78rem; color: #f472b6; white-space: nowrap; }

  /* Item list */
  .item-list { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; }

  .item-row {
    display: flex; align-items: center; gap: 8px;
    background: white; border: 1.5px solid #fce7f3; border-radius: 10px;
    padding: 10px 10px 10px 12px; min-height: 48px;
  }
  .item-row:hover { border-color: #f9a8d4; }
  .item-row.checked-row { opacity: 0.55; }

  .item-checkbox {
    width: 18px; height: 18px; cursor: pointer; flex-shrink: 0;
    accent-color: #db2777;
  }

  .item-text {
    flex: 1; font-size: 0.92rem; color: #1a1a1a; word-break: break-word; min-width: 0;
  }
  .item-text.struck { text-decoration: line-through; color: #9ca3af; }

  .item-link-btn {
    background: none; border: none; cursor: pointer; font-size: 0.9rem;
    padding: 2px 4px; line-height: 1; opacity: 0.6; flex-shrink: 0;
  }
  .item-link-btn:hover { opacity: 1; }

  .item-reorder-btn {
    background: none; border: none; cursor: pointer; font-size: 0.8rem;
    color: #d1d5db; padding: 2px 2px; line-height: 1; flex-shrink: 0;
  }
  .item-reorder-btn:hover { color: #6b7280; }
  .item-reorder-btn:disabled { opacity: 0.2; cursor: default; }

  .item-star-btn {
    background: none; border: none; cursor: pointer; font-size: 1rem;
    line-height: 1; padding: 2px 3px; flex-shrink: 0; opacity: 0.5;
    transition: opacity 0.15s;
  }
  .item-star-btn.starred { opacity: 1; }
  .item-star-btn:hover { opacity: 1; }

  .item-delete-btn {
    background: none; border: none; cursor: pointer; font-size: 0.85rem;
    color: #d1d5db; line-height: 1; padding: 2px 3px; flex-shrink: 0;
    transition: color 0.15s;
  }
  .item-delete-btn:hover { color: #ef4444; }

  /* Section divider */
  .starred-divider {
    display: flex; align-items: center; gap: 8px;
    margin: 12px 0 6px; font-size: 0.75rem; font-weight: 600;
    color: #f472b6; text-transform: uppercase; letter-spacing: 0.05em;
  }
  .starred-divider::before, .starred-divider::after {
    content: ''; flex: 1; height: 1px; background: #fbcfe8;
  }

  /* Close list button */
  .close-list-btn {
    margin-top: 16px; width: 100%;
    background: #fce7f3; border: 1.5px solid #fbcfe8; color: #9d174d;
    font-size: 0.82rem; font-weight: 600; padding: 9px 16px; border-radius: 10px;
    cursor: pointer; transition: background 0.15s;
  }
  .close-list-btn:hover { background: #fbcfe8; }

  /* Empty state */
  .empty-state {
    text-align: center; color: #f9a8d4; font-size: 0.9rem; padding: 32px 0;
  }

  /* History section */
  .history-section { margin-top: 24px; }
  .history-toggle-btn {
    background: none; border: none; cursor: pointer;
    font-size: 0.82rem; font-weight: 600; color: #be185d;
    padding: 4px 0; display: flex; align-items: center; gap: 6px;
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .history-toggle-btn:hover { color: #9d174d; }

  .history-entries { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }
  .history-entry {
    background: white; border: 1.5px solid #fce7f3; border-radius: 10px; padding: 12px;
  }
  .history-entry-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 8px;
  }
  .history-entry-cat { font-size: 0.82rem; font-weight: 700; color: #9d174d; }
  .history-entry-date { font-size: 0.75rem; color: #d1d5db; }
  .history-item-row {
    display: flex; align-items: center; gap: 8px; padding: 4px 0;
    font-size: 0.87rem; color: #374151;
  }
  .history-item-row.was-checked { text-decoration: line-through; color: #9ca3af; }
  .history-item-dot {
    width: 5px; height: 5px; border-radius: 50%; background: #fbcfe8; flex-shrink: 0;
  }
  .history-delete-btn {
    background: #fff5f5; border: 1px solid #fecaca; color: #dc2626;
    font-size: 0.72rem; padding: 2px 8px; border-radius: 6px; cursor: pointer;
  }
  .history-delete-btn:hover { background: #fee2e2; }

  /* Add category modal */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 500;
    display: flex; align-items: center; justify-content: center; padding: 16px;
  }
  .modal-box {
    background: white; max-width: 360px; width: 100%; border-radius: 12px;
    padding: 1.5rem; box-shadow: 0 20px 60px rgba(0,0,0,0.25);
  }
  .modal-title {
    font-size: 1rem; font-weight: 700; color: #9d174d; margin-bottom: 12px;
  }
  .modal-input {
    width: 100%; border: 1.5px solid #fbcfe8; border-radius: 8px;
    padding: 8px 12px; font-size: 0.95rem; outline: none; color: #1a1a1a;
    margin-bottom: 12px;
  }
  .modal-input:focus { border-color: #ec4899; }
  .modal-actions { display: flex; gap: 8px; justify-content: flex-end; }
  .modal-cancel-btn {
    background: #f3f4f6; border: none; cursor: pointer; color: #6b7280;
    font-size: 0.85rem; padding: 7px 16px; border-radius: 8px;
  }
  .modal-cancel-btn:hover { background: #e5e7eb; }
  .modal-confirm-btn {
    background: #db2777; color: white; border: none; cursor: pointer;
    font-size: 0.85rem; font-weight: 600; padding: 7px 16px; border-radius: 8px;
  }
  .modal-confirm-btn:hover { background: #be185d; }
`;

// ── Component ──────────────────────────────────────────────────────────────
export default function ListsClient() {
  const [state, setState] = useState<ListsState>(DEFAULT_STATE);
  const [newText, setNewText] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [showUrlField, setShowUrlField] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const addInputRef = useRef<HTMLInputElement>(null);
  const newCatInputRef = useRef<HTMLInputElement>(null);
  const isFirstRender = useRef(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Prevents the initial DB load from overwriting changes the user made before fetch resolved
  const userModifiedRef = useRef(false);

  // Load from API on mount
  useEffect(() => {
    fetch('/api/lists')
      .then(r => r.json())
      .then((data: ListsState | null) => {
        if (data && !userModifiedRef.current) {
          setState(normalizeState(data));
        }
      })
      .catch(() => {/* keep DEFAULT_STATE */});
  }, []);

  // Debounced save on every state change (after mount)
  const saveToApi = useCallback((nextState: ListsState) => {
    setSaveStatus('saving');
    fetch('/api/lists', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextState),
    })
      .then(r => {
        if (!r.ok) throw new Error('save failed');
        setSaveStatus('saved');
        if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
        statusTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
      })
      .catch(() => {
        setSaveStatus('error');
        if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
        statusTimerRef.current = setTimeout(() => setSaveStatus('idle'), 4000);
      });
  }, []);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveToApi(state), 500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state, saveToApi]);

  // Focus new category input when modal opens
  useEffect(() => {
    if (showAddModal) {
      setTimeout(() => newCatInputRef.current?.focus(), 50);
    }
  }, [showAddModal]);

  // ── Helpers ────────────────────────────────────────────────────────────
  const activeItems: Item[] = state.items[state.active] ?? [];
  const regularItems = activeItems.filter(i => !i.starred);
  const starredItems = activeItems.filter(i => i.starred);

  function updateState(patch: Partial<ListsState>) {
    setState(prev => ({ ...prev, ...patch }));
  }

  function setActiveCategory(cat: string) {
    updateState({ active: cat });
    setNewText('');
    setNewUrl('');
    setShowUrlField(false);
  }

  function setItemsForActive(items: Item[]) {
    setState(prev => ({
      ...prev,
      items: { ...prev.items, [prev.active]: items },
    }));
  }

  // ── Add item ──────────────────────────────────────────────────────────
  function addItem() {
    const text = newText.trim();
    if (!text) return;
    const url = newUrl.trim();
    const newItem: Item = { id: uid(), text, url, checked: false, starred: false };
    // Non-starred items go at the TOP of the non-starred section
    const nextItems = [newItem, ...regularItems, ...starredItems];
    userModifiedRef.current = true;
    // Save immediately — don't rely solely on debounce so a quick refresh doesn't lose the item
    const nextState: ListsState = {
      ...state,
      items: { ...state.items, [state.active]: nextItems },
    };
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveToApi(nextState);
    setItemsForActive(nextItems);
    setNewText('');
    setNewUrl('');
    setShowUrlField(false);
    addInputRef.current?.focus();
  }

  function handleAddKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') addItem();
  }

  // ── Item mutations ────────────────────────────────────────────────────
  function toggleCheck(id: string) {
    userModifiedRef.current = true;
    setItemsForActive(
      activeItems.map(i => i.id === id ? { ...i, checked: !i.checked } : i)
    );
  }

  function toggleStar(id: string) {
    const item = activeItems.find(i => i.id === id);
    if (!item) return;
    const others = activeItems.filter(i => i.id !== id);
    const updated = { ...item, starred: !item.starred };
    if (updated.starred) {
      // Move to bottom (starred section)
      setItemsForActive([...others.filter(i => !i.starred), ...others.filter(i => i.starred), updated]);
    } else {
      // Move to top of non-starred section
      setItemsForActive([updated, ...others.filter(i => !i.starred), ...others.filter(i => i.starred)]);
    }
  }

  function deleteItem(id: string) {
    userModifiedRef.current = true;
    setItemsForActive(activeItems.filter(i => i.id !== id));
  }

  function moveItem(id: string, direction: 'up' | 'down') {
    const item = activeItems.find(i => i.id === id);
    if (!item) return;
    // Reorder only within the same group (regular or starred)
    const group = item.starred ? starredItems : regularItems;
    const idx = group.findIndex(i => i.id === id);
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === group.length - 1) return;
    const newGroup = [...group];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newGroup[idx], newGroup[swapIdx]] = [newGroup[swapIdx], newGroup[idx]];
    if (item.starred) {
      setItemsForActive([...regularItems, ...newGroup]);
    } else {
      setItemsForActive([...newGroup, ...starredItems]);
    }
  }

  // ── Close list ────────────────────────────────────────────────────────
  function closeList() {
    const nonStarred = activeItems.filter(i => !i.starred);
    if (nonStarred.length === 0) return;
    const entry: HistoryEntry = {
      id: uid(),
      category: state.active,
      items: nonStarred,
      closedAt: new Date().toISOString(),
    };
    setState(prev => ({
      ...prev,
      history: [entry, ...prev.history],
      items: {
        ...prev.items,
        [prev.active]: prev.items[prev.active].filter(i => i.starred),
      },
    }));
  }

  // ── History ───────────────────────────────────────────────────────────
  function deleteHistoryEntry(id: string) {
    updateState({ history: state.history.filter(h => h.id !== id) });
  }

  const categoryHistory = state.history.filter(h => h.category === state.active);

  // ── Add category ──────────────────────────────────────────────────────
  function addCategory() {
    const name = newCatName.trim();
    if (!name || state.categories.includes(name)) return;
    setState(prev => ({
      ...prev,
      categories: [...prev.categories, name],
      items: { ...prev.items, [name]: [] },
      active: name,
    }));
    setNewCatName('');
    setShowAddModal(false);
  }

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <>
      <style>{styles}</style>

      {/* Header */}
      <header className="lists-header">
        <Link href="/" className="home-link">← Home</Link>
        <span className="lists-header-title">Shopping Lists</span>
        {saveStatus === 'saving' && <span className="save-status saving">Saving…</span>}
        {saveStatus === 'saved' && <span className="save-status saved">Saved</span>}
        {saveStatus === 'error' && <span className="save-status error">Save failed — check connection</span>}
      </header>

      {/* Content */}
      <main className="lists-content">

        {/* Category tabs */}
        <div className="category-tabs-wrap">
          <div className="category-tabs">
            {state.categories.map(cat => (
              <button
                key={cat}
                className={`cat-tab${state.active === cat ? ' active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
            <button className="cat-tab-add" onClick={() => setShowAddModal(true)}>+</button>
          </div>
        </div>

        {/* Add item */}
        <div className="add-area">
          <div className="add-main-row">
            <input
              ref={addInputRef}
              className="add-text-input"
              placeholder={`Add to ${state.active}…`}
              value={newText}
              onChange={e => setNewText(e.target.value)}
              onKeyDown={handleAddKeyDown}
            />
            <button
              className={`url-toggle-btn${showUrlField ? ' active' : ''}`}
              onClick={() => setShowUrlField(v => !v)}
              title="Add URL"
            >
              🔗
            </button>
            <button className="add-submit-btn" onClick={addItem}>Add</button>
          </div>
          {showUrlField && (
            <div className="add-url-row">
              <span className="add-url-label">URL:</span>
              <input
                className="add-url-input"
                placeholder="https://…"
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                onKeyDown={handleAddKeyDown}
              />
            </div>
          )}
        </div>

        {/* Item list */}
        <div className="item-list">

          {/* Regular items */}
          {regularItems.length === 0 && starredItems.length === 0 && (
            <div className="empty-state">No items yet — add something above.</div>
          )}

          {regularItems.map((item, idx) => (
            <div key={item.id} className={`item-row${item.checked ? ' checked-row' : ''}`}>
              <input
                type="checkbox"
                className="item-checkbox"
                checked={item.checked}
                onChange={() => toggleCheck(item.id)}
              />
              <span className={`item-text${item.checked ? ' struck' : ''}`}>{item.text}</span>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="item-link-btn"
                  title={item.url}
                  onClick={e => e.stopPropagation()}
                >
                  🔗
                </a>
              )}
              <button
                className="item-reorder-btn"
                onClick={() => moveItem(item.id, 'up')}
                disabled={idx === 0}
                title="Move up"
              >
                ▲
              </button>
              <button
                className="item-reorder-btn"
                onClick={() => moveItem(item.id, 'down')}
                disabled={idx === regularItems.length - 1}
                title="Move down"
              >
                ▼
              </button>
              <button
                className="item-star-btn"
                onClick={() => toggleStar(item.id)}
                title="Pin to Always on list"
              >
                ⭐
              </button>
              <button
                className="item-delete-btn"
                onClick={() => deleteItem(item.id)}
                title="Delete"
              >
                ✕
              </button>
            </div>
          ))}

          {/* Starred items */}
          {starredItems.length > 0 && (
            <>
              <div className="starred-divider">Always on list ⭐</div>
              {starredItems.map((item, idx) => (
                <div key={item.id} className={`item-row${item.checked ? ' checked-row' : ''}`}>
                  <input
                    type="checkbox"
                    className="item-checkbox"
                    checked={item.checked}
                    onChange={() => toggleCheck(item.id)}
                  />
                  <span className={`item-text${item.checked ? ' struck' : ''}`}>{item.text}</span>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="item-link-btn"
                      title={item.url}
                      onClick={e => e.stopPropagation()}
                    >
                      🔗
                    </a>
                  )}
                  <button
                    className="item-reorder-btn"
                    onClick={() => moveItem(item.id, 'up')}
                    disabled={idx === 0}
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    className="item-reorder-btn"
                    onClick={() => moveItem(item.id, 'down')}
                    disabled={idx === starredItems.length - 1}
                    title="Move down"
                  >
                    ▼
                  </button>
                  <button
                    className={`item-star-btn starred`}
                    onClick={() => toggleStar(item.id)}
                    title="Unpin from Always on list"
                  >
                    ⭐
                  </button>
                  <button
                    className="item-delete-btn"
                    onClick={() => deleteItem(item.id)}
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Close list */}
        {regularItems.length > 0 && (
          <button className="close-list-btn" onClick={closeList}>
            Archive &amp; Close List ({regularItems.length} item{regularItems.length !== 1 ? 's' : ''})
          </button>
        )}

        {/* History */}
        {categoryHistory.length > 0 && (
          <div className="history-section">
            <button className="history-toggle-btn" onClick={() => setShowHistory(v => !v)}>
              {showHistory ? '▾' : '▸'} History ({categoryHistory.length})
            </button>
            {showHistory && (
              <div className="history-entries">
                {categoryHistory.map(entry => (
                  <div key={entry.id} className="history-entry">
                    <div className="history-entry-header">
                      <span className="history-entry-cat">{entry.category}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="history-entry-date">{formatDate(entry.closedAt)}</span>
                        <button
                          className="history-delete-btn"
                          onClick={() => deleteHistoryEntry(entry.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    {entry.items.map(item => (
                      <div
                        key={item.id}
                        className={`history-item-row${item.checked ? ' was-checked' : ''}`}
                      >
                        <span className="history-item-dot" />
                        {item.text}
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '0.8rem', marginLeft: 4 }}
                          >
                            🔗
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add category modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Add Category</div>
            <input
              ref={newCatInputRef}
              className="modal-input"
              placeholder="e.g. Costco"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') addCategory();
                if (e.key === 'Escape') setShowAddModal(false);
              }}
            />
            <div className="modal-actions">
              <button className="modal-cancel-btn" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="modal-confirm-btn" onClick={addCategory}>Add</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
