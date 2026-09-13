"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_SHARED_TABS,
  DEFAULT_MEL_TABS,
  DEFAULT_KATHY_TABS,
} from "./defaults";
import {
  rid,
  stateKey,
  type TabDef,
  type SectionDef,
  type CarDef,
  type ItemDef,
  type Scope,
  type Templates,
  type TripMeta,
  type Trip,
} from "./types";

// ── Constants ────────────────────────────────────────────────────────────────

const BG = "#f5f4f0";
type UserId = "mel" | "kathy";
const USER_LABEL: Record<UserId, string> = { mel: "Mel", kathy: "Kathy" };

// ── Utility fetchers ─────────────────────────────────────────────────────────

async function fetchTemplates(): Promise<Templates> {
  const r = await fetch("/api/packing/templates");
  const raw = (await r.json()) as { shared: TabDef[] | null; mel: TabDef[] | null; kathy: TabDef[] | null };
  return {
    shared: raw.shared ?? DEFAULT_SHARED_TABS,
    mel: raw.mel ?? DEFAULT_MEL_TABS,
    kathy: raw.kathy ?? DEFAULT_KATHY_TABS,
  };
}

async function saveTemplate(id: Scope, data: TabDef[]) {
  await fetch("/api/packing/templates", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, data }),
  });
}

async function fetchTrips(): Promise<TripMeta[]> {
  const r = await fetch("/api/packing/trips");
  return r.json();
}

async function fetchTrip(id: string): Promise<Trip> {
  const r = await fetch(`/api/packing/trips/${id}`, { cache: 'no-store' });
  return r.json();
}

async function createTrip(input: { name: string; tripDate: string; camping: boolean }): Promise<Trip> {
  const r = await fetch("/api/packing/trips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return r.json();
}

async function saveTripState(id: string, state: Record<string, boolean>) {
  // keepalive lets the request survive page unload / tab close.
  await fetch(`/api/packing/trips/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state }),
    keepalive: true,
  });
}

async function deleteTripApi(id: string) {
  await fetch(`/api/packing/trips/${id}`, { method: "DELETE" });
}

// ── Progress helpers ─────────────────────────────────────────────────────────

function collectItemIds(tab: TabDef): string[] {
  const ids: string[] = [];
  if (tab.sections) {
    for (const s of tab.sections) for (const it of s.items) ids.push(it.id);
  }
  if (tab.cars) {
    for (const c of tab.cars) for (const sec of c.sections) for (const z of sec.zones) for (const it of z.items) ids.push(it.id);
  }
  return ids;
}

function tabProgress(tab: TabDef, scope: Scope, state: Record<string, boolean>) {
  const ids = collectItemIds(tab);
  const done = ids.filter((id) => state[stateKey(scope, id)]).length;
  return { done, total: ids.length };
}

// ── Main component ───────────────────────────────────────────────────────────

type View =
  | { kind: "hub" }
  | { kind: "new" }
  | { kind: "trip"; tripId: string };

export default function PackingClient() {
  const [view, setView] = useState<View>({ kind: "hub" });
  const [templates, setTemplates] = useState<Templates | null>(null);
  const [trips, setTrips] = useState<TripMeta[] | null>(null);
  // Cache of full trip data (with state). Populated on first open of a trip.
  // Used as the source of truth for that trip for the rest of the session so
  // leaving + returning doesn't re-fetch (which can race an in-flight save).
  const [tripCache, setTripCache] = useState<Record<string, Trip>>({});

  // Load templates + trip list on mount.
  useEffect(() => {
    fetchTemplates().then(setTemplates).catch(() => setTemplates({ shared: DEFAULT_SHARED_TABS, mel: DEFAULT_MEL_TABS, kathy: DEFAULT_KATHY_TABS }));
    fetchTrips().then(setTrips).catch(() => setTrips([]));
  }, []);

  const goHub = useCallback(() => {
    setView({ kind: "hub" });
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }, []);
  const goNew = useCallback(() => setView({ kind: "new" }), []);
  const goTrip = useCallback((tripId: string) => {
    setView({ kind: "trip", tripId });
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }, []);

  // Update a single template scope and persist.
  const updateTemplate = useCallback((scope: Scope, next: TabDef[]) => {
    setTemplates((prev) => (prev ? { ...prev, [scope]: next } : prev));
    saveTemplate(scope, next).catch(() => {});
  }, []);

  const setCachedTrip = useCallback((tripId: string, updater: (t: Trip) => Trip) => {
    setTripCache((cache) => {
      const existing = cache[tripId];
      if (!existing) return cache;
      return { ...cache, [tripId]: updater(existing) };
    });
  }, []);

  const seedCachedTrip = useCallback((trip: Trip) => {
    setTripCache((cache) => ({ ...cache, [trip.id]: trip }));
  }, []);

  // Called after creating a new trip so hub is up to date on return.
  const onTripCreated = useCallback((trip: Trip) => {
    setTrips((prev) => (prev ? [trip, ...prev] : [trip]));
    seedCachedTrip(trip);
    goTrip(trip.id);
  }, [goTrip, seedCachedTrip]);

  const onTripDeleted = useCallback((id: string) => {
    setTrips((prev) => (prev ? prev.filter((t) => t.id !== id) : prev));
    setTripCache((cache) => {
      const { [id]: _, ...rest } = cache;
      return rest;
    });
    goHub();
  }, [goHub]);

  if (!templates || !trips) {
    return (
      <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>
        Loading…
      </div>
    );
  }

  if (view.kind === "hub") return <HubView trips={trips} onNew={goNew} onOpen={goTrip} />;
  if (view.kind === "new") return <NewTripView onCancel={goHub} onCreated={onTripCreated} />;
  return (
    <TripView
      tripId={view.tripId}
      cachedTrip={tripCache[view.tripId] ?? null}
      setCachedTrip={setCachedTrip}
      seedCachedTrip={seedCachedTrip}
      templates={templates}
      updateTemplate={updateTemplate}
      onBack={goHub}
      onDeleted={onTripDeleted}
    />
  );
}

// ── HUB ──────────────────────────────────────────────────────────────────────

function HubView({
  trips,
  onNew,
  onOpen,
}: {
  trips: TripMeta[];
  onNew: () => void;
  onOpen: (id: string) => void;
}) {
  return (
    <div style={{ background: BG, minHeight: "100vh", paddingBottom: 40 }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px 12px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: "#2c2c2c", margin: 0 }}>Packing</h1>
          <button
            onClick={onNew}
            style={{ background: "#4a90d9", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            + New Trip
          </button>
        </div>

        <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8a8a8a", padding: "8px 4px 6px" }}>
          Past & Upcoming Trips
        </div>

        {trips.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 12, padding: 20, textAlign: "center", color: "#999", fontSize: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            No trips yet. Tap “New Trip” to get started.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {trips.map((t) => (
              <button
                key={t.id}
                onClick={() => onOpen(t.id)}
                style={{ textAlign: "left", background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1px solid #e0ddd8", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#2c2c2c" }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: "#999" }}>{formatTripDate(t.tripDate)}</div>
                </div>
                {t.camping && (
                  <div style={{ fontSize: 11, color: "#6b8f6b", fontWeight: 600, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Camping
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTripDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

// ── NEW TRIP ─────────────────────────────────────────────────────────────────

function NewTripView({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (trip: Trip) => void;
}) {
  const [name, setName] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const [tripDate, setTripDate] = useState(today);
  const [camping, setCamping] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !tripDate) return;
    setSaving(true);
    setError(null);
    try {
      const trip = await createTrip({
        name: name.trim(),
        tripDate: `${tripDate}T12:00:00`,
        camping,
      });
      onCreated(trip);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  }

  return (
    <div style={{ background: BG, minHeight: "100vh", paddingBottom: 40 }}>
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "16px 12px 0" }}>
        <button
          onClick={onCancel}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "1px solid #d0ccc8", borderRadius: 6, padding: "7px 14px", fontSize: 13, color: "#555", cursor: "pointer", marginBottom: 12 }}
        >
          ← Cancel
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "#2c2c2c", margin: "4px 0 16px" }}>New Trip</h2>

        <form onSubmit={submit} style={{ background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em" }}>Trip Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Beach week"
              autoFocus
              style={{ border: "1px solid #d0ccc8", borderRadius: 6, padding: "8px 10px", fontSize: 14 }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em" }}>Trip Date</span>
            <input
              type="date"
              value={tripDate}
              onChange={(e) => setTripDate(e.target.value)}
              style={{ border: "1px solid #d0ccc8", borderRadius: 6, padding: "8px 10px", fontSize: 14 }}
            />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={camping}
              onChange={(e) => setCamping(e.target.checked)}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            <span style={{ fontSize: 14, color: "#2c2c2c" }}>Camping trip (adds camping checklist)</span>
          </label>

          {error && (
            <div style={{ background: "#fce8e6", border: "1px solid #f5b7b1", borderRadius: 6, padding: "8px 10px", fontSize: 13, color: "#a22" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              type="submit"
              disabled={saving || !name.trim() || !tripDate}
              style={{ background: "#4a90d9", color: "#fff", border: "none", borderRadius: 6, padding: "10px 16px", fontSize: 14, fontWeight: 600, cursor: saving ? "wait" : "pointer", opacity: !name.trim() || !tripDate ? 0.5 : 1 }}
            >
              {saving ? "Creating…" : "Create Trip"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── TRIP VIEW ────────────────────────────────────────────────────────────────

function TripView({
  tripId,
  cachedTrip,
  setCachedTrip,
  seedCachedTrip,
  templates,
  updateTemplate,
  onBack,
  onDeleted,
}: {
  tripId: string;
  cachedTrip: Trip | null;
  setCachedTrip: (tripId: string, updater: (t: Trip) => Trip) => void;
  seedCachedTrip: (t: Trip) => void;
  templates: Templates;
  updateTemplate: (scope: Scope, next: TabDef[]) => void;
  onBack: () => void;
  onDeleted: (id: string) => void;
}) {
  const trip = cachedTrip;
  const [activeTabId, setActiveTabId] = useState<string>("hub");
  const [activeUser, setActiveUser] = useState<UserId>("mel");
  const [editMode, setEditMode] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestTripRef = useRef<{ id: string; state: Record<string, boolean> } | null>(null);
  const didFetchRef = useRef(false);

  // Fetch on first entry to this trip if we don't have it cached yet.
  useEffect(() => {
    if (cachedTrip || didFetchRef.current) return;
    didFetchRef.current = true;
    fetchTrip(tripId).then((t) => seedCachedTrip(t)).catch(() => {});
  }, [tripId, cachedTrip, seedCachedTrip]);

  // Debounced save of state to server. We save the cached trip's state; the
  // cache in the parent is what the UI actually renders from.
  useEffect(() => {
    if (!trip) return;
    latestTripRef.current = { id: trip.id, state: trip.state };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTripState(trip.id, trip.state).catch(() => {});
      saveTimer.current = null;
    }, 700);
  }, [trip]);

  // Flush pending save on unmount + on page hide (browser back, tab close, iOS
  // swipe-away). Cache in parent already has the latest state, so the visible
  // check-loss bug is gone regardless of whether this save round-trip wins —
  // this just ensures durability across full page reloads.
  useEffect(() => {
    function flush() {
      if (saveTimer.current && latestTripRef.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        saveTripState(latestTripRef.current.id, latestTripRef.current.state).catch(() => {});
      }
    }
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  const applicableShared = useMemo(
    () => templates.shared.filter((t) => !t.onlyWhenCamping || (trip?.camping ?? false)),
    [templates.shared, trip?.camping],
  );

  // Tabs in the tab bar: shared tabs, then Clothing / Health "combined" tabs
  // (which pick from mel|kathy templates via activeUser).
  const perUserTabIds = useMemo(() => {
    const ids = new Set<string>();
    for (const t of templates.mel) ids.add(t.id);
    for (const t of templates.kathy) ids.add(t.id);
    return Array.from(ids);
  }, [templates.mel, templates.kathy]);

  function findUserTab(user: UserId, tabId: string): TabDef | undefined {
    return templates[user].find((t) => t.id === tabId);
  }

  function labelForPerUserTab(tabId: string): string {
    return findUserTab("mel", tabId)?.label ?? findUserTab("kathy", tabId)?.label ?? tabId;
  }

  function colorForPerUserTab(tabId: string): string {
    return findUserTab("mel", tabId)?.color ?? findUserTab("kathy", tabId)?.color ?? "#888";
  }

  const setStateItem = useCallback((key: string, val: boolean) => {
    setCachedTrip(tripId, (prev) => {
      const next = { ...prev.state };
      if (val) next[key] = true;
      else delete next[key];
      return { ...prev, state: next };
    });
  }, [tripId, setCachedTrip]);

  const setManyState = useCallback((updates: { key: string; val: boolean }[]) => {
    setCachedTrip(tripId, (prev) => {
      const next = { ...prev.state };
      for (const { key, val } of updates) {
        if (val) next[key] = true;
        else delete next[key];
      }
      return { ...prev, state: next };
    });
  }, [tripId, setCachedTrip]);

  async function handleDeleteTrip() {
    if (!trip) return;
    if (!confirm(`Delete trip "${trip.name}"? This cannot be undone.`)) return;
    await deleteTripApi(trip.id);
    onDeleted(trip.id);
  }

  if (!trip) {
    return (
      <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>
        Loading trip…
      </div>
    );
  }

  // ── Trip hub (tab picker) ──
  if (activeTabId === "hub") {
    type TabCard = { id: string; label: string; color: string; scope: Scope; tab: TabDef; isPerUser: boolean };
    const cards: TabCard[] = [];
    for (const t of applicableShared) {
      cards.push({ id: t.id, label: t.label, color: t.color, scope: "shared", tab: t, isPerUser: false });
    }
    // Per-user cards: show one card per unique per-user tab id, using activeUser's template.
    for (const id of perUserTabIds) {
      const t = findUserTab(activeUser, id);
      if (t) cards.push({ id: t.id, label: t.label, color: t.color, scope: activeUser, tab: t, isPerUser: true });
    }

    return (
      <div style={{ background: BG, minHeight: "100vh", paddingBottom: 40 }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "12px 0 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px 8px" }}>
            <button
              onClick={onBack}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "1px solid #d0ccc8", borderRadius: 6, padding: "7px 14px", fontSize: 13, color: "#555", cursor: "pointer" }}
            >
              ← Trips
            </button>
            <button
              onClick={handleDeleteTrip}
              style={{ background: "#fff", color: "#a22", border: "1px solid #f5b7b1", borderRadius: 6, padding: "7px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
            >
              Delete Trip
            </button>
          </div>

          <div style={{ padding: "0 12px 12px" }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: "#2c2c2c" }}>{trip.name}</div>
            <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>
              {formatTripDate(trip.tripDate)}
              {trip.camping && <span style={{ marginLeft: 8, color: "#6b8f6b", fontWeight: 600 }}>· Camping</span>}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "0 12px" }}>
            {cards.map((card) => {
              const { done, total } = tabProgress(card.tab, card.scope, trip.state);
              const allDone = total > 0 && done === total;
              const pct = total > 0 ? (done / total) * 100 : 0;
              return (
                <div
                  key={`${card.scope}:${card.id}`}
                  style={{
                    background: allDone ? "#f0f7f0" : "#fff",
                    borderRadius: 12,
                    padding: 14,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                    border: `1px solid ${allDone ? "#b8d8b8" : "#e0ddd8"}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#2c2c2c" }}>
                    {card.label}
                    {card.isPerUser && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 500, color: "#888" }}>({USER_LABEL[activeUser]})</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "#999" }}>{done} / {total}</div>
                  <div style={{ height: 5, background: "#ece9e4", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 3, width: `${pct}%`, background: card.color, transition: "width 0.35s ease" }} />
                  </div>
                  <button
                    onClick={() => setActiveTabId(card.id)}
                    style={{ background: "none", border: `1px solid ${card.color}`, borderRadius: 5, padding: "5px 12px", fontSize: 12, fontWeight: 500, color: card.color, cursor: "pointer", alignSelf: "flex-end", marginTop: 2 }}
                  >
                    Go →
                  </button>
                </div>
              );
            })}
          </div>

          {perUserTabIds.length > 0 && (
            <div style={{ padding: "20px 12px 0", display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#666" }}>
              <span>Per-user view:</span>
              <UserSwitcher value={activeUser} onChange={setActiveUser} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Checklist view ──
  const sharedTab = applicableShared.find((t) => t.id === activeTabId);
  const isSharedTab = !!sharedTab;
  const scope: Scope = isSharedTab ? "shared" : activeUser;
  const tab: TabDef | undefined = isSharedTab ? sharedTab : findUserTab(activeUser, activeTabId);
  if (!tab) {
    // The active user has no template for this tab id; drop back to hub.
    return (
      <div style={{ background: BG, minHeight: "100vh", padding: 20 }}>
        <button onClick={() => setActiveTabId("hub")}>← Back</button>
        <p style={{ marginTop: 20, color: "#999" }}>No list for this user.</p>
      </div>
    );
  }

  function updateThisTab(nextTab: TabDef) {
    if (isSharedTab) {
      const next = templates.shared.map((t) => (t.id === nextTab.id ? nextTab : t));
      updateTemplate("shared", next);
    } else {
      const next = templates[activeUser].map((t) => (t.id === nextTab.id ? nextTab : t));
      updateTemplate(activeUser, next);
    }
  }

  return (
    <div style={{ background: BG, minHeight: "100vh", paddingBottom: 40 }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 12px 4px" }}>
          <button
            onClick={() => setActiveTabId("hub")}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "1px solid #d0ccc8", borderRadius: 6, padding: "7px 14px", fontSize: 13, color: "#555", cursor: "pointer" }}
          >
            ← {trip.name}
          </button>
          <button
            onClick={() => setEditMode((v) => !v)}
            style={{ background: editMode ? tab.color : "#fff", color: editMode ? "#fff" : tab.color, border: `1px solid ${tab.color}`, borderRadius: 6, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            {editMode ? "Done" : "Edit"}
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px 14px" }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: tab.color, margin: 0 }}>
            {tab.label}
            {!isSharedTab && <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: "#888" }}>({USER_LABEL[activeUser]})</span>}
          </h2>
          {!isSharedTab && <UserSwitcher value={activeUser} onChange={setActiveUser} />}
        </div>

        <div style={{ padding: "0 12px" }}>
          {tab.cars ? (
            <CarView
              tab={tab}
              scope={scope}
              state={trip.state}
              onSet={setStateItem}
              onSetMany={setManyState}
              editMode={editMode}
              onChange={updateThisTab}
            />
          ) : (
            <>
              {(tab.sections ?? []).map((sec) => (
                <SectionView
                  key={sec.id}
                  section={sec}
                  tabColor={tab.color}
                  scope={scope}
                  state={trip.state}
                  onSet={setStateItem}
                  onSetMany={setManyState}
                  editMode={editMode}
                  onChange={(nextSec) => {
                    const nextTab: TabDef = {
                      ...tab,
                      sections: (tab.sections ?? []).map((s) => (s.id === nextSec.id ? nextSec : s)),
                    };
                    updateThisTab(nextTab);
                  }}
                  onDelete={() => {
                    if (!confirm(`Delete section "${sec.title}"?`)) return;
                    const nextTab: TabDef = {
                      ...tab,
                      sections: (tab.sections ?? []).filter((s) => s.id !== sec.id),
                    };
                    updateThisTab(nextTab);
                  }}
                />
              ))}
              {editMode && (
                <AddSectionRow
                  onAdd={(title) => {
                    const nextTab: TabDef = {
                      ...tab,
                      sections: [...(tab.sections ?? []), { id: rid(), title, items: [] }],
                    };
                    updateThisTab(nextTab);
                  }}
                />
              )}
              {tab.meals && tab.meals.length > 0 && <MealsBlock title="Camp Meals" color={tab.color} meals={tab.meals} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── User switcher ────────────────────────────────────────────────────────────

function UserSwitcher({ value, onChange }: { value: UserId; onChange: (u: UserId) => void }) {
  return (
    <div style={{ display: "inline-flex", background: "#fff", border: "1px solid #d0ccc8", borderRadius: 6, overflow: "hidden" }}>
      {(["mel", "kathy"] as const).map((u) => (
        <button
          key={u}
          onClick={() => onChange(u)}
          style={{
            background: value === u ? "#3a3a3a" : "#fff",
            color: value === u ? "#f0ede8" : "#555",
            border: "none",
            padding: "5px 12px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {USER_LABEL[u]}
        </button>
      ))}
    </div>
  );
}

// ── Section (checklist) ──────────────────────────────────────────────────────

function SectionView({
  section,
  tabColor,
  scope,
  state,
  onSet,
  onSetMany,
  editMode,
  onChange,
  onDelete,
}: {
  section: SectionDef;
  tabColor: string;
  scope: Scope;
  state: Record<string, boolean>;
  onSet: (key: string, val: boolean) => void;
  onSetMany: (updates: { key: string; val: boolean }[]) => void;
  editMode: boolean;
  onChange: (next: SectionDef) => void;
  onDelete: () => void;
}) {
  const color = section.color || tabColor;
  const items = section.items;
  const checkedCount = items.filter((it) => state[stateKey(scope, it.id)]).length;
  const allDone = items.length > 0 && checkedCount === items.length;
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const isCollapsed = editMode ? false : allDone || collapsed;

  const allChecked = checkedCount === items.length && items.length > 0;
  const someChecked = checkedCount > 0 && !allChecked;

  function toggleAll(val: boolean) {
    onSetMany(items.map((it) => ({ key: stateKey(scope, it.id), val })));
  }

  return (
    <div style={{ background: "#fff", borderRadius: 12, marginBottom: 10, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", opacity: allDone && !editMode ? 0.72 : 1, transition: "opacity 0.3s" }}>
      <div
        onClick={() => !editMode && setCollapsed((v) => !v)}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 14px", cursor: editMode ? "default" : "pointer", userSelect: "none" }}
      >
        <span style={{ width: 11, height: 11, borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block" }} />
        {editMode ? (
          <input
            type="text"
            value={section.title}
            onChange={(e) => onChange({ ...section, title: e.target.value })}
            style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#1e1e1e", border: "1px solid #e0ddd8", borderRadius: 4, padding: "4px 6px" }}
          />
        ) : (
          <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#1e1e1e" }}>
            {section.title}
            {allDone && <span style={{ fontWeight: 400, opacity: 0.6 }}> ✓</span>}
          </span>
        )}
        {!editMode ? (
          <>
            <span style={{ fontSize: 12, color: "#999", fontWeight: 500 }}>{checkedCount} / {items.length}</span>
            <Caret rotated={isCollapsed} />
          </>
        ) : (
          <button
            onClick={onDelete}
            style={{ background: "none", border: "1px solid #f5b7b1", borderRadius: 4, padding: "4px 8px", fontSize: 11, color: "#a22", cursor: "pointer" }}
          >
            Delete
          </button>
        )}
      </div>

      <div style={{ overflow: "hidden", maxHeight: isCollapsed ? 0 : 6000, opacity: isCollapsed ? 0 : 1, transition: "max-height 0.3s ease, opacity 0.3s" }}>
        <ul style={{ padding: "0 14px 12px", listStyle: "none" }}>
          {items.map((item, iIdx) => {
            const key = stateKey(scope, item.id);
            const checked = !!state[key];
            return (
              <li key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: iIdx < items.length - 1 ? "1px solid #f2f1ed" : "none" }}>
                {!editMode ? (
                  <>
                    <input
                      type="checkbox"
                      id={key}
                      checked={checked}
                      onChange={(e) => onSet(key, e.target.checked)}
                      style={{ marginTop: 2, flexShrink: 0, width: 16, height: 16, cursor: "pointer", accentColor: "#555" }}
                    />
                    <label
                      htmlFor={key}
                      style={{ fontSize: 14, color: checked ? "#b0aea8" : "#2c2c2c", cursor: "pointer", lineHeight: 1.4, transition: "color 0.2s", textDecoration: checked ? "line-through" : "none" }}
                    >
                      {item.text}
                    </label>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => onChange({ ...section, items: items.map((it) => (it.id === item.id ? { ...it, text: e.target.value } : it)) })}
                      style={{ flex: 1, fontSize: 14, border: "1px solid #e0ddd8", borderRadius: 4, padding: "4px 6px" }}
                    />
                    <button
                      onClick={() => {
                        onChange({ ...section, items: items.filter((it) => it.id !== item.id) });
                      }}
                      style={{ background: "none", border: "none", color: "#a22", fontSize: 16, cursor: "pointer", padding: "0 4px" }}
                      aria-label="Remove item"
                    >
                      ×
                    </button>
                  </>
                )}
              </li>
            );
          })}

          {editMode && (
            <AddItemRow
              onAdd={(text) => onChange({ ...section, items: [...items, { id: rid(), text }] })}
            />
          )}

          {!editMode && items.length > 0 && (
            <li style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "6px 0", background: "#f5f3ef", borderTop: "1px solid #e8e5e0", marginTop: 4 }}>
              <input
                type="checkbox"
                id={`${section.id}-all`}
                checked={allChecked}
                ref={(el) => { if (el) el.indeterminate = someChecked; }}
                onChange={(e) => toggleAll(e.target.checked)}
                style={{ marginTop: 2, flexShrink: 0, width: 16, height: 16, cursor: "pointer", accentColor: "#555" }}
              />
              <label htmlFor={`${section.id}-all`} style={{ fontSize: "0.82rem", color: "#888", fontStyle: "italic", cursor: "pointer" }}>All</label>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

function Caret({ rotated }: { rotated: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
      style={{ width: 18, height: 18, color: "#bbb", flexShrink: 0, transition: "transform 0.25s", transform: rotated ? "rotate(-90deg)" : "rotate(0deg)" }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ── Inline "add" rows ───────────────────────────────────────────────────────

function AddItemRow({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <li style={{ display: "flex", gap: 8, padding: "8px 0 4px", borderTop: "1px dashed #e0ddd8", marginTop: 4 }}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && text.trim()) {
            onAdd(text.trim());
            setText("");
          }
        }}
        placeholder="Add item…"
        style={{ flex: 1, fontSize: 13, border: "1px solid #e0ddd8", borderRadius: 4, padding: "5px 7px" }}
      />
      <button
        onClick={() => {
          if (!text.trim()) return;
          onAdd(text.trim());
          setText("");
        }}
        style={{ background: "#3a3a3a", color: "#f0ede8", border: "none", borderRadius: 4, padding: "5px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
      >
        Add
      </button>
    </li>
  );
}

function AddSectionRow({ onAdd }: { onAdd: (title: string) => void }) {
  const [title, setTitle] = useState("");
  return (
    <div style={{ background: "#fff", borderRadius: 12, marginBottom: 10, padding: "12px 14px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", display: "flex", gap: 8, border: "1px dashed #d0ccc8" }}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim()) {
            onAdd(title.trim());
            setTitle("");
          }
        }}
        placeholder="New section title…"
        style={{ flex: 1, fontSize: 13, border: "1px solid #e0ddd8", borderRadius: 4, padding: "6px 8px" }}
      />
      <button
        onClick={() => {
          if (!title.trim()) return;
          onAdd(title.trim());
          setTitle("");
        }}
        style={{ background: "#3a3a3a", color: "#f0ede8", border: "none", borderRadius: 4, padding: "6px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
      >
        Add Section
      </button>
    </div>
  );
}

// ── Meals reference ──────────────────────────────────────────────────────────

function MealsBlock({ title, color, meals }: { title: string; color: string; meals: { id: string; name: string; note: string }[] }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, marginBottom: 10, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 14px" }}>
        <span style={{ width: 11, height: 11, borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block" }} />
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#1e1e1e" }}>{title}</span>
        <span style={{ fontSize: 12, color: "#999", fontWeight: 500 }}>reference</span>
      </div>
      <ul style={{ padding: "4px 14px 12px", listStyle: "none" }}>
        {meals.map((m, i) => (
          <li key={m.id} style={{ padding: "8px 0", borderBottom: i < meals.length - 1 ? "1px solid #f2f1ed" : "none" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#2c2c2c" }}>{m.name}</div>
            <div style={{ fontSize: 12, fontStyle: "italic", color: "#888", marginTop: 1 }}>{m.note}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Car view ─────────────────────────────────────────────────────────────────

function CarView({
  tab,
  scope,
  state,
  onSet,
  onSetMany,
  editMode,
  onChange,
}: {
  tab: TabDef;
  scope: Scope;
  state: Record<string, boolean>;
  onSet: (key: string, val: boolean) => void;
  onSetMany: (updates: { key: string; val: boolean }[]) => void;
  editMode: boolean;
  onChange: (nextTab: TabDef) => void;
}) {
  const cars = tab.cars ?? [];

  function updateCar(next: CarDef) {
    onChange({ ...tab, cars: cars.map((c) => (c.id === next.id ? next : c)) });
  }

  return (
    <div>
      {cars.map((car, carIdx) => (
        <div key={car.id}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 600, color: "#1e1e1e", padding: carIdx === 0 ? "4px 0 6px" : "18px 0 6px", borderBottom: "1px solid #e0ddd8", marginBottom: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: car.color, flexShrink: 0, display: "inline-block" }} />
            {editMode ? (
              <input
                type="text"
                value={car.name}
                onChange={(e) => updateCar({ ...car, name: e.target.value })}
                style={{ flex: 1, fontSize: 14, fontWeight: 600, border: "1px solid #e0ddd8", borderRadius: 4, padding: "3px 6px" }}
              />
            ) : (
              car.name
            )}
          </div>
          {car.sections.map((csec) => (
            <div key={csec.id}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8a9ab0", padding: "10px 0 4px" }}>
                {csec.heading}
              </div>
              {csec.zones.map((zone) => (
                <ZoneView
                  key={zone.id}
                  zone={zone}
                  carColor={car.color}
                  scope={scope}
                  state={state}
                  onSet={onSet}
                  onSetMany={onSetMany}
                  editMode={editMode}
                  onChange={(nextZone) => {
                    const nextCar: CarDef = {
                      ...car,
                      sections: car.sections.map((s) =>
                        s.id !== csec.id ? s : { ...s, zones: s.zones.map((z) => (z.id === nextZone.id ? nextZone : z)) },
                      ),
                    };
                    updateCar(nextCar);
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ZoneView({
  zone,
  carColor,
  scope,
  state,
  onSet,
  onSetMany,
  editMode,
  onChange,
}: {
  zone: { id: string; label: string; items: ItemDef[] };
  carColor: string;
  scope: Scope;
  state: Record<string, boolean>;
  onSet: (key: string, val: boolean) => void;
  onSetMany: (updates: { key: string; val: boolean }[]) => void;
  editMode: boolean;
  onChange: (next: { id: string; label: string; items: ItemDef[] }) => void;
}) {
  const items = zone.items;
  const checkedCount = items.filter((it) => state[stateKey(scope, it.id)]).length;
  const allDone = items.length > 0 && checkedCount === items.length;
  const [collapsed, setCollapsed] = useState(false);
  const isCollapsed = editMode ? false : allDone || collapsed;
  const allChecked = checkedCount === items.length && items.length > 0;
  const someChecked = checkedCount > 0 && !allChecked;

  return (
    <div style={{ background: "#fff", borderRadius: 12, marginBottom: 10, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", opacity: allDone && !editMode ? 0.72 : 1 }}>
      <div
        onClick={() => !editMode && setCollapsed((v) => !v)}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 14px", cursor: editMode ? "default" : "pointer", userSelect: "none" }}
      >
        <span style={{ width: 11, height: 11, borderRadius: "50%", background: carColor, flexShrink: 0, display: "inline-block" }} />
        {editMode ? (
          <input
            type="text"
            value={zone.label}
            onChange={(e) => onChange({ ...zone, label: e.target.value })}
            style={{ flex: 1, fontSize: 14, fontWeight: 600, border: "1px solid #e0ddd8", borderRadius: 4, padding: "4px 6px" }}
          />
        ) : (
          <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#1e1e1e" }}>
            {zone.label}
            {allDone && <span style={{ fontWeight: 400, opacity: 0.6 }}> ✓</span>}
          </span>
        )}
        {!editMode && (
          <>
            <span style={{ fontSize: 12, color: "#999", fontWeight: 500 }}>{checkedCount} / {items.length}</span>
            <Caret rotated={isCollapsed} />
          </>
        )}
      </div>

      <div style={{ overflow: "hidden", maxHeight: isCollapsed ? 0 : 4000, opacity: isCollapsed ? 0 : 1, transition: "max-height 0.3s ease, opacity 0.3s" }}>
        <ul style={{ padding: "0 14px 12px", listStyle: "none" }}>
          {items.map((item, iIdx) => {
            const key = stateKey(scope, item.id);
            const checked = !!state[key];
            return (
              <li key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: iIdx < items.length - 1 ? "1px solid #f2f1ed" : "none" }}>
                {!editMode ? (
                  <>
                    <input
                      type="checkbox"
                      id={key}
                      checked={checked}
                      onChange={(e) => onSet(key, e.target.checked)}
                      style={{ marginTop: 2, flexShrink: 0, width: 16, height: 16, cursor: "pointer", accentColor: "#555" }}
                    />
                    <label
                      htmlFor={key}
                      style={{ fontSize: 14, color: checked ? "#b0aea8" : "#2c2c2c", cursor: "pointer", lineHeight: 1.4, textDecoration: checked ? "line-through" : "none" }}
                    >
                      {item.text}
                    </label>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => onChange({ ...zone, items: items.map((it) => (it.id === item.id ? { ...it, text: e.target.value } : it)) })}
                      style={{ flex: 1, fontSize: 14, border: "1px solid #e0ddd8", borderRadius: 4, padding: "4px 6px" }}
                    />
                    <button
                      onClick={() => onChange({ ...zone, items: items.filter((it) => it.id !== item.id) })}
                      style={{ background: "none", border: "none", color: "#a22", fontSize: 16, cursor: "pointer", padding: "0 4px" }}
                      aria-label="Remove item"
                    >
                      ×
                    </button>
                  </>
                )}
              </li>
            );
          })}
          {editMode && (
            <AddItemRow onAdd={(text) => onChange({ ...zone, items: [...items, { id: rid(), text }] })} />
          )}
          {!editMode && items.length > 0 && (
            <li style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "6px 0", background: "#f5f3ef", borderTop: "1px solid #e8e5e0", marginTop: 4 }}>
              <input
                type="checkbox"
                id={`${zone.id}-all`}
                checked={allChecked}
                ref={(el) => { if (el) el.indeterminate = someChecked; }}
                onChange={(e) => onSetMany(items.map((it) => ({ key: stateKey(scope, it.id), val: e.target.checked })))}
                style={{ marginTop: 2, flexShrink: 0, width: 16, height: 16, cursor: "pointer", accentColor: "#555" }}
              />
              <label htmlFor={`${zone.id}-all`} style={{ fontSize: "0.82rem", color: "#888", fontStyle: "italic", cursor: "pointer" }}>All</label>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
