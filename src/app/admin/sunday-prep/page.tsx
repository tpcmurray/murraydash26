'use client';

import { useEffect, useState } from 'react';

type Recipe = {
  id: string;
  title: string;
  sundayPrep: string | null;
  ingredients: string;
};

type CycleEntry = {
  cycleDay: number;
  recipeId: string;
  recipeTitle: string;
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SundayPrepPage() {
  const [prepItems, setPrepItems] = useState<{ dayLabel: string; cycleDay: number; title: string; sundayPrep: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [recipesRes, cycleRes, settingsRes] = await Promise.all([
          fetch('/api/admin/recipes'),
          fetch('/api/admin/meal-cycle'),
          fetch('/api/admin/settings'),
        ]);

        const recipes: Recipe[] = await recipesRes.json();
        const cycleEntries: CycleEntry[] = await cycleRes.json();
        const settings: Record<string, string> = await settingsRes.json();

        const cycleLength = parseInt(settings['cycle_length'] || '14');
        const startStr = settings['cycle_start_date'] || '2026-04-19';
        const [sy, sm, sd] = startStr.split('-').map(Number);
        const cycleStart = new Date(sy, sm - 1, sd);

        const recipeMap = new Map(recipes.map((r) => [r.id, r]));

        // Figure out which 7 cycle days correspond to this upcoming Sunday-Saturday
        const now = new Date();
        const dayOfWeek = now.getDay();
        const sundayOffset = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
        const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + sundayOffset);

        const items: typeof prepItems = [];

        for (let i = 0; i < 7; i++) {
          const date = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i);
          const diffDays = Math.floor(
            (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
              Date.UTC(cycleStart.getFullYear(), cycleStart.getMonth(), cycleStart.getDate())) /
              (1000 * 60 * 60 * 24)
          );
          const cycleDay = ((diffDays % cycleLength) + cycleLength) % cycleLength + 1;
          const entry = cycleEntries.find((e) => e.cycleDay === cycleDay);
          if (!entry) continue;

          const recipe = recipeMap.get(entry.recipeId);
          if (!recipe?.sundayPrep) continue;

          items.push({
            dayLabel: DAY_NAMES[date.getDay()],
            cycleDay,
            title: recipe.title,
            sundayPrep: recipe.sundayPrep,
          });
        }

        setPrepItems(items);
      } catch (error) {
        console.error('Error loading sunday prep:', error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <p className="text-gray-400">Loading...</p>;

  return (
    <div className="max-w-3xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Sunday Prep</h2>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
        >
          Print
        </button>
      </div>

      {prepItems.length === 0 ? (
        <p className="text-gray-400">No prep steps for this week&apos;s meals.</p>
      ) : (
        <div className="space-y-4 print:space-y-3">
          {prepItems.map((item) => (
            <div
              key={item.cycleDay}
              className="bg-gray-800 rounded-lg p-4 border border-gray-700 print:bg-white print:border-gray-300"
            >
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-xs font-bold text-gray-500 print:text-gray-400">{item.dayLabel}</span>
                <h3 className="text-lg font-semibold print:text-black">{item.title}</h3>
              </div>
              <p className="text-gray-300 whitespace-pre-line print:text-black">{item.sundayPrep}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
