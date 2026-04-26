'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import RecipeView, { type RecipeViewData } from '@/components/admin/RecipeView';
import { getCycleDay, parseLocalDate } from '@/lib/cycle';

type CycleEntry = {
  cycleDay: number;
  recipeId: string;
};

export default function CookbookPage() {
  const [recipes, setRecipes] = useState<RecipeViewData[]>([]);
  const [todayRecipe, setTodayRecipe] = useState<RecipeViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<RecipeViewData | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [recipesRes, cycleRes, settingsRes] = await Promise.all([
          fetch('/api/admin/recipes'),
          fetch('/api/admin/meal-cycle'),
          fetch('/api/admin/settings'),
        ]);

        const recipeList: RecipeViewData[] = await recipesRes.json();
        const cycleEntries: CycleEntry[] = await cycleRes.json();
        const settings: Record<string, string> = await settingsRes.json();

        setRecipes(recipeList);

        const cycleLength = parseInt(settings['cycle_length'] || '14');
        const cycleStart = parseLocalDate(settings['cycle_start_date'] || '2026-04-19');
        const todayCycleDay = getCycleDay(new Date(), cycleStart, cycleLength);

        const entry = cycleEntries.find((e) => e.cycleDay === todayCycleDay);
        if (entry) {
          const found = recipeList.find((r) => r.id === entry.recipeId);
          if (found) setTodayRecipe(found);
        }
      } catch (error) {
        console.error('Error loading cookbook:', error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-3xl mx-auto p-4 pb-12">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Cookbook</h1>
          <Link
            href="/cookbook/shopping-list"
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-medium"
          >
            Shopping List
          </Link>
        </div>

        {/* Today's Recipe */}
        {todayRecipe ? (
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Tonight&apos;s Dinner
            </h2>
            <div className="bg-gray-800 rounded-lg p-4">
              <RecipeView recipe={todayRecipe} />
            </div>
          </section>
        ) : (
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Tonight&apos;s Dinner
            </h2>
            <div className="bg-gray-800 rounded-lg p-4 text-gray-400">
              No meal assigned for today.
            </div>
          </section>
        )}

        {/* All Recipes */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            All Recipes
          </h2>
          {recipes.length === 0 ? (
            <p className="text-gray-400">No recipes yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {recipes.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() => setViewing(recipe)}
                  className="bg-gray-800 hover:bg-gray-700 rounded-lg overflow-hidden text-left flex flex-col"
                >
                  {recipe.hasImage ? (
                    <img
                      src={`/api/admin/recipes/${recipe.id}/image`}
                      alt={recipe.title}
                      className="w-full aspect-square object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-gray-700 flex items-center justify-center text-gray-500 text-xs">
                      No image
                    </div>
                  )}
                  <div className="p-2 font-medium text-sm">{recipe.title}</div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Recipe Modal */}
      {viewing && (
        <div
          className="fixed inset-0 bg-black/80 flex items-start justify-center z-50 overflow-y-auto"
          onClick={() => setViewing(null)}
        >
          <div
            className="bg-gray-800 rounded-lg p-4 w-full max-w-3xl m-4 mb-12"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-gray-800 pb-2 border-b border-gray-700">
              <h2 className="text-xl font-bold">{viewing.title}</h2>
              <button
                onClick={() => setViewing(null)}
                className="text-gray-400 hover:text-white text-3xl leading-none px-2"
              >
                &times;
              </button>
            </div>
            <RecipeView recipe={viewing} />
          </div>
        </div>
      )}
    </div>
  );
}
