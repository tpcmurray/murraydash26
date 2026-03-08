'use client';

import { useEffect, useState } from 'react';
import { DataGrid, type Column } from '@/components/admin/DataGrid';

type Ingredient = {
  id: string;
  name: string;
  storageType: string;
  department: string;
  createdAt: string;
  updatedAt: string;
};

const storageTypeOptions = [
  { value: 'frozen', label: 'Frozen' },
  { value: 'fridge', label: 'Fridge' },
  { value: 'pantry', label: 'Pantry' },
];

const departmentOptions = [
  { value: 'produce', label: 'Produce' },
  { value: 'meat', label: 'Meat' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'frozen', label: 'Frozen' },
  { value: 'canned', label: 'Canned' },
  { value: 'dry_goods', label: 'Dry Goods' },
  { value: 'condiments', label: 'Condiments' },
  { value: 'other', label: 'Other' },
];

const columns: Column<Ingredient>[] = [
  { key: 'name', header: 'Name', width: '200px', editable: true },
  { 
    key: 'storageType', 
    header: 'Storage Type', 
    width: '120px', 
    editable: true,
    type: 'select',
    options: storageTypeOptions,
  },
  { 
    key: 'department', 
    header: 'Department', 
    width: '120px', 
    editable: true,
    type: 'select',
    options: departmentOptions,
  },
];

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIngredients = async () => {
    try {
      const response = await fetch('/api/admin/ingredients');
      if (response.ok) {
        const data = await response.json();
        setIngredients(data);
      }
    } catch (error) {
      console.error('Error fetching ingredients:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIngredients();
  }, []);

  const handleSave = async (row: Ingredient) => {
    const response = await fetch('/api/admin/ingredients', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    });
    if (!response.ok) {
      throw new Error('Failed to update ingredient');
    }
    await fetchIngredients();
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/admin/ingredients?id=${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete ingredient');
    }
    await fetchIngredients();
  };

  const handleAdd = async (row: Partial<Ingredient>) => {
    const response = await fetch('/api/admin/ingredients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    });
    if (!response.ok) {
      throw new Error('Failed to create ingredient');
    }
    await fetchIngredients();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Ingredients</h2>
      <DataGrid
        data={ingredients}
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
