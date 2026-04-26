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
  isCustom?: boolean;
  customId?: string;
};

type CustomItem = {
  id: string;
  weekStart: string;
  name: string;
  category: string;
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
  const [mealItems, setMealItems] = useState<ShoppingItem[]>([]);
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [offline, setOffline] = useState(false);
  const [addName, setAddName] = useState('');
  const [addCategory, setAddCategory] = useState('isle');
  const [adding, setAdding] = useState(false);

  const customAsItems: ShoppingItem[] = customItems.map((c) => ({
    key: `custom-${c.id}`,
    name: c.name,
    amount: 0,
    unit: '',
    category: c.category,
    meals: [],
    isCustom: true,
    customId: c.id,
  }));

  const shoppingList = [...mealItems, ...customAsItems];

  useEffect(() => {
    // Hydrate from cache
    try {
      const cachedRaw = localStorage.getItem(LIST_CACHE_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        if (cached?.shoppingList) {
          setMealItems(cached.shoppingList);
          setDateRange(cached.dateRange || null);
          if (cached.dateRange) {
            const checksRaw = localStorage.getItem(checksCacheKeyFor(cached.dateRange.start));
            if (checksRaw) setChecked(new Set(JSON.parse(checksRaw)));
          }
          setLoading(false);
        }
      }
    } catch {}

    // Refresh meal items
    fetch('/api/admin/shopping-list')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('fetch failed'))))
      .then(async (data) => {
        setMealItems(data.shoppingList || []);
        const newRange = data.dateRange || null;
        setDateRange(newRange);
        try {
          localStorage.setItem(LIST_CACHE_KEY, JSON.stringify(data));
        } catch {}

        if (newRange) {
          const [checksRes, customRes] = await Promise.all([
            fetch(`/api/admin/shopping-list-checks?weekStart=${newRange.start}`).catch(() => null),
            fetch(`/api/admin/shopping-list-custom?weekStart=${newRange.start}`).catch(() => null),
          ]);

          if (checksRes?.ok) {
            const checksList: string[] = await checksRes.json();
            setChecked(new Set(checksList));
            try {
              localStorage.setItem(checksCacheKeyFor(newRange.start), JSON.stringify(checksList));
            } catch {}
          }
          if (customRes?.ok) {
            const list: CustomItem[] = await customRes.json();
            setCustomItems(list);
          }
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
    setChecked((prev) => {
      const next = new Set(prev);
      if (willBeChecked) next.add(key);
      else next.delete(key);
      try {
        localStorage.setItem(checksCacheKeyFor(dateRange.start), JSON.stringify([...next]));
      } catch {}
      return next;
    });
    try {
      await fetch('/api/admin/shopping-list-checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart: dateRange.start, itemKey: key, checked: willBeChecked }),
      });
    } catch {}
  };

  const addCustomItem = async () => {
    if (!dateRange || !addName.trim() || adding) return;
    setAdding(true);
    try {
      const res = await fetch('/api/admin/shopping-list-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart: dateRange.start, name: addName.trim(), category: addCategory }),
      });
      if (res.ok) {
        const created: CustomItem = await res.json();
        setCustomItems((prev) => [...prev, created]);
        setAddName('');
      }
    } catch {} finally {
      setAdding(false);
    }
  };

  const removeCustomItem = async (id: string) => {
    setCustomItems((prev) => prev.filter((c) => c.id !== id));
    try {
      await fetch(`/api/admin/shopping-list-custom?id=${id}`, { method: 'DELETE' });
    } catch {}
  };

  const clearAll = async () => {
    if (!dateRange) return;
    setChecked(new Set());
    setCustomItems([]);
    try {
      localStorage.setItem(checksCacheKeyFor(dateRange.start), JSON.stringify([]));
    } catch {}
    try {
      await Promise.all([
        fetch(`/api/admin/shopping-list-checks?weekStart=${dateRange.start}`, { method: 'DELETE' }),
        fetch(`/api/admin/shopping-list-custom?weekStart=${dateRange.start}`, { method: 'DELETE' }),
      ]);
    } catch {}
  };

  const clearCount = checked.size + customItems.length;

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
          {clearCount > 0 && (
            <button
              onClick={clearAll}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm flex-shrink-0"
            >
              Clear ({clearCount})
            </button>
          )}
        </div>

        {/* Add custom item */}
        <div className="mb-6 flex gap-2">
          <input
            type="text"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomItem()}
            placeholder="Add item..."
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
          />
          <select
            value={addCategory}
            onChange={(e) => setAddCategory(e.target.value)}
            className="px-2 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
          >
            {categoryOrder.map((c) => (
              <option key={c} value={c}>{categoryLabels[c]}</option>
            ))}
          </select>
          <button
            onClick={addCustomItem}
            disabled={!addName.trim() || adding}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded text-sm"
          >
            +
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : shoppingList.length === 0 ? (
          <p className="text-gray-400">No items. Add one above or assign meals in the cycle.</p>
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
                          <div className={`flex-1 flex flex-wrap items-baseline gap-x-2 ${isChecked ? 'line-through' : ''}`}>
                            <span>{item.name}</span>
                            {!item.isCustom && (
                              <span className="text-gray-400 text-sm">
                                {item.amount % 1 === 0 ? item.amount : item.amount.toFixed(2)} {item.unit}
                              </span>
                            )}
                            {item.meals?.length > 0 && (
                              <span className="text-gray-500 text-xs">
                                ({item.meals.join(', ')})
                              </span>
                            )}
                          </div>
                          {item.isCustom && item.customId && (
                            <button
                              onClick={(e) => { e.stopPropagation(); removeCustomItem(item.customId!); }}
                              className="text-gray-500 hover:text-red-400 px-2 text-lg leading-none flex-shrink-0"
                              aria-label="Remove"
                            >
                              ×
                            </button>
                          )}
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
