'use client';

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
  ingredients: string;
  sundayPrep: string | null;
  miseEnPlace: string | null;
  cookingInstructions: string | null;
  hasImage: boolean;
};

const CATEGORY_LABELS: Record<string, string> = {
  produce: 'Produce',
  bread: 'Bread',
  meat_fish: 'Meat / Fish',
  dairy: 'Dairy',
  frozen: 'Frozen',
  isle: 'Isle',
  pantry: 'Pantry',
};

const CATEGORY_ORDER = ['produce', 'bread', 'meat_fish', 'dairy', 'frozen', 'isle', 'pantry'];

export type { Recipe as RecipeViewData };

export default function RecipeView({ recipe }: { recipe: Recipe }) {
  const ingredients: RecipeIngredient[] = JSON.parse(recipe.ingredients || '[]');

  const grouped: Record<string, RecipeIngredient[]> = {};
  for (const ing of ingredients) {
    const cat = ing.category || 'pantry';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(ing);
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex gap-6 mb-8">
        {recipe.hasImage && (
          <img
            src={`/api/admin/recipes/${recipe.id}/image`}
            alt={recipe.title}
            className="w-48 h-48 object-cover rounded-lg flex-shrink-0"
          />
        )}
        <div>
          <h3 className="text-3xl font-bold mb-2 print:text-black">{recipe.title}</h3>
          <p className="text-gray-400 print:text-gray-600">Serves {recipe.servings}</p>
        </div>
      </div>

      {/* Ingredients */}
      <section className="mb-8">
        <h4 className="text-xl font-semibold mb-3 border-b border-gray-700 pb-2 print:text-black print:border-gray-300">
          Ingredients
        </h4>
        <table className="w-full border-collapse">
          <tbody>
            {CATEGORY_ORDER.map((cat) => {
              const items = grouped[cat];
              if (!items || items.length === 0) return null;
              return items.map((ing, idx) => (
                <tr key={`${cat}-${idx}`} className="border-b border-gray-800 print:border-gray-200">
                  <td className="py-1.5 pr-4 text-xs font-bold text-gray-500 uppercase tracking-wide align-top w-28 print:text-gray-400">
                    {idx === 0 ? (CATEGORY_LABELS[cat] || cat) : ''}
                  </td>
                  <td className="py-1.5 text-gray-300 print:text-black">
                    <span className="text-gray-400 print:text-gray-600">
                      {ing.amount % 1 === 0 ? ing.amount : ing.amount.toFixed(2)} {ing.unit}
                    </span>{' '}
                    {ing.name}
                  </td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </section>

      {/* Sunday Prep */}
      {recipe.sundayPrep && (
        <section className="mb-8">
          <h4 className="text-xl font-semibold mb-3 border-b border-gray-700 pb-2 print:text-black print:border-gray-300">
            Sunday Prep
          </h4>
          <p className="text-gray-300 whitespace-pre-line print:text-black">{recipe.sundayPrep}</p>
        </section>
      )}

      {/* Mise en Place */}
      {recipe.miseEnPlace && (
        <section className="mb-8">
          <h4 className="text-xl font-semibold mb-3 border-b border-gray-700 pb-2 print:text-black print:border-gray-300">
            Mise en Place
          </h4>
          <p className="text-gray-300 whitespace-pre-line print:text-black">{recipe.miseEnPlace}</p>
        </section>
      )}

      {/* Cooking Instructions */}
      {recipe.cookingInstructions && (
        <section className="mb-8">
          <h4 className="text-xl font-semibold mb-3 border-b border-gray-700 pb-2 print:text-black print:border-gray-300">
            Cooking Instructions
          </h4>
          <p className="text-gray-300 whitespace-pre-line print:text-black">{recipe.cookingInstructions}</p>
        </section>
      )}
    </div>
  );
}
