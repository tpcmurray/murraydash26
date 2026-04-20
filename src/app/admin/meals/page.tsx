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

type MealIngredient = {
  id: string;
  mealId: string;
  ingredientId: string;
  amount: string;
  unit: string;
  ingredientName: string;
};


type Ingredient = {
  id: string;
  name: string;
};

const categoryOptions = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

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
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [mealIngredients, setMealIngredients] = useState<MealIngredient[]>([]);

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

  const fetchIngredients = async () => {
    try {
      const response = await fetch('/api/admin/ingredients');
      if (response.ok) {
        const data = await response.json();
        setIngredients(data);
      }
    } catch (error) {
      console.error('Error fetching ingredients:', error);
    }
  };

  const fetchMealDetails = async (mealId: string) => {
    try {
      const miRes = await fetch('/api/admin/meal-ingredients');
      if (miRes.ok) {
        const allMi = await miRes.json();
        setMealIngredients(allMi.filter((mi: MealIngredient) => mi.mealId === mealId));
      }
    } catch (error) {
      console.error('Error fetching meal details:', error);
    }
  };

  useEffect(() => {
    fetchMeals();
    fetchIngredients();
  }, []);

  useEffect(() => {
    if (selectedMeal) {
      fetchMealDetails(selectedMeal.id);
    }
  }, [selectedMeal]);

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

  const handleAddIngredient = async () => {
    if (!selectedMeal) return;
    const newMi = {
      mealId: selectedMeal.id,
      ingredientId: ingredients[0]?.id || '',
      amount: '1',
      unit: 'piece',
    };
    await fetch('/api/admin/meal-ingredients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMi),
    });
    fetchMealDetails(selectedMeal.id);
  };

  const handleDeleteIngredient = async (id: string) => {
    await fetch(`/api/admin/meal-ingredients?id=${id}`, { method: 'DELETE' });
    if (selectedMeal) fetchMealDetails(selectedMeal.id);
  };

  const handleUpdateIngredient = async (mi: MealIngredient) => {
    await fetch('/api/admin/meal-ingredients', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mi),
    });
    if (selectedMeal) fetchMealDetails(selectedMeal.id);
  };


  const ingredientOptions = ingredients.map(i => ({ value: i.id, label: i.name }));

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Meals</h2>
      
      <div className="mb-4">
        <DataGrid
          data={meals}
          columns={[
            ...columns,
            {
              key: 'actions',
              header: 'Details',
              width: '100px',
              render: (row) => (
                <button
                  onClick={() => setSelectedMeal(row)}
                  className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 rounded"
                >
                  View
                </button>
              ),
            },
          ]}
          idField="id"
          onSave={handleSave}
          onDelete={handleDelete}
          onAdd={handleAdd}
          loading={loading}
        />
      </div>

      {/* Meal Detail Modal */}
      {selectedMeal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{selectedMeal.name} - Details</h3>
              <button
                onClick={() => setSelectedMeal(null)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Ingredients Section */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-semibold">Ingredients</h4>
                <button
                  onClick={handleAddIngredient}
                  className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 rounded"
                >
                  + Add Ingredient
                </button>
              </div>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="px-3 py-2 text-left text-sm font-medium text-gray-300 border border-gray-600">Ingredient</th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-gray-300 border border-gray-600 w-24">Amount</th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-gray-300 border border-gray-600 w-24">Unit</th>
                    <th className="px-3 py-2 text-center text-sm font-medium text-gray-300 border border-gray-600 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mealIngredients.map((mi) => (
                    <tr key={mi.id} className="bg-gray-800">
                      <td className="px-2 py-2 border border-gray-700">
                        <select
                          value={mi.ingredientId}
                          onChange={(e) => handleUpdateIngredient({ ...mi, ingredientId: e.target.value })}
                          className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                        >
                          {ingredientOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2 border border-gray-700">
                        <input
                          type="number"
                          value={mi.amount}
                          onChange={(e) => handleUpdateIngredient({ ...mi, amount: e.target.value })}
                          className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                        />
                      </td>
                      <td className="px-2 py-2 border border-gray-700">
                        <select
                          value={mi.unit}
                          onChange={(e) => handleUpdateIngredient({ ...mi, unit: e.target.value })}
                          className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                        >
                          {unitOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2 border border-gray-700 text-center">
                        <button
                          onClick={() => handleDeleteIngredient(mi.id)}
                          className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
