export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Admin Dashboard</h2>
        <p className="text-gray-400 mt-1">
          Manage your MurrayDash data. Select a tab above to get started.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AdminCard
          title="Recipes"
          description="Add, edit, or remove recipes with ingredients and instructions."
          href="/admin/recipes"
        />
        <AdminCard
          title="Meal Cycle"
          description="Assign recipes to your rotating meal schedule."
          href="/admin/meal-plan"
        />
        <AdminCard
          title="Today's Recipe"
          description="View the full recipe for tonight's dinner."
          href="/admin/todays-recipe"
        />
        <AdminCard
          title="Sunday Prep"
          description="All prep steps for the upcoming week's meals."
          href="/admin/sunday-prep"
        />
        <AdminCard
          title="Shopping List"
          description="View the shopping list for the upcoming week."
          href="/admin/shopping-list"
        />
        <AdminCard
          title="Countdowns"
          description="Manage countdown timers and events."
          href="/admin/countdowns"
        />
      </div>
    </div>
  );
}

function AdminCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="block p-6 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
    >
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-gray-400 mt-2">{description}</p>
    </a>
  );
}
