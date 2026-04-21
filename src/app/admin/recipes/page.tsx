'use client';

import { useEffect, useState, useRef } from 'react';
import RecipeView from '@/components/admin/RecipeView';

type RecipeIngredient = {
  name: string;
  amount: number;
  unit: string;
  category: string;
};

type Recipe = {
  id: string;
  title: string;
  servings: number;
  ingredients: string; // JSON string
  sundayPrep: string | null;
  miseEnPlace: string | null;
  cookingInstructions: string | null;
  hasImage: boolean;
  imageContentType: string | null;
};

const CATEGORY_OPTIONS = [
  { value: 'produce', label: 'Produce' },
  { value: 'bread', label: 'Bread' },
  { value: 'meat_fish', label: 'Meat / Fish' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'frozen', label: 'Frozen' },
  { value: 'isle', label: 'Isle' },
  { value: 'pantry', label: 'Pantry' },
];

const UNIT_OPTIONS = ['g', 'kg', 'ml', 'L', 'tsp', 'tbsp', 'cup', 'oz', 'lb', 'piece', 'pinch'];

const emptyIngredient = (): RecipeIngredient => ({
  name: '',
  amount: 0,
  unit: 'piece',
  category: 'produce',
});

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [viewing, setViewing] = useState<Recipe | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [servings, setServings] = useState(4);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [sundayPrep, setSundayPrep] = useState('');
  const [miseEnPlace, setMiseEnPlace] = useState('');
  const [cookingInstructions, setCookingInstructions] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevServingsRef = useRef(4);

  const fetchRecipes = async () => {
    try {
      const res = await fetch('/api/admin/recipes');
      if (res.ok) setRecipes(await res.json());
    } catch (e) {
      console.error('Error fetching recipes:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecipes(); }, []);

  const openEditor = (recipe?: Recipe) => {
    if (recipe) {
      setEditing(recipe);
      setIsNew(false);
      setTitle(recipe.title);
      setServings(recipe.servings);
      prevServingsRef.current = recipe.servings;
      const parsed: RecipeIngredient[] = JSON.parse(recipe.ingredients || '[]');
      setIngredients(parsed.length > 0 ? parsed : [emptyIngredient()]);
      setSundayPrep(recipe.sundayPrep || '');
      setMiseEnPlace(recipe.miseEnPlace || '');
      setCookingInstructions(recipe.cookingInstructions || '');
      setImageFile(null);
      setRemoveImage(false);
      setImagePreview(recipe.hasImage ? `/api/admin/recipes/${recipe.id}/image` : null);
    } else {
      setEditing(null);
      setIsNew(true);
      setTitle('');
      setServings(4);
      prevServingsRef.current = 4;
      setIngredients([emptyIngredient()]);
      setSundayPrep('');
      setMiseEnPlace('');
      setCookingInstructions('');
      setImageFile(null);
      setRemoveImage(false);
      setImagePreview(null);
    }
    setError(null);
  };

  const closeEditor = () => {
    setEditing(null);
    setIsNew(false);
  };

  const handleServingsChange = (newServings: number) => {
    if (newServings < 1) return;
    const oldServings = prevServingsRef.current;
    if (oldServings > 0 && newServings !== oldServings) {
      const scale = newServings / oldServings;
      setIngredients((prev) =>
        prev.map((ing) => ({
          ...ing,
          amount: Math.round(ing.amount * scale * 100) / 100,
        }))
      );
    }
    setServings(newServings);
    prevServingsRef.current = newServings;
  };

  const updateIngredient = (index: number, field: keyof RecipeIngredient, value: string | number) => {
    setIngredients((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addIngredient = () => {
    setIngredients((prev) => [...prev, emptyIngredient()]);
  };

  const removeIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setRemoveImage(false);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    setError(null);

    try {
      let imageBase64: string | undefined;
      let imageContentType: string | undefined;

      if (imageFile) {
        const buffer = await imageFile.arrayBuffer();
        imageBase64 = Buffer.from(buffer).toString('base64');
        imageContentType = imageFile.type;
      }

      const body: Record<string, unknown> = {
        title: title.trim(),
        servings,
        ingredients: ingredients.filter((i) => i.name.trim()),
        sundayPrep: sundayPrep.trim() || null,
        miseEnPlace: miseEnPlace.trim() || null,
        cookingInstructions: cookingInstructions.trim() || null,
      };

      if (imageBase64) {
        body.imageBase64 = imageBase64;
        body.imageContentType = imageContentType;
      }
      if (removeImage) {
        body.removeImage = true;
      }

      if (isNew) {
        const res = await fetch('/api/admin/recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Failed to create recipe');
      } else if (editing) {
        body.id = editing.id;
        const res = await fetch('/api/admin/recipes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Failed to update recipe');
      }

      await fetchRecipes();
      closeEditor();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this recipe?')) return;
    try {
      await fetch(`/api/admin/recipes?id=${id}`, { method: 'DELETE' });
      await fetchRecipes();
    } catch (e) {
      console.error('Error deleting recipe:', e);
    }
  };

  if (loading) return <p className="text-gray-400">Loading...</p>;

  // Show editor
  if (isNew || editing) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{isNew ? 'New Recipe' : `Edit: ${editing!.title}`}</h2>
          <button onClick={closeEditor} className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded">
            Cancel
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-300 text-sm">{error}</div>}

        <div className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              placeholder="Recipe title"
            />
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Image</label>
            <div className="flex items-center gap-4">
              {imagePreview && !removeImage && (
                <img src={imagePreview} alt="Preview" className="w-24 h-24 object-cover rounded" />
              )}
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="text-sm text-gray-400"
                />
                {(imagePreview || editing?.hasImage) && !removeImage && (
                  <button
                    onClick={() => { setRemoveImage(true); setImagePreview(null); setImageFile(null); }}
                    className="text-xs text-red-400 hover:text-red-300 self-start"
                  >
                    Remove image
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Servings */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Servings</label>
            <input
              type="number"
              min={1}
              value={servings}
              onChange={(e) => handleServingsChange(parseInt(e.target.value) || 1)}
              className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            />
            <span className="text-xs text-gray-500 ml-2">Changing this scales ingredient amounts</span>
          </div>

          {/* Ingredients */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-300">Ingredients</label>
              <button onClick={addIngredient} className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded">
                + Add Ingredient
              </button>
            </div>
            <div className="space-y-2">
              {ingredients.map((ing, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => updateIngredient(idx, 'name', e.target.value)}
                    placeholder="Name"
                    className="flex-1 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm"
                  />
                  <input
                    type="number"
                    value={ing.amount || ''}
                    onChange={(e) => updateIngredient(idx, 'amount', parseFloat(e.target.value) || 0)}
                    placeholder="Amt"
                    className="w-20 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm"
                  />
                  <select
                    value={ing.unit}
                    onChange={(e) => updateIngredient(idx, 'unit', e.target.value)}
                    className="w-20 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm"
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  <select
                    value={ing.category}
                    onChange={(e) => updateIngredient(idx, 'category', e.target.value)}
                    className="w-28 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeIngredient(idx)}
                    className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded"
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Sunday Prep */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Sunday Prep</label>
            <textarea
              value={sundayPrep}
              onChange={(e) => setSundayPrep(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              placeholder="Things to prepare during weekly meal prep..."
            />
          </div>

          {/* Mise en Place */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Mise en Place</label>
            <textarea
              value={miseEnPlace}
              onChange={(e) => setMiseEnPlace(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              placeholder="Day-of prep before turning on the heat..."
            />
          </div>

          {/* Cooking Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Cooking Instructions</label>
            <textarea
              value={cookingInstructions}
              onChange={(e) => setCookingInstructions(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              placeholder="Step by step cooking instructions..."
            />
          </div>

          {/* Save */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded font-medium"
            >
              {saving ? 'Saving...' : 'Save Recipe'}
            </button>
            <button onClick={closeEditor} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Recipes</h2>
        <button onClick={() => openEditor()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium">
          + New Recipe
        </button>
      </div>

      {recipes.length === 0 ? (
        <p className="text-gray-400">No recipes yet. Click &quot;+ New Recipe&quot; to add one.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-700">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 border border-gray-600">Title</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-300 border border-gray-600 w-24">Servings</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-300 border border-gray-600 w-32">Ingredients</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-300 border border-gray-600 w-20">Image</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-300 border border-gray-600 w-40">Actions</th>
            </tr>
          </thead>
          <tbody>
            {recipes.map((recipe) => {
              const ingCount = JSON.parse(recipe.ingredients || '[]').length;
              return (
                <tr key={recipe.id} className="bg-gray-800 hover:bg-gray-750">
                  <td className="px-4 py-3 border border-gray-700 font-medium">{recipe.title}</td>
                  <td className="px-4 py-3 border border-gray-700 text-center">{recipe.servings}</td>
                  <td className="px-4 py-3 border border-gray-700 text-center text-gray-400">{ingCount} items</td>
                  <td className="px-4 py-3 border border-gray-700 text-center">
                    {recipe.hasImage ? (
                      <span className="text-green-400">Yes</span>
                    ) : (
                      <span className="text-gray-500">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 border border-gray-700 text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => setViewing(recipe)}
                        className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded"
                      >
                        View
                      </button>
                      <button
                        onClick={() => openEditor(recipe)}
                        className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(recipe.id)}
                        className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* View Recipe Modal */}
      {viewing && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 pt-12 overflow-y-auto">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-3xl mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{viewing.title}</h2>
              <button
                onClick={() => setViewing(null)}
                className="text-gray-400 hover:text-white text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <RecipeView recipe={viewing} />
          </div>
        </div>
      )}
    </div>
  );
}
