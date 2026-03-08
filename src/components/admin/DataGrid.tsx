'use client';

import { useState, useCallback } from 'react';

export type Column<T> = {
  key: keyof T | string;
  header: string;
  width?: string;
  render?: (row: T) => React.ReactNode;
  editable?: boolean;
  type?: 'text' | 'select' | 'number' | 'boolean' | 'date';
  options?: { value: string; label: string }[];
};

type DataGridProps<T> = {
  data: T[];
  columns: Column<T>[];
  onSave?: (row: T) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onAdd?: (row: Partial<T>) => Promise<void>;
  idField: keyof T;
  loading?: boolean;
};

export function DataGrid<T extends Record<string, unknown>>({
  data,
  columns,
  onSave,
  onDelete,
  onAdd,
  idField,
  loading = false,
}: DataGridProps<T>) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, unknown>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [newRow, setNewRow] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEdit = (row: T) => {
    setEditingId(String(row[idField]));
    setEditValues({ ...row });
    setError(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues({});
    setError(null);
  };

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    setError(null);
    try {
      const row = data.find((r) => String(r[idField]) === editingId);
      if (row) {
        await onSave({ ...row, ...editValues } as T);
      }
      setEditingId(null);
      setEditValues({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!onDelete) return;
    if (!confirm('Are you sure you want to delete this item?')) return;
    setSaving(true);
    setError(null);
    try {
      await onDelete(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!onAdd) return;
    setSaving(true);
    setError(null);
    try {
      await onAdd(newRow as Partial<T>);
      setIsAdding(false);
      setNewRow({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add');
    } finally {
      setSaving(false);
    }
  };

  const getValue = (row: T, key: string): unknown => {
    if (editingId && String(row[idField]) === editingId) {
      return editValues[key];
    }
    return row[key as keyof T];
  };

  const renderCell = (row: T, col: Column<T>) => {
    const key = col.key as string;
    const value = getValue(row, key);

    if (editingId && String(row[idField]) === editingId) {
      if (col.type === 'select' && col.options) {
        return (
          <select
            value={String(value || '')}
            onChange={(e) => setEditValues({ ...editValues, [key]: e.target.value })}
            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
          >
            {col.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      }
      if (col.type === 'boolean') {
        return (
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => setEditValues({ ...editValues, [key]: e.target.checked })}
            className="w-4 h-4"
          />
        );
      }
      if (col.type === 'number') {
        return (
          <input
            type="number"
            value={String(value || '')}
            onChange={(e) => setEditValues({ ...editValues, [key]: e.target.value })}
            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
          />
        );
      }
      return (
        <input
          type="text"
          value={String(value || '')}
          onChange={(e) => setEditValues({ ...editValues, [key]: e.target.value })}
          className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
        />
      );
    }

    if (col.render) {
      return col.render(row);
    }

    if (col.type === 'boolean') {
      return value ? '✓' : '✗';
    }

    return String(value ?? '');
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-800">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className="px-3 py-2 text-left text-sm font-medium text-gray-300 border border-gray-700"
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
              <th className="px-3 py-2 text-center text-sm font-medium text-gray-300 border border-gray-700 w-40">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-8 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-8 text-center text-gray-400">
                  No data found
                </td>
              </tr>
            ) : (
              <>
                {isAdding && (
                  <tr className="bg-gray-800/50">
                    {columns.map((col) => {
                      const key = col.key as string;
                      const value = newRow[key];
                      return (
                        <td
                          key={String(col.key)}
                          className="px-2 py-2 border border-gray-700"
                        >
                          {col.type === 'select' && col.options ? (
                            <select
                              value={String(value || '')}
                              onChange={(e) =>
                                setNewRow({ ...newRow, [key]: e.target.value })
                              }
                              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                            >
                              <option value="">Select...</option>
                              {col.options.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : col.type === 'boolean' ? (
                            <input
                              type="checkbox"
                              checked={Boolean(value)}
                              onChange={(e) =>
                                setNewRow({ ...newRow, [key]: e.target.checked })
                              }
                              className="w-4 h-4"
                            />
                          ) : col.type === 'number' ? (
                            <input
                              type="number"
                              value={String(value || '')}
                              onChange={(e) =>
                                setNewRow({ ...newRow, [key]: e.target.value })
                              }
                              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                            />
                          ) : (
                            <input
                              type="text"
                              value={String(value || '')}
                              onChange={(e) =>
                                setNewRow({ ...newRow, [key]: e.target.value })
                              }
                              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                            />
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 border border-gray-700">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={handleAdd}
                          disabled={saving}
                          className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 rounded disabled:opacity-50"
                        >
                          {saving ? '...' : 'Save'}
                        </button>
                        <button
                          onClick={() => {
                            setIsAdding(false);
                            setNewRow({});
                          }}
                          disabled={saving}
                          className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 rounded disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                {data.map((row) => (
                  <tr key={String(row[idField])} className="hover:bg-gray-800/50">
                    {columns.map((col) => (
                      <td
                        key={String(col.key)}
                        className="px-2 py-2 text-sm border border-gray-700"
                      >
                        {renderCell(row, col)}
                      </td>
                    ))}
                    <td className="px-2 py-2 border border-gray-700">
                      <div className="flex justify-center gap-2">
                        {editingId === String(row[idField]) ? (
                          <>
                            <button
                              onClick={handleSave}
                              disabled={saving}
                              className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 rounded disabled:opacity-50"
                            >
                              {saving ? '...' : 'Save'}
                            </button>
                            <button
                              onClick={handleCancel}
                              disabled={saving}
                              className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 rounded disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(row)}
                              className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded"
                            >
                              Edit
                            </button>
                            {onDelete && (
                              <button
                                onClick={() => handleDelete(String(row[idField]))}
                                className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded"
                              >
                                Delete
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {onAdd && !isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
        >
          Add New
        </button>
      )}
    </div>
  );
}
