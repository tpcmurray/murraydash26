'use client';

import { useEffect, useState } from 'react';
import { DataGrid, type Column } from '@/components/admin/DataGrid';

type Reminder = {
  id: string;
  mealId: string;
  reminderText: string;
  timingOffset: string;
  active: boolean;
  mealName: string;
  createdAt: string;
  updatedAt: string;
};

type Meal = {
  id: string;
  name: string;
};

const timingOffsetOptions = [
  { value: '-1 day', label: '-1 day' },
  { value: '-12 hours', label: '-12 hours' },
  { value: 'morning_of', label: 'Morning of' },
];

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [remindersRes, mealsRes] = await Promise.all([
        fetch('/api/admin/reminders'),
        fetch('/api/admin/meals'),
      ]);
      
      if (remindersRes.ok) {
        const data = await remindersRes.json();
        setReminders(data);
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

  const columns: Column<Reminder>[] = [
    { 
      key: 'mealId', 
      header: 'Meal', 
      width: '150px', 
      editable: true,
      type: 'select',
      options: mealOptions,
      render: (row) => row.mealName || row.mealId,
    },
    { key: 'reminderText', header: 'Reminder Text', editable: true },
    { 
      key: 'timingOffset', 
      header: 'Timing Offset', 
      width: '120px', 
      editable: true,
      type: 'select',
      options: timingOffsetOptions,
    },
    { key: 'active', header: 'Active', width: '80px', editable: true, type: 'boolean' },
  ];

  const handleSave = async (row: Reminder) => {
    const response = await fetch('/api/admin/reminders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: row.id,
        mealId: row.mealId,
        reminderText: row.reminderText,
        timingOffset: row.timingOffset,
        active: row.active,
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to update reminder');
    }
    await fetchData();
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/admin/reminders?id=${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete reminder');
    }
    await fetchData();
  };

  const handleAdd = async (row: Partial<Reminder>) => {
    const response = await fetch('/api/admin/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    });
    if (!response.ok) {
      throw new Error('Failed to create reminder');
    }
    await fetchData();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Reminders</h2>
      <DataGrid
        data={reminders}
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
