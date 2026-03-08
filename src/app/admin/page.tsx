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
          title="Meals"
          description="Add, edit, or remove meals from the database."
          href="/admin/meals"
        />
        <AdminCard
          title="Ingredients"
          description="Manage ingredient inventory and storage types."
          href="/admin/ingredients"
        />
        <AdminCard
          title="Meal Plan"
          description="Schedule meals for specific dates and meal slots."
          href="/admin/meal-plan"
        />
        <AdminCard
          title="Meal Ingredients"
          description="Link ingredients to meals with quantities."
          href="/admin/meal-ingredients"
        />
        <AdminCard
          title="Reminders"
          description="Set reminders for meal preparation."
          href="/admin/reminders"
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
