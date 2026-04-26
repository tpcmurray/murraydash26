'use client';

import { useEffect, useState } from 'react';

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

export default function ShoppingListPage() {
  const [mealItems, setMealItems] = useState<ShoppingItem[]>([]);
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState<Set<string>>(new Set());
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

  const fetchAll = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/shopping-list');
      if (response.ok) {
        const data = await response.json();
        setMealItems(data.shoppingList || []);
        const newRange = data.dateRange || null;
        setDateRange(newRange);

        if (newRange) {
          const [checksRes, customRes] = await Promise.all([
            fetch(`/api/admin/shopping-list-checks?weekStart=${newRange.start}`),
            fetch(`/api/admin/shopping-list-custom?weekStart=${newRange.start}`),
          ]);
          if (checksRes.ok) {
            const checksList: string[] = await checksRes.json();
            setChecked(new Set(checksList));
          }
          if (customRes.ok) {
            const list: CustomItem[] = await customRes.json();
            setCustomItems(list);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching shopping list:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

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
      await Promise.all([
        fetch(`/api/admin/shopping-list-checks?weekStart=${dateRange.start}`, { method: 'DELETE' }),
        fetch(`/api/admin/shopping-list-custom?weekStart=${dateRange.start}`, { method: 'DELETE' }),
      ]);
    } catch {}
  };

  const clearCount = checked.size + customItems.length;

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
          {clearCount > 0 && (
            <button
              onClick={clearAll}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm"
            >
              Clear ({clearCount})
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

      {/* Add custom item */}
      <div className="mb-6 flex gap-2 print:hidden">
        <input
          type="text"
          value={addName}
          onChange={(e) => setAddName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCustomItem()}
          placeholder="Add item..."
          className="flex-1 max-w-xs px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
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
        <div className="text-gray-400">Loading...</div>
      ) : shoppingList.length === 0 ? (
        <div className="text-gray-400">No items. Add one above or assign meals in the cycle.</div>
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
                        {!item.isCustom && (
                          <span className={`text-gray-400 print:text-gray-600 ${isChecked ? 'line-through' : ''}`}>
                            {item.amount % 1 === 0 ? item.amount : item.amount.toFixed(2)} {item.unit}
                          </span>
                        )}
                        {item.meals?.length > 0 && (
                          <span className={`text-gray-500 text-sm print:text-gray-400 ${isChecked ? 'line-through' : ''}`}>
                            ({item.meals.join(', ')})
                          </span>
                        )}
                        {item.isCustom && item.customId && (
                          <button
                            onClick={(e) => { e.stopPropagation(); removeCustomItem(item.customId!); }}
                            className="ml-auto text-gray-500 hover:text-red-400 px-2 text-lg leading-none flex-shrink-0 print:hidden"
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

      {/* Print-only header */}
      <div className="hidden print:block mt-4 text-center">
        <h1 className="text-xl font-bold">Shopping List — {rangeLabel}</h1>
        <p className="text-sm text-gray-500">Generated on {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
}
