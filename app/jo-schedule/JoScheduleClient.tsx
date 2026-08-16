"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { categories as baseCategories, Activity } from "./data";

type FilterMode = "all" | "solo" | "notSolo";

type ScheduleItem = {
  id: string;
  activity: string;
  category: string;
  categoryColor: string;
  duration: number;
};

type CustomActivity = {
  categoryName: string;
  activity: string;
};

type TrashedActivity = {
  categoryName: string;
  activity: string;
  color: string;
};

const MY_ACTIVITIES_KEY = "My Activities";
const MY_COLOR = "bg-yellow-100 text-yellow-800 border-yellow-200";

function parseTime(startTime: string, offsetMinutes: number): string {
  const [hStr, mStr] = startTime.split(":");
  const totalMinutes = parseInt(hStr) * 60 + parseInt(mStr) + offsetMinutes;
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  const ampm = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function matchesFilter(a: Activity, filter: FilterMode): boolean {
  if (filter === "all") return true;
  if (filter === "solo") return a.solo;
  return a.notSolo;
}

// Group activities by their sub field, preserving insertion order
function groupBySub(activities: Activity[]): Map<string, Activity[]> {
  const map = new Map<string, Activity[]>();
  for (const a of activities) {
    const key = a.sub ?? "";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  }
  return map;
}

export default function JoScheduleClient() {
  const [selected, setSelected] = useState<ScheduleItem[]>([]);
  const [startTime, setStartTime] = useState("08:00");
  const [showPrint, setShowPrint] = useState(false);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [editMode, setEditMode] = useState(false);
  const [customActivities, setCustomActivities] = useState<CustomActivity[]>([]);
  const [trashedActivities, setTrashedActivities] = useState<TrashedActivity[]>([]);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newActivityName, setNewActivityName] = useState("");
  const [showTrash, setShowTrash] = useState(false);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  // My Activities quick-add (always visible, no edit mode needed)
  const [myNewName, setMyNewName] = useState("");
  const [showMyAdd, setShowMyAdd] = useState(false);

  const toggleCategory = (name: string) =>
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });

  const skipSave = useRef(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from API on mount
  useEffect(() => {
    fetch('/api/jo-schedule')
      .then(r => r.json())
      .then((data: { customActivities?: CustomActivity[]; trashedActivities?: TrashedActivity[] } | null) => {
        if (data) {
          if (data.customActivities) setCustomActivities(data.customActivities);
          if (data.trashedActivities) setTrashedActivities(data.trashedActivities);
        }
      })
      .catch(() => {})
      .finally(() => { skipSave.current = false; });
  }, []);

  // Save to API on change (debounced 500ms), skip first render
  useEffect(() => {
    if (skipSave.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      fetch('/api/jo-schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customActivities, trashedActivities }),
      }).catch(() => {});
    }, 500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [customActivities, trashedActivities]);

  const trashedSet = useMemo(
    () => new Set(trashedActivities.map((t) => `${t.categoryName}::${t.activity}`)),
    [trashedActivities]
  );

  const displayedCategories = useMemo(() => {
    return baseCategories
      .map((cat) => {
        const extras: Activity[] = customActivities
          .filter((c) => c.categoryName === cat.name)
          .map((c) => ({ name: c.activity, solo: true, notSolo: true }));
        return {
          ...cat,
          activities: [...cat.activities, ...extras].filter(
            (a) =>
              !trashedSet.has(`${cat.name}::${a.name}`) &&
              matchesFilter(a, filter)
          ),
        };
      })
      .filter((cat) => cat.activities.length > 0);
  }, [customActivities, trashedSet, filter]);

  // My Activities — custom items under the MY_ACTIVITIES_KEY bucket
  const myActivities: Activity[] = useMemo(() => {
    return customActivities
      .filter(
        (c) =>
          c.categoryName === MY_ACTIVITIES_KEY &&
          !trashedSet.has(`${MY_ACTIVITIES_KEY}::${c.activity}`)
      )
      .map((c) => ({ name: c.activity, solo: true, notSolo: true }));
  }, [customActivities, trashedSet]);

  const addMyActivity = () => {
    const name = myNewName.trim();
    if (!name) { setShowMyAdd(false); return; }
    if (myActivities.some((a) => a.name === name)) { setMyNewName(""); setShowMyAdd(false); return; }
    setCustomActivities((prev) => [
      ...prev,
      { categoryName: MY_ACTIVITIES_KEY, activity: name },
    ]);
    setMyNewName("");
    setShowMyAdd(false);
  };

  const isCustom = useCallback(
    (categoryName: string, name: string) =>
      customActivities.some(
        (c) => c.categoryName === categoryName && c.activity === name
      ),
    [customActivities]
  );

  const toggleActivity = useCallback(
    (name: string, categoryName: string, categoryColor: string) => {
      setSelected((prev) => {
        const exists = prev.find((s) => s.activity === name);
        if (exists) return prev.filter((s) => s.activity !== name);
        return [
          ...prev,
          {
            id: `${categoryName}-${name}-${Date.now()}`,
            activity: name,
            category: categoryName,
            categoryColor,
            duration: 30,
          },
        ];
      });
    },
    []
  );

  const isSelected = (name: string) => selected.some((s) => s.activity === name);

  const updateDuration = (id: string, duration: number) =>
    setSelected((prev) => prev.map((s) => (s.id === id ? { ...s, duration } : s)));

  const removeItem = (id: string) =>
    setSelected((prev) => prev.filter((s) => s.id !== id));

  const moveItem = (index: number, dir: -1 | 1) => {
    setSelected((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const clearAll = () => setSelected([]);

  const trashActivity = (categoryName: string, name: string, color: string) => {
    setSelected((prev) => prev.filter((s) => s.activity !== name));
    setCustomActivities((prev) =>
      prev.filter((c) => !(c.categoryName === categoryName && c.activity === name))
    );
    setTrashedActivities((prev) => [...prev, { categoryName, activity: name, color }]);
  };

  const restoreActivity = (item: TrashedActivity) => {
    setTrashedActivities((prev) =>
      prev.filter(
        (t) => !(t.categoryName === item.categoryName && t.activity === item.activity)
      )
    );
    const base = baseCategories.find((c) => c.name === item.categoryName);
    const isBase = base?.activities.some((a) => a.name === item.activity);
    if (!isBase) {
      setCustomActivities((prev) => [
        ...prev,
        { categoryName: item.categoryName, activity: item.activity },
      ]);
    }
  };

  const cancelAdding = () => { setAddingTo(null); setNewActivityName(""); };

  const addActivity = (categoryName: string) => {
    const name = newActivityName.trim();
    if (!name) { cancelAdding(); return; }
    const cat = displayedCategories.find((c) => c.name === categoryName);
    if (cat?.activities.some((a) => a.name === name)) { cancelAdding(); return; }
    setTrashedActivities((prev) =>
      prev.filter((t) => !(t.categoryName === categoryName && t.activity === name))
    );
    const base = baseCategories.find((c) => c.name === categoryName);
    if (!base?.activities.some((a) => a.name === name)) {
      setCustomActivities((prev) => [...prev, { categoryName, activity: name }]);
    }
    cancelAdding();
  };

  let offsetMinutes = 0;
  const scheduleBlocks = selected.map((item) => {
    const start = parseTime(startTime, offsetMinutes);
    offsetMinutes += item.duration;
    const end = parseTime(startTime, offsetMinutes);
    return { ...item, start, end };
  });

  if (showPrint) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="no-print flex gap-3 mb-6">
          <button onClick={() => window.print()} className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700">Print</button>
          <button onClick={() => setShowPrint(false)} className="border border-gray-300 px-4 py-2 rounded font-medium hover:bg-gray-50">Back to Editor</button>
        </div>
        <h1 className="text-2xl font-bold mb-1 text-gray-900">Jo&apos;s Day Schedule</h1>
        <p className="text-gray-500 mb-6 text-sm">Starting at {parseTime(startTime, 0)}</p>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left py-2 pr-4 font-semibold text-gray-700 w-32">Time</th>
              <th className="text-left py-2 pr-4 font-semibold text-gray-700">Activity</th>
              <th className="text-left py-2 font-semibold text-gray-700 w-20">Duration</th>
            </tr>
          </thead>
          <tbody>
            {scheduleBlocks.map((block) => (
              <tr key={block.id} className="border-b border-gray-200">
                <td className="py-2.5 pr-4 text-gray-600 font-mono text-xs whitespace-nowrap">{block.start} – {block.end}</td>
                <td className="py-2.5 pr-4 font-medium text-gray-900">{block.activity}</td>
                <td className="py-2.5 text-gray-500">{block.duration} min</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const filterLabels: Record<FilterMode, string> = {
    all: "All",
    solo: "On my own",
    notSolo: "With someone",
  };

  function renderChips(
    activities: Activity[],
    categoryName: string,
    color: string,
    showEditControls: boolean
  ) {
    return activities.map((activity) => {
      const sel = isSelected(activity.name);
      const custom = isCustom(categoryName, activity.name);
      return (
        <div key={activity.name} className="relative">
          <button
            onClick={() => {
              if (!editMode || !showEditControls)
                toggleActivity(activity.name, categoryName, color);
            }}
            className={`px-3 py-1.5 rounded-full text-sm border font-medium transition-all ${
              editMode && showEditControls
                ? `${color} opacity-75 cursor-default pr-6 ${custom ? "border-dashed" : ""}`
                : sel
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : `${color} hover:opacity-80 border ${custom ? "border-dashed" : ""}`
            }`}
          >
            {activity.name}
            {!(editMode && showEditControls) && sel && <span className="ml-1 text-xs">✓</span>}
          </button>
          {editMode && showEditControls && (
            <button
              onClick={() => trashActivity(categoryName, activity.name, color)}
              title="Send to trash"
              className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full bg-white border border-gray-300 text-gray-400 hover:bg-red-50 hover:border-red-300 hover:text-red-500 text-xs leading-none shadow-sm transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      );
    });
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Jo&apos;s Schedule Builder</h1>
          <div className="flex gap-2">
            {(["all", "solo", "notSolo"] as FilterMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilter(mode)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  filter === mode
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {filterLabels[mode]}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => { setEditMode((m) => !m); cancelAdding(); }}
          className={`text-sm px-3 py-1.5 rounded-lg border font-medium transition-colors ${
            editMode
              ? "bg-gray-900 text-white border-gray-900"
              : "border-gray-300 text-gray-600 hover:bg-gray-50"
          }`}
        >
          {editMode ? "Done editing" : "Edit list"}
        </button>
      </div>

      <p className="text-gray-500 text-sm mb-6">
        {editMode
          ? "Click ✕ on any chip to remove it. Use + Add to add to a category."
          : "Click activities to add them to your schedule. Set durations, then generate."}
      </p>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Activity Picker */}
        <div className="flex-1 min-w-0">

          {/* My Activities — always visible, no edit mode required */}
          <div className="mb-6 p-3 rounded-xl border border-yellow-200 bg-yellow-50">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-yellow-700">
                My Activities
              </h2>
              {!showMyAdd && (
                <button
                  onClick={() => setShowMyAdd(true)}
                  className="text-xs text-yellow-600 hover:text-yellow-800 font-medium border border-yellow-300 rounded-full px-2 py-0.5 hover:bg-yellow-100 transition-colors"
                >
                  + Add mine
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {myActivities.map((activity) => {
                const sel = isSelected(activity.name);
                return (
                  <div key={activity.name} className="relative">
                    <button
                      onClick={() => {
                        if (!editMode)
                          toggleActivity(activity.name, MY_ACTIVITIES_KEY, MY_COLOR);
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm border font-medium transition-all border-dashed ${
                        editMode
                          ? `${MY_COLOR} opacity-75 cursor-default pr-6`
                          : sel
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : `${MY_COLOR} hover:opacity-80`
                      }`}
                    >
                      {activity.name}
                      {!editMode && sel && <span className="ml-1 text-xs">✓</span>}
                    </button>
                    {editMode && (
                      <button
                        onClick={() => trashActivity(MY_ACTIVITIES_KEY, activity.name, MY_COLOR)}
                        title="Remove"
                        className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full bg-white border border-gray-300 text-gray-400 hover:bg-red-50 hover:border-red-300 hover:text-red-500 text-xs leading-none shadow-sm transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}

              {showMyAdd && (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    value={myNewName}
                    onChange={(e) => setMyNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addMyActivity();
                      if (e.key === "Escape") { setShowMyAdd(false); setMyNewName(""); }
                    }}
                    placeholder="What do you want to do?"
                    className="border border-yellow-300 rounded-full px-3 py-1 text-sm w-48 focus:outline-none focus:border-yellow-500 bg-white"
                  />
                  <button onClick={addMyActivity} className="text-green-600 hover:text-green-800 text-sm font-bold">✓</button>
                  <button onClick={() => { setShowMyAdd(false); setMyNewName(""); }} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
                </div>
              )}

              {myActivities.length === 0 && !showMyAdd && (
                <p className="text-yellow-500 text-xs italic">Add your own activities here — they&apos;re saved for next time.</p>
              )}
            </div>
          </div>

          {/* Base categories with subcategory labels */}
          {displayedCategories.map((cat) => {
            const groups = groupBySub(cat.activities);
            const hasSubs = groups.size > 1 || (groups.size === 1 && !groups.has(""));
            const isOpen = openCategories.has(cat.name);
            const selectedCount = cat.activities.filter((a) => isSelected(a.name)).length;

            return (
              <div key={cat.name} className="mb-2">
                <button
                  onClick={() => toggleCategory(cat.name)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                      {cat.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {cat.activities.length}
                    </span>
                    {selectedCount > 0 && (
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${cat.color}`}>
                        {selectedCount} added
                      </span>
                    )}
                  </div>
                  <span className="text-gray-400 text-xs transition-transform">
                    {isOpen ? "▲" : "▼"}
                  </span>
                </button>

                {isOpen && (
                  <div className="px-3 pb-3 pt-1">
                    {hasSubs ? (
                      <div className="space-y-3">
                        {Array.from(groups.entries()).map(([sub, acts]) => (
                          <div key={sub}>
                            {sub && (
                              <p className="text-xs text-gray-400 font-medium mb-1.5 ml-0.5">
                                {sub}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-2">
                              {renderChips(acts, cat.name, cat.color, true)}
                            </div>
                          </div>
                        ))}
                        {editMode && (
                          addingTo === cat.name ? (
                            <div className="flex items-center gap-1 mt-1">
                              <input autoFocus value={newActivityName} onChange={(e) => setNewActivityName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addActivity(cat.name); if (e.key === "Escape") cancelAdding(); }} placeholder="Activity name…" className="border border-gray-300 rounded-full px-3 py-1 text-sm w-40 focus:outline-none focus:border-blue-400" />
                              <button onClick={() => addActivity(cat.name)} className="text-green-600 hover:text-green-800 text-sm font-bold">✓</button>
                              <button onClick={cancelAdding} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
                            </div>
                          ) : (
                            <button onClick={() => setAddingTo(cat.name)} className="px-3 py-1.5 rounded-full text-sm border border-dashed border-gray-300 text-gray-400 hover:border-gray-500 hover:text-gray-600 transition-colors">
                              + Add
                            </button>
                          )
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {renderChips(cat.activities, cat.name, cat.color, true)}
                        {editMode && (
                          addingTo === cat.name ? (
                            <div className="flex items-center gap-1">
                              <input autoFocus value={newActivityName} onChange={(e) => setNewActivityName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addActivity(cat.name); if (e.key === "Escape") cancelAdding(); }} placeholder="Activity name…" className="border border-gray-300 rounded-full px-3 py-1 text-sm w-40 focus:outline-none focus:border-blue-400" />
                              <button onClick={() => addActivity(cat.name)} className="text-green-600 hover:text-green-800 text-sm font-bold">✓</button>
                              <button onClick={cancelAdding} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
                            </div>
                          ) : (
                            <button onClick={() => setAddingTo(cat.name)} className="px-3 py-1.5 rounded-full text-sm border border-dashed border-gray-300 text-gray-400 hover:border-gray-500 hover:text-gray-600 transition-colors">
                              + Add
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Trash */}
          {trashedActivities.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button onClick={() => setShowTrash((t) => !t)} className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 font-medium">
                <span>Trash</span>
                <span className="bg-gray-100 text-gray-500 text-xs rounded-full px-1.5 py-0.5">{trashedActivities.length}</span>
                <span className="text-xs">{showTrash ? "▲" : "▼"}</span>
              </button>
              {showTrash && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {trashedActivities.map((item, i) => (
                    <div key={`${item.categoryName}-${item.activity}-${i}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border border-gray-200 bg-gray-50">
                      <span className="text-gray-400 line-through">{item.activity}</span>
                      <span className="text-gray-300 text-xs">· {item.categoryName}</span>
                      <button onClick={() => restoreActivity(item)} title="Restore" className="text-green-500 hover:text-green-700 font-bold text-sm ml-0.5">↩</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Schedule Builder Panel */}
        <div className="lg:w-80 xl:w-96 shrink-0">
          <div className="sticky top-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900">Schedule</h2>
                {selected.length > 0 && (
                  <button onClick={clearAll} className="text-xs text-red-500 hover:text-red-700">Clear all</button>
                )}
              </div>

              <div className="mb-3">
                <label className="text-xs text-gray-500 block mb-1">Start time</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full" />
              </div>

              {selected.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">
                  No activities selected yet.<br />Click chips on the left to add.
                </p>
              ) : (
                <div className="space-y-2 mb-4">
                  {selected.map((item, i) => (
                    <div key={item.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1.5 border border-gray-100">
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => moveItem(i, -1)} disabled={i === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-20 leading-none text-xs">▲</button>
                        <button onClick={() => moveItem(i, 1)} disabled={i === selected.length - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-20 leading-none text-xs">▼</button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.activity}</p>
                        <p className="text-xs text-gray-400 truncate">{item.category}</p>
                      </div>
                      <input type="number" min={5} max={240} step={5} value={item.duration} onChange={(e) => updateDuration(item.id, parseInt(e.target.value) || 30)} className="w-14 border border-gray-300 rounded px-1 py-0.5 text-xs text-center" />
                      <span className="text-xs text-gray-400">min</span>
                      <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500 text-xs ml-1">✕</button>
                    </div>
                  ))}
                </div>
              )}

              {selected.length > 0 && (
                <div className="border-t border-gray-100 pt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-3">
                    <span>{selected.length} activities</span>
                    <span>{selected.reduce((a, s) => a + s.duration, 0)} min total</span>
                  </div>
                  <button onClick={() => setShowPrint(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium transition-colors">
                    Generate Schedule →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
