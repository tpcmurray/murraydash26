'use client';

import { useEffect, useState } from 'react';
import { DataGrid, type Column } from '@/components/admin/DataGrid';

type MealIngredient = {
  id: string;
  mealId: string;
  ingredientId: string;
  amount: string;
  unit: string;
  mealName: string;
  ingredientName: string;
  createdAt: string;
};

type Meal = {
  id: string;
  name: string;
};

type Ingredient = {
  id: string;
  name: string;
};

const unitOptions = [
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'ml', label: 'ml' },
  { value: 'L', label: 'L' },
  { value: 'tsp', label: 'tsp' },
  { value: 'tbsp', label: 'tbsp' },
  { value: 'cup', label: 'cup' },
  { value: 'oz', label: 'oz' },
  { value: 'lb', label: 'lb' },
  { value: 'piece', label: 'piece' },
  { value: 'pinch', label: 'pinch' },
];

export default function MealIngredientsPage() {
  const [mealIngredients, setMealIngredients] = useState<MealIngredient[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [miRes, mealsRes, ingredientsRes] = await Promise.all([
        fetch('/api/admin/meal-ingredients'),
        fetch('/api/admin/meals'),
        fetch('/api/admin/ingredients'),
      ]);
      
      if (miRes.ok) {
        const data = await miRes.json();
        setMealIngredients(data);
      }
      if (mealsRes.ok) {
        const data = await mealsRes.json();
        setMeals(data);
      }
      if (ingredientsRes.ok) {
        const data = await ingredientsRes.json();
        setIngredients(data);
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
  const ingredientOptions = ingredients.map(i => ({ value: i.id, label: i.name }));

  const columns: Column<MealIngredient>[] = [
    { 
      key: 'mealId', 
      header: 'Meal', 
      width: '150px', 
      editable: true,
      type: 'select',
      options: mealOptions,
      render: (row) => row.mealName || row.mealId,
    },
    { 
      key: 'ingredientId', 
      header: 'Ingredient', 
      width: '150px', 
      editable: true,
      type: 'select',
      options: ingredientOptions,
      render: (row) => row.ingredientName || row.ingredientId,
    },
    { key: 'amount', header: 'Amount', width: '100px', editable: true, type: 'number' },
    { 
      key: 'unit', 
      header: 'Unit', 
      width: '80px', 
      editable: true,
      type: 'select',
      options: unitOptions,
    },
  ];

  const handleSave = async (row: MealIngredient) => {
    const response = await fetch('/api/admin/meal-ingredients', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: row.id,
        mealId: row.mealId,
        ingredientId: row.ingredientId,
        amount: row.amount,
        unit: row.unit,
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to update meal ingredient');
    }
    await fetchData();
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/admin/meal-ingredients?id=${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete meal ingredient');
    }
    await fetchData();
  };

  const handleAdd = async (row: Partial<MealIngredient>) => {
    const response = await fetch('/api/admin/meal-ingredients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    });
    if (!response.ok) {
      throw new Error('Failed to create meal ingredient');
    }
    await fetchData();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Meal Ingredients</h2>
      <DataGrid
        data={mealIngredients}
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
