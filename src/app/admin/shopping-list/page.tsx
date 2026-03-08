'use client';

import { useEffect, useState } from 'react';

type ShoppingItem = {
  ingredientId: string;
  ingredientName: string;
  department: string;
  unit: string;
  totalAmount: number;
};

const departmentLabels: Record<string, string> = {
  produce: 'Produce',
  meat: 'Meat',
  dairy: 'Dairy',
  bakery: 'Bakery',
  frozen: 'Frozen',
  canned: 'Canned',
  dry_goods: 'Dry Goods',
  condiments: 'Condiments',
  other: 'Other',
};

export default function ShoppingListPage() {
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const fetchShoppingList = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/shopping-list?days=${days}`);
      if (response.ok) {
        const data = await response.json();
        setShoppingList(data.shoppingList || []);
      }
    } catch (error) {
      console.error('Error fetching shopping list:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShoppingList();
  }, [days]);

  // Group by department
  const groupedItems = shoppingList.reduce((acc, item) => {
    const dept = item.department || 'other';
    if (!acc[dept]) {
      acc[dept] = [];
    }
    acc[dept].push(item);
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  const departmentOrder = [
    'produce', 'meat', 'dairy', 'bakery', 'frozen', 
    'canned', 'dry_goods', 'condiments', 'other'
  ];

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Shopping List</h2>
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-400">Next</label>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm"
          >
            <option value={3}>3 days</option>
            <option value={5}>5 days</option>
            <option value={7}>7 days</option>
            <option value={10}>10 days</option>
            <option value={14}>14 days</option>
            <option value={21}>21 days</option>
          </select>
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
        <div className="text-gray-400">No meals planned for the selected period.</div>
      ) : (
        <div className="space-y-6 print:space-y-4">
          {departmentOrder.map((dept) => {
            const items = groupedItems[dept];
            if (!items || items.length === 0) return null;
            
            return (
              <div key={dept} className="bg-gray-800 rounded-lg p-4 print:bg-white print:border print:border-gray-300">
                <h3 className="text-lg font-semibold mb-3 print:text-black">
                  {departmentLabels[dept] || dept}
                </h3>
                <ul className="space-y-1">
                  {items.map((item) => (
                    <li key={`${item.ingredientId}-${item.unit}`} className="flex justify-between items-center print:text-black">
                      <span>{item.ingredientName}</span>
                      <span className="text-gray-400 print:text-gray-600">
                        {Number(item.totalAmount)} {item.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {/* Print-only header */}
      <div className="hidden print:block mt-4 text-center">
        <h1 className="text-xl font-bold">Shopping List - Next {days} Days</h1>
        <p className="text-sm text-gray-500">Generated on {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
}
