'use client';

import { useEffect, useState } from 'react';
import { DataGrid, type Column } from '@/components/admin/DataGrid';

type Meal = {
  id: string;
  name: string;
  category: string;
  prepNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

const categoryOptions = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

const columns: Column<Meal>[] = [
  { key: 'name', header: 'Name', width: '200px', editable: true },
  { 
    key: 'category', 
    header: 'Category', 
    width: '120px', 
    editable: true,
    type: 'select',
    options: categoryOptions,
  },
  { key: 'prepNotes', header: 'Prep Notes', editable: true },
];

export default function MealsPage() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeals = async () => {
    try {
      const response = await fetch('/api/admin/meals');
      if (response.ok) {
        const data = await response.json();
        setMeals(data);
      }
    } catch (error) {
      console.error('Error fetching meals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeals();
  }, []);

  const handleSave = async (row: Meal) => {
    const response = await fetch('/api/admin/meals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    });
    if (!response.ok) {
      throw new Error('Failed to update meal');
    }
    await fetchMeals();
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/admin/meals?id=${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete meal');
    }
    await fetchMeals();
  };

  const handleAdd = async (row: Partial<Meal>) => {
    const response = await fetch('/api/admin/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    });
    if (!response.ok) {
      throw new Error('Failed to create meal');
    }
    await fetchMeals();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Meals</h2>
      <DataGrid
        data={meals}
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
