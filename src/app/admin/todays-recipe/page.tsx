'use client';

import { useEffect, useState } from 'react';
import RecipeView, { type RecipeViewData } from '@/components/admin/RecipeView';

type CycleEntry = {
  cycleDay: number;
  recipeId: string;
};

export default function TodaysRecipePage() {
  const [recipe, setRecipe] = useState<RecipeViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [noMeal, setNoMeal] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [recipesRes, cycleRes, settingsRes] = await Promise.all([
          fetch('/api/admin/recipes'),
          fetch('/api/admin/meal-cycle'),
          fetch('/api/admin/settings'),
        ]);

        const recipes: RecipeViewData[] = await recipesRes.json();
        const cycleEntries: CycleEntry[] = await cycleRes.json();
        const settings: Record<string, string> = await settingsRes.json();

        const cycleLength = parseInt(settings['cycle_length'] || '14');
        const startStr = settings['cycle_start_date'] || '2026-04-19';
        const [sy, sm, sd] = startStr.split('-').map(Number);
        const cycleStart = new Date(sy, sm - 1, sd);

        const now = new Date();
        const diffDays = Math.floor(
          (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
            Date.UTC(cycleStart.getFullYear(), cycleStart.getMonth(), cycleStart.getDate())) /
            (1000 * 60 * 60 * 24)
        );
        const todayCycleDay = ((diffDays % cycleLength) + cycleLength) % cycleLength + 1;

        const entry = cycleEntries.find((e) => e.cycleDay === todayCycleDay);
        if (!entry) { setNoMeal(true); return; }

        const found = recipes.find((r) => r.id === entry.recipeId);
        if (!found) { setNoMeal(true); return; }

        setRecipe(found);
      } catch (error) {
        console.error('Error loading recipe:', error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <p className="text-gray-400">Loading...</p>;
  if (noMeal || !recipe) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-4">Today&apos;s Recipe</h2>
        <p className="text-gray-400">No meal assigned for today.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Today&apos;s Recipe</h2>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
        >
          Print
        </button>
      </div>
      <RecipeView recipe={recipe} />
    </div>
  );
}
