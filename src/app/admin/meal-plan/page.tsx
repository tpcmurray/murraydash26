'use client';

import { useEffect, useState } from 'react';
import { DataGrid, type Column } from '@/components/admin/DataGrid';

type MealPlanEntry = {
  id: string;
  date: string;
  mealSlot: string;
  mealId: string;
  overrideNotes: string | null;
  overrideExpiresAt: string | null;
  mealName: string;
  createdAt: string;
  updatedAt: string;
};

type Meal = {
  id: string;
  name: string;
};

const mealSlotOptions = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
];

export default function MealPlanPage() {
  const [entries, setEntries] = useState<MealPlanEntry[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [overrideText, setOverrideText] = useState('');
  const [overrideSaving, setOverrideSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [entriesRes, mealsRes] = await Promise.all([
        fetch('/api/admin/meal-plan'),
        fetch('/api/admin/meals'),
      ]);

      if (entriesRes.ok) {
        const data = await entriesRes.json();
        setEntries(data);
      }
      if (mealsRes.ok) {
        const data = await mealsRes.json();
        setMeals(data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Find today's dinner entry
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayDinner = entries.find(e => e.date === todayStr && e.mealSlot === 'dinner');
  const hasActiveOverride = todayDinner?.overrideNotes != null;

  const handleSetOverride = async () => {
    if (!overrideText.trim()) return;
    setOverrideSaving(true);
    try {
      const response = await fetch('/api/admin/meal-plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setTonightOverride', overrideText: overrideText.trim() }),
      });
      if (response.ok) {
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
      const response = await fetch('/api/admin/meal-plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clearTonightOverride' }),
      });
      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Error clearing override:', error);
    } finally {
      setOverrideSaving(false);
    }
  };

  const mealOptions = meals.map(m => ({ value: m.id, label: m.name }));

  const columns: Column<MealPlanEntry>[] = [
    { key: 'date', header: 'Date', width: '120px', editable: true },
    {
      key: 'mealSlot',
      header: 'Meal Slot',
      width: '120px',
      editable: true,
      type: 'select',
      options: mealSlotOptions,
    },
    {
      key: 'mealId',
      header: 'Meal',
      width: '180px',
      render: (row) => row.mealName || '',
    },
  ];

  const handleSave = async (row: MealPlanEntry) => {
    const response = await fetch('/api/admin/meal-plan', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: row.id,
        date: row.date,
        mealSlot: row.mealSlot,
        mealId: row.mealId,
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to update meal plan entry');
    }
    await fetchData();
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/admin/meal-plan?id=${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete meal plan entry');
    }
    await fetchData();
  };

  const handleAdd = async (row: Partial<MealPlanEntry & { duration?: string }>) => {
    const { duration, ...entryData } = row as MealPlanEntry & { duration?: string };
    const response = await fetch('/api/admin/meal-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...entryData,
        duration: duration || '1',
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to create meal plan entry');
    }
    await fetchData();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Meal Plan</h2>

      {/* Tonight's Dinner Override */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold mb-3">Tonight&apos;s Dinner Override</h3>
        {!todayDinner ? (
          <p className="text-sm text-gray-400">No dinner planned for today.</p>
        ) : hasActiveOverride ? (
          <div className="flex items-center gap-4">
            <div>
              <span className="text-sm text-gray-400">Planned: </span>
              <span className="text-sm line-through text-gray-500">{todayDinner.mealName}</span>
            </div>
            <div>
              <span className="text-sm text-gray-400">Override: </span>
              <span className="text-sm text-yellow-400 font-medium">{todayDinner.overrideNotes}</span>
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
            <div className="text-sm text-gray-400 mb-2">
              Planned: <span className="text-gray-200">{todayDinner.mealName}</span>
            </div>
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

      <DataGrid
        data={entries}
        columns={columns}
        idField="id"
        onSave={handleSave}
        onDelete={handleDelete}
        onAdd={handleAdd}
        loading={loading}
      />
    </div>
  );
}
