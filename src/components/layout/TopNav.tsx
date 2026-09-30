'use client';
import { Menu, Sun, Moon, Bell } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { format } from 'date-fns';

interface TopNavProps {
  onMenuClick: () => void;
}

export default function TopNav({ onMenuClick }: TopNavProps) {
  const { state, updateSettings } = useApp();
  const { settings, books, members, transactions } = state;

  const isDark = settings.theme === 'dark';

  const toggleTheme = () => {
    updateSettings({ ...settings, theme: isDark ? 'light' : 'dark' });
  };

  const overdueCount = transactions.filter(
    (t) => !t.returnDate && new Date() > new Date(t.dueDate)
  ).length;

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between h-14 px-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      {/* Left: hamburger + page context */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </span>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {overdueCount > 0 && (
          <a
            href="/overdue"
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 font-medium hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
          >
            <Bell className="w-3.5 h-3.5" />
            {overdueCount} overdue
          </a>
        )}

        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Librarian avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
            L
          </div>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200 hidden sm:block">
            Librarian
          </span>
        </div>
      </div>
    </header>
  );
}
