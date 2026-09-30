'use client';
import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  enrichBook,
  enrichTransaction,
  formatDate,
  formatCurrency,
  isDueToday,
} from '@/lib/utils';
import { format } from 'date-fns';
import StatCard from '@/components/ui/StatCard';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import Link from 'next/link';
import {
  BookOpen,
  Users,
  AlertCircle,
  BookMarked,
  CalendarClock,
  BookCheck,
  Plus,
  Bot,
  ArrowLeftRight,
  TrendingUp,
} from 'lucide-react';

export default function DashboardPage() {
  const { state } = useApp();
  const { books, members, transactions, settings } = state;

  const enrichedBooks = useMemo(
    () => books.map((b) => enrichBook(b, transactions)),
    [books, transactions]
  );

  const totalBooks = books.length;
  const availableBooks = enrichedBooks.filter((b) => b.isAvailable).length;
  const issuedBooks = transactions.filter((t) => !t.returnDate).length;
  const totalMembers = members.length;
  const overdueCount = transactions.filter(
    (t) => !t.returnDate && new Date() > new Date(t.dueDate)
  ).length;
  const dueTodayCount = transactions.filter((t) => isDueToday(t)).length;

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => (a.issueDate < b.issueDate ? 1 : -1))
      .slice(0, 8)
      .map((t) => enrichTransaction(t, books, members, settings.finePerDay));
  }, [transactions, books, members, settings.finePerDay]);

  const popularBooks = useMemo(() => {
    return enrichedBooks
      .filter((b) => b.timesBorrowed > 0)
      .sort((a, b) => b.timesBorrowed - a.timesBorrowed)
      .slice(0, 5);
  }, [enrichedBooks]);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Welcome to {settings.libraryName} 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-sm">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        {overdueCount > 0 && (
          <Link href="/overdue">
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium">
              <AlertCircle className="w-4 h-4" />
              {overdueCount} overdue book{overdueCount !== 1 ? 's' : ''}
            </div>
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Books"
          value={totalBooks}
          icon={BookOpen}
          iconColor="text-blue-500"
          iconBg="bg-blue-100 dark:bg-blue-900/40"
        />
        <StatCard
          title="Available"
          value={availableBooks}
          icon={BookCheck}
          iconColor="text-green-500"
          iconBg="bg-green-100 dark:bg-green-900/40"
        />
        <StatCard
          title="Issued"
          value={issuedBooks}
          icon={BookMarked}
          iconColor="text-purple-500"
          iconBg="bg-purple-100 dark:bg-purple-900/40"
        />
        <StatCard
          title="Members"
          value={totalMembers}
          icon={Users}
          iconColor="text-sky-500"
          iconBg="bg-sky-100 dark:bg-sky-900/40"
        />
        <StatCard
          title="Overdue"
          value={overdueCount}
          icon={AlertCircle}
          iconColor={overdueCount > 0 ? 'text-red-500' : 'text-slate-400'}
          iconBg={overdueCount > 0 ? 'bg-red-100 dark:bg-red-900/40' : 'bg-slate-100 dark:bg-slate-700'}
        />
        <StatCard
          title="Due Today"
          value={dueTodayCount}
          icon={CalendarClock}
          iconColor={dueTodayCount > 0 ? 'text-amber-500' : 'text-slate-400'}
          iconBg={dueTodayCount > 0 ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-slate-100 dark:bg-slate-700'}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/books', icon: Plus, label: 'Add Book', color: 'bg-blue-600 hover:bg-blue-700' },
          { href: '/members', icon: Users, label: 'Add Member', color: 'bg-purple-600 hover:bg-purple-700' },
          { href: '/transactions', icon: ArrowLeftRight, label: 'Issue Book', color: 'bg-green-600 hover:bg-green-700' },
          { href: '/assistant', icon: Bot, label: 'Ask AI', color: 'bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500' },
        ].map(({ href, icon: Icon, label, color }) => (
          <Link key={href} href={href}>
            <div className={`${color} text-white rounded-xl p-4 text-center transition-colors cursor-pointer`}>
              <Icon className="w-6 h-6 mx-auto mb-1.5" />
              <span className="text-sm font-medium">{label}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Transactions */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Recent Transactions"
              action={
                <Link href="/transactions">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              }
            />
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">
                No transactions yet.
              </p>
            ) : (
              <div className="space-y-2.5">
                {recentTransactions.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 dark:text-slate-100 text-sm truncate">
                        {t.bookTitle}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {t.memberName} · {formatDate(t.issueDate)}
                      </div>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      {t.returnDate ? (
                        <Badge variant="success" dot>Returned</Badge>
                      ) : t.daysOverdue > 0 ? (
                        <Badge variant="danger" dot>{t.daysOverdue}d overdue</Badge>
                      ) : (
                        <Badge variant="info" dot>Active</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Popular Books */}
        <div>
          <Card>
            <CardHeader
              title="Popular Books"
              action={<TrendingUp className="w-4 h-4 text-slate-400" />}
            />
            {popularBooks.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">
                No borrowing data yet.
              </p>
            ) : (
              <div className="space-y-3">
                {popularBooks.map((book, i) => (
                  <div key={book.id} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400 flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                        {book.title}
                      </div>
                      <div className="text-xs text-slate-400 truncate">{book.author}</div>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
                      {book.timesBorrowed}× borrowed
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
