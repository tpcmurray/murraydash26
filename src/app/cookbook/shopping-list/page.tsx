'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type ShoppingItem = {
  key: string;
  name: string;
  amount: number;
  unit: string;
  category: string;
  meals: string[];
};

const categoryLabels: Record<string, string> = {
  produce: 'Produce',
  bread: 'Bread',
  meat_fish: 'Meat / Fish',
  dairy: 'Dairy',
  frozen: 'Frozen',
  isle: 'Isle',
  pantry: 'Pantry',
};

const categoryOrder = ['produce', 'bread', 'meat_fish', 'dairy', 'frozen', 'isle', 'pantry'];

const LIST_CACHE_KEY = 'shopping-list-cache';
const checksCacheKeyFor = (weekStart: string) => `shopping-list-checked-${weekStart}`;

export default function CookbookShoppingListPage() {
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    // Hydrate from cache first for fast paint
    try {
      const cachedRaw = localStorage.getItem(LIST_CACHE_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        if (cached?.shoppingList) {
          setShoppingList(cached.shoppingList);
          setDateRange(cached.dateRange || null);
          if (cached.dateRange) {
            const checksRaw = localStorage.getItem(checksCacheKeyFor(cached.dateRange.start));
            if (checksRaw) setChecked(new Set(JSON.parse(checksRaw)));
          }
          setLoading(false);
        }
      }
    } catch {}

    // Refresh shopping list and checks from server
    fetch('/api/admin/shopping-list')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('fetch failed'))))
      .then(async (data) => {
        setShoppingList(data.shoppingList || []);
        const newRange = data.dateRange || null;
        setDateRange(newRange);
        try {
          localStorage.setItem(LIST_CACHE_KEY, JSON.stringify(data));
        } catch {}

        if (newRange) {
          try {
            const checksRes = await fetch(`/api/admin/shopping-list-checks?weekStart=${newRange.start}`);
            if (checksRes.ok) {
              const checksList: string[] = await checksRes.json();
              setChecked(new Set(checksList));
              try {
                localStorage.setItem(checksCacheKeyFor(newRange.start), JSON.stringify(checksList));
              } catch {}
            }
          } catch {}
        }
        setOffline(false);
      })
      .catch(() => setOffline(true))
      .finally(() => setLoading(false));
  }, []);

  const groupedItems = shoppingList.reduce((acc, item) => {
    const cat = item.category || 'pantry';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const rangeLabel = dateRange
    ? `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`
    : '';

  const toggleCheck = async (key: string) => {
    if (!dateRange) return;
    const willBeChecked = !checked.has(key);

    // Optimistic UI + cache update
    setChecked((prev) => {
      const next = new Set(prev);
      if (willBeChecked) next.add(key);
      else next.delete(key);
      try {
        localStorage.setItem(checksCacheKeyFor(dateRange.start), JSON.stringify([...next]));
      } catch {}
      return next;
    });

    // Server sync (best effort)
    try {
      await fetch('/api/admin/shopping-list-checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart: dateRange.start, itemKey: key, checked: willBeChecked }),
      });
    } catch {}
  };

  const clearChecked = async () => {
    if (!dateRange) return;
    setChecked(new Set());
    try {
      localStorage.setItem(checksCacheKeyFor(dateRange.start), JSON.stringify([]));
    } catch {}
    try {
      await fetch(`/api/admin/shopping-list-checks?weekStart=${dateRange.start}`, { method: 'DELETE' });
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-3xl mx-auto p-4 pb-12">
        <div className="flex items-center gap-2 mb-4 text-sm text-gray-400">
          <Link href="/cookbook" className="hover:text-white">&larr; Cookbook</Link>
        </div>

        <div className="flex justify-between items-start mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold">Shopping List</h1>
            {rangeLabel && (
              <p className="text-sm text-gray-400 mt-1">
                {rangeLabel}
                {offline && <span className="ml-2 text-amber-400">(offline — cached)</span>}
              </p>
            )}
          </div>
          {checked.size > 0 && (
            <button
              onClick={clearChecked}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm flex-shrink-0"
            >
              Clear ({checked.size})
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : shoppingList.length === 0 ? (
          <p className="text-gray-400">No meals assigned to this week&apos;s cycle days.</p>
        ) : (
          <div className="space-y-4">
            {categoryOrder.map((cat) => {
              const items = groupedItems[cat];
              if (!items || items.length === 0) return null;

              return (
                <div key={cat} className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3">
                    {categoryLabels[cat] || cat}
                  </h3>
                  <ul className="space-y-2">
                    {items.map((item) => {
                      const isChecked = checked.has(item.key);
                      return (
                        <li
                          key={item.key}
                          className={`flex items-center gap-3 cursor-pointer select-none py-1 ${isChecked ? 'opacity-40' : ''}`}
                          onClick={() => toggleCheck(item.key)}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCheck(item.key)}
                            className="w-5 h-5 flex-shrink-0 accent-green-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className={`flex flex-wrap items-baseline gap-x-2 ${isChecked ? 'line-through' : ''}`}>
                            <span>{item.name}</span>
                            <span className="text-gray-400 text-sm">
                              {item.amount % 1 === 0 ? item.amount : item.amount.toFixed(2)} {item.unit}
                            </span>
                            {item.meals?.length > 0 && (
                              <span className="text-gray-500 text-xs">
                                ({item.meals.join(', ')})
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
