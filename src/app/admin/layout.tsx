'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

const tabs = [
  { name: 'Meals', href: '/admin/meals' },
  { name: 'Ingredients', href: '/admin/ingredients' },
  { name: 'Meal Plan', href: '/admin/meal-plan' },
  { name: 'Meal Ingredients', href: '/admin/meal-ingredients' },
  { name: 'Reminders', href: '/admin/reminders' },
  { name: 'Countdowns', href: '/admin/countdowns' },
  { name: 'Shopping List', href: '/admin/shopping-list' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">MurrayDash Admin</h1>
          <div className="flex items-center gap-4">
            {session?.user && (
              <span className="text-sm text-gray-400">{session.user.email}</span>
            )}
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700 px-6">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.name}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-6">
        {children}
      </main>
    </div>
  );
}
