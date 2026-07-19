"use client";

import { useState, useCallback } from "react";
import { categories } from "./data";

type ScheduleItem = {
  id: string;
  activity: string;
  category: string;
  categoryColor: string;
  duration: number;
};

function parseTime(startTime: string, offsetMinutes: number): string {
  const [hStr, mStr] = startTime.split(":");
  const totalMinutes = parseInt(hStr) * 60 + parseInt(mStr) + offsetMinutes;
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  const ampm = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export default function JoScheduleClient() {
  const [selected, setSelected] = useState<ScheduleItem[]>([]);
  const [startTime, setStartTime] = useState("08:00");
  const [showPrint, setShowPrint] = useState(false);

  const toggleActivity = useCallback(
    (activity: string, categoryName: string, categoryColor: string) => {
      setSelected((prev) => {
        const exists = prev.find((s) => s.activity === activity);
        if (exists) {
          return prev.filter((s) => s.activity !== activity);
        }
        return [
          ...prev,
          {
            id: `${categoryName}-${activity}-${Date.now()}`,
            activity,
            category: categoryName,
            categoryColor,
            duration: 30,
          },
        ];
      });
    },
    []
  );

  const isSelected = (activity: string) =>
    selected.some((s) => s.activity === activity);

  const updateDuration = (id: string, duration: number) => {
    setSelected((prev) =>
      prev.map((s) => (s.id === id ? { ...s, duration } : s))
    );
  };

  const removeItem = (id: string) => {
    setSelected((prev) => prev.filter((s) => s.id !== id));
  };

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
          <button
            onClick={() => window.print()}
            className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700"
          >
            Print
          </button>
          <button
            onClick={() => setShowPrint(false)}
            className="border border-gray-300 px-4 py-2 rounded font-medium hover:bg-gray-50"
          >
            Back to Editor
          </button>
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
                <td className="py-2.5 pr-4 text-gray-600 font-mono text-xs whitespace-nowrap">
                  {block.start} – {block.end}
                </td>
                <td className="py-2.5 pr-4 font-medium text-gray-900">{block.activity}</td>
                <td className="py-2.5 text-gray-500">{block.duration} min</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Jo&apos;s Schedule Builder</h1>
      <p className="text-gray-500 text-sm mb-6">
        Click activities to add them to the schedule. Reorder, set durations, then generate.
      </p>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Activity Picker */}
        <div className="flex-1 min-w-0">
          {categories.map((cat) => (
            <div key={cat.name} className="mb-5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                {cat.name}
              </h2>
              <div className="flex flex-wrap gap-2">
                {cat.activities.map((activity) => {
                  const sel = isSelected(activity);
                  return (
                    <button
                      key={activity}
                      onClick={() => toggleActivity(activity, cat.name, cat.color)}
                      className={`px-3 py-1.5 rounded-full text-sm border font-medium transition-all ${
                        sel
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : `${cat.color} hover:opacity-80 border`
                      }`}
                    >
                      {activity}
                      {sel && <span className="ml-1">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Schedule Builder Panel */}
        <div className="lg:w-80 xl:w-96 shrink-0">
          <div className="sticky top-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900">Schedule</h2>
                {selected.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="mb-3">
                <label className="text-xs text-gray-500 block mb-1">Start time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full"
                />
              </div>

              {selected.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">
                  No activities selected yet.
                  <br />
                  Click chips on the left to add.
                </p>
              ) : (
                <div className="space-y-2 mb-4">
                  {selected.map((item, i) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1.5 border border-gray-100"
                    >
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => moveItem(i, -1)}
                          disabled={i === 0}
                          className="text-gray-400 hover:text-gray-700 disabled:opacity-20 leading-none text-xs"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => moveItem(i, 1)}
                          disabled={i === selected.length - 1}
                          className="text-gray-400 hover:text-gray-700 disabled:opacity-20 leading-none text-xs"
                        >
                          ▼
                        </button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.activity}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{item.category}</p>
                      </div>
                      <input
                        type="number"
                        min={5}
                        max={240}
                        step={5}
                        value={item.duration}
                        onChange={(e) =>
                          updateDuration(item.id, parseInt(e.target.value) || 30)
                        }
                        className="w-14 border border-gray-300 rounded px-1 py-0.5 text-xs text-center"
                      />
                      <span className="text-xs text-gray-400">min</span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-gray-300 hover:text-red-500 text-xs ml-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {selected.length > 0 && (
                <div className="border-t border-gray-100 pt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-3">
                    <span>{selected.length} activities</span>
                    <span>
                      {selected.reduce((a, s) => a + s.duration, 0)} min total
                    </span>
                  </div>
                  <button
                    onClick={() => setShowPrint(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium transition-colors"
                  >
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
