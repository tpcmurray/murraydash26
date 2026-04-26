'use client';

import { useEffect, useState } from 'react';

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

export default function ShoppingListPage() {
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const fetchShoppingList = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/shopping-list');
      if (response.ok) {
        const data = await response.json();
        setShoppingList(data.shoppingList || []);
        const newRange = data.dateRange || null;
        setDateRange(newRange);

        if (newRange) {
          const checksRes = await fetch(`/api/admin/shopping-list-checks?weekStart=${newRange.start}`);
          if (checksRes.ok) {
            const checksList: string[] = await checksRes.json();
            setChecked(new Set(checksList));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching shopping list:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchShoppingList(); }, []);

  // Group by category
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

  const clearChecked = async () => {
    if (!dateRange) return;
    setChecked(new Set());
    try {
      await fetch(`/api/admin/shopping-list-checks?weekStart=${dateRange.start}`, { method: 'DELETE' });
    } catch {}
  };

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Shopping List</h2>
          {rangeLabel && (
            <p className="text-sm text-gray-400 mt-1">Shopping for {rangeLabel}</p>
          )}
        </div>
        <div className="flex gap-3">
          {checked.size > 0 && (
            <button
              onClick={clearChecked}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm"
            >
              Clear Checked ({checked.size})
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
          >
            Print
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : shoppingList.length === 0 ? (
        <div className="text-gray-400">No meals assigned to this week&apos;s cycle days.</div>
      ) : (
        <div className="space-y-6 print:space-y-4">
          {categoryOrder.map((cat) => {
            const items = groupedItems[cat];
            if (!items || items.length === 0) return null;

            return (
              <div key={cat} className="bg-gray-800 rounded-lg p-4 print:bg-white print:border print:border-gray-300">
                <h3 className="text-lg font-semibold mb-3 print:text-black">
                  {categoryLabels[cat] || cat}
                </h3>
                <ul className="space-y-1">
                  {items.map((item) => {
                    const isChecked = checked.has(item.key);
                    return (
                      <li
                        key={item.key}
                        className={`flex items-center gap-3 cursor-pointer select-none ${isChecked ? 'opacity-40' : ''}`}
                        onClick={() => toggleCheck(item.key)}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCheck(item.key)}
                          className="w-4 h-4 flex-shrink-0 accent-green-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className={`print:text-black ${isChecked ? 'line-through' : ''}`}>
                          {item.name}
                        </span>
                        <span className={`text-gray-400 print:text-gray-600 ${isChecked ? 'line-through' : ''}`}>
                          {item.amount % 1 === 0 ? item.amount : item.amount.toFixed(2)} {item.unit}
                        </span>
                        {item.meals?.length > 0 && (
                          <span className={`text-gray-500 text-sm print:text-gray-400 ${isChecked ? 'line-through' : ''}`}>
                            ({item.meals.join(', ')})
                          </span>
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

      {/* Print-only header */}
      <div className="hidden print:block mt-4 text-center">
        <h1 className="text-xl font-bold">Shopping List — {rangeLabel}</h1>
        <p className="text-sm text-gray-500">Generated on {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
}
