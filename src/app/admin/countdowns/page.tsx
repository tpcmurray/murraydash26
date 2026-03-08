'use client';

import { useEffect, useState } from 'react';
import { DataGrid, type Column } from '@/components/admin/DataGrid';

type Countdown = {
  id: string;
  name: string;
  targetTime: string;
  targetDate: string | null;
  recurrence: string;
  createdAt: string;
  updatedAt: string;
};

const recurrenceOptions = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays (Mon-Fri)' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'once', label: 'Once' },
];

const columns: Column<Countdown>[] = [
  { key: 'name', header: 'Name', width: '200px', editable: true },
  { key: 'targetTime', header: 'Target Time (HH:MM)', width: '150px', editable: true },
  { key: 'targetDate', header: 'Target Date (YYYY-MM-DD)', width: '150px', editable: true },
  { 
    key: 'recurrence', 
    header: 'Recurrence', 
    width: '120px', 
    editable: true,
    type: 'select',
    options: recurrenceOptions,
  },
];

export default function CountdownsPage() {
  const [countdowns, setCountdowns] = useState<Countdown[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCountdowns = async () => {
    try {
      const response = await fetch('/api/admin/countdowns');
      if (response.ok) {
        const data = await response.json();
        setCountdowns(data);
      }
    } catch (error) {
      console.error('Error fetching countdowns:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCountdowns();
  }, []);

  const handleSave = async (row: Countdown) => {
    const response = await fetch('/api/admin/countdowns', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    });
    if (!response.ok) {
      throw new Error('Failed to update countdown');
    }
    await fetchCountdowns();
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/admin/countdowns?id=${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete countdown');
    }
    await fetchCountdowns();
  };

  const handleAdd = async (row: Partial<Countdown>) => {
    const response = await fetch('/api/admin/countdowns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    });
    if (!response.ok) {
      throw new Error('Failed to create countdown');
    }
    await fetchCountdowns();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Countdowns</h2>
      <DataGrid
        data={countdowns}
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
