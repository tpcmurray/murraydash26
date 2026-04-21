'use client';

import { useEffect, useState } from 'react';

type Recipe = {
  id: string;
  title: string;
};

type CycleEntry = {
  id: string;
  cycleDay: number;
  recipeId: string;
  recipeTitle: string;
};

type Override = {
  id: string;
  overrideNotes: string;
  expiresAt: string;
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function MealCyclePage() {
  const [cycleEntries, setCycleEntries] = useState<CycleEntry[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [override, setOverride] = useState<Override | null>(null);
  const [loading, setLoading] = useState(true);
  const [overrideText, setOverrideText] = useState('');
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);

  const cycleLength = parseInt(settings['cycle_length'] || '14');
  const cycleStartDate = settings['cycle_start_date'] || '2026-04-19';

  const fetchData = async () => {
    try {
      const [cycleRes, recipesRes, settingsRes, overrideRes] = await Promise.all([
        fetch('/api/admin/meal-cycle'),
        fetch('/api/admin/recipes'),
        fetch('/api/admin/settings'),
        fetch('/api/admin/dinner-override'),
      ]);

      if (cycleRes.ok) setCycleEntries(await cycleRes.json());
      if (recipesRes.ok) setRecipes(await recipesRes.json());
      if (settingsRes.ok) setSettings(await settingsRes.json());
      if (overrideRes.ok) {
        const data = await overrideRes.json();
        setOverride(data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Get the day-of-week label for each cycle day
  const getDayLabel = (cycleDay: number): string => {
    const start = new Date(cycleStartDate + 'T12:00:00');
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + (cycleDay - 1));
    return DAY_NAMES[d.getDay()];
  };

  // Get today's planned meal name from cycle
  const getTodayMeal = (): string | null => {
    const today = new Date();
    const start = new Date(cycleStartDate + 'T12:00:00');
    const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const todayCycleDay = ((diffDays % cycleLength) + cycleLength) % cycleLength + 1;
    const entry = cycleEntries.find((e) => e.cycleDay === todayCycleDay);
    return entry?.recipeTitle || null;
  };

  const handleAssign = async (cycleDay: number, recipeId: string) => {
    setSaving(cycleDay);
    try {
      const existing = cycleEntries.find((e) => e.cycleDay === cycleDay);

      if (!recipeId) {
        // Clear assignment
        if (existing) {
          await fetch(`/api/admin/meal-cycle?id=${existing.id}`, { method: 'DELETE' });
        }
      } else if (existing) {
        // Update
        await fetch('/api/admin/meal-cycle', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: existing.id, cycleDay, recipeId }),
        });
      } else {
        // Create
        await fetch('/api/admin/meal-cycle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cycleDay, recipeId }),
        });
      }

      await fetchData();
    } catch (error) {
      console.error('Error updating cycle:', error);
    } finally {
      setSaving(null);
    }
  };

  const handleSetOverride = async () => {
    if (!overrideText.trim()) return;
    setOverrideSaving(true);
    try {
      const res = await fetch('/api/admin/dinner-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrideNotes: overrideText.trim() }),
      });
      if (res.ok) {
        setOverrideText('');
        await fetchData();
      }
    } catch (error) {
      console.error('Error setting override:', error);
    } finally {
      setOverrideSaving(false);
    }
  };

  const handleClearOverride = async () => {
    setOverrideSaving(true);
    try {
      await fetch('/api/admin/dinner-override', { method: 'DELETE' });
      await fetchData();
    } catch (error) {
      console.error('Error clearing override:', error);
    } finally {
      setOverrideSaving(false);
    }
  };

  if (loading) return <p className="text-gray-400">Loading...</p>;

  const todayMeal = getTodayMeal();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Meal Cycle</h2>

      {/* Tonight's Dinner Override */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold mb-3">Tonight&apos;s Dinner Override</h3>
        {override ? (
          <div className="flex items-center gap-4">
            {todayMeal && (
              <div>
                <span className="text-sm text-gray-400">Planned: </span>
                <span className="text-sm line-through text-gray-500">{todayMeal}</span>
              </div>
            )}
            <div>
              <span className="text-sm text-gray-400">Override: </span>
              <span className="text-sm text-yellow-400 font-medium">{override.overrideNotes}</span>
            </div>
            <span className="text-xs text-gray-500">(clears at midnight)</span>
            <button
              onClick={handleClearOverride}
              disabled={overrideSaving}
              className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 rounded disabled:opacity-50"
            >
              {overrideSaving ? '...' : 'Clear Override'}
            </button>
          </div>
        ) : (
          <div>
            {todayMeal && (
              <div className="text-sm text-gray-400 mb-2">
                Planned: <span className="text-gray-200">{todayMeal}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={overrideText}
                onChange={(e) => setOverrideText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSetOverride()}
                placeholder="e.g., Pulled Pork Sandwiches for 12"
                className="flex-1 max-w-md px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
              />
              <button
                onClick={handleSetOverride}
                disabled={overrideSaving || !overrideText.trim()}
                className="px-4 py-2 text-sm bg-yellow-600 hover:bg-yellow-500 rounded disabled:opacity-50"
              >
                {overrideSaving ? '...' : 'Set Override'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Override clears automatically at midnight.</p>
          </div>
        )}
      </div>

      {/* Cycle Grid */}
      <div className="space-y-2">
        {Array.from({ length: cycleLength }, (_, i) => i + 1).map((cycleDay) => {
          const entry = cycleEntries.find((e) => e.cycleDay === cycleDay);
          const dayLabel = getDayLabel(cycleDay);
          const isSaving = saving === cycleDay;

          return (
            <div
              key={cycleDay}
              className={`flex items-center gap-4 p-3 rounded border ${
                dayLabel === 'Sun' ? 'bg-gray-750 border-gray-600' : 'bg-gray-800 border-gray-700'
              }`}
            >
              <div className="w-20 flex-shrink-0">
                <span className="text-sm font-bold text-gray-400">Day {cycleDay}</span>
              </div>
              <div className="w-12 flex-shrink-0">
                <span className={`text-sm font-medium ${dayLabel === 'Sun' ? 'text-yellow-400' : 'text-gray-500'}`}>
                  {dayLabel}
                </span>
              </div>
              <select
                value={entry?.recipeId || ''}
                onChange={(e) => handleAssign(cycleDay, e.target.value)}
                disabled={isSaving}
                className="flex-1 max-w-md px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm disabled:opacity-50"
              >
                <option value="">-- No meal --</option>
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
              {isSaving && <span className="text-xs text-gray-400">Saving...</span>}
            </div>
          );
        })}
      </div>

      {/* Cycle Settings */}
      <div className="mt-8 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold mb-3">Cycle Settings</h3>
        <div className="flex gap-6">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Start Date</label>
            <input
              type="date"
              value={cycleStartDate}
              onChange={async (e) => {
                await fetch('/api/admin/settings', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ key: 'cycle_start_date', value: e.target.value }),
                });
                fetchData();
              }}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Cycle Length (days)</label>
            <input
              type="number"
              min={7}
              max={28}
              value={cycleLength}
              onChange={async (e) => {
                await fetch('/api/admin/settings', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ key: 'cycle_length', value: e.target.value }),
                });
                fetchData();
              }}
              className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
