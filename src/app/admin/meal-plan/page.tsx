'use client';

import { useEffect, useState } from 'react';
import { DataGrid, type Column } from '@/components/admin/DataGrid';

type MealPlanEntry = {
  id: string;
  date: string;
  mealSlot: string;
  mealId: string;
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
      width: '200px', 
      editable: true,
      type: 'select',
      options: mealOptions,
      render: (row) => row.mealName || row.mealId,
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

  const handleAdd = async (row: Partial<MealPlanEntry>) => {
    const response = await fetch('/api/admin/meal-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    });
    if (!response.ok) {
      throw new Error('Failed to create meal plan entry');
    }
    await fetchData();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Meal Plan</h2>
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
