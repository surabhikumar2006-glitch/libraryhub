'use client';
import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { enrichBook, formatCurrency } from '@/lib/utils';
import { format, subMonths, parseISO, isSameMonth } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Card, CardHeader } from '@/components/ui/Card';
import StatCard from '@/components/ui/StatCard';
import { BookOpen, DollarSign, AlertCircle, TrendingUp } from 'lucide-react';

const COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#84cc16',
];

export default function ReportsPage() {
  const { state } = useApp();
  const { books, members, transactions, settings } = state;

  // Monthly issue data (last 12 months)
  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const date = subMonths(new Date(), 11 - i);
      return {
        month: format(date, 'MMM yy'),
        date,
        count: 0,
      };
    });
    transactions.forEach((t) => {
      try {
        const issueDate = parseISO(t.issueDate);
        const monthEntry = months.find((m) => isSameMonth(m.date, issueDate));
        if (monthEntry) monthEntry.count++;
      } catch {}
    });
    return months;
  }, [transactions]);

  // Popular books (top 10)
  const popularBooksData = useMemo(() => {
    return books
      .map((b) => ({
        name: b.title.length > 20 ? b.title.slice(0, 20) + '…' : b.title,
        count: transactions.filter((t) => t.bookId === b.id).length,
      }))
      .filter((b) => b.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [books, transactions]);

  // Category distribution
  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    transactions.forEach((t) => {
      const book = books.find((b) => b.id === t.bookId);
      if (book) {
        cats[book.category] = (cats[book.category] ?? 0) + 1;
      }
    });
    return Object.entries(cats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [books, transactions]);

  // Summary stats
  const totalFinesCollected = transactions
    .filter((t) => t.finePaid && (t.fineAmount ?? 0) > 0)
    .reduce((sum, t) => sum + (t.fineAmount ?? 0), 0);
  const totalOutstandingFines = transactions
    .filter((t) => !t.finePaid && (t.fineAmount ?? 0) > 0)
    .reduce((sum, t) => sum + (t.fineAmount ?? 0), 0);
  const overdueCount = transactions.filter(
    (t) => !t.returnDate && new Date() > new Date(t.dueDate)
  ).length;

  const tooltipStyle = {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--foreground)',
    fontSize: '13px',
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Reports</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Library analytics and summaries
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Issued (All Time)"
          value={transactions.length}
          icon={BookOpen}
          iconColor="text-blue-500"
          iconBg="bg-blue-100 dark:bg-blue-900/40"
        />
        <StatCard
          title="Currently Overdue"
          value={overdueCount}
          icon={AlertCircle}
          iconColor={overdueCount > 0 ? 'text-red-500' : 'text-slate-400'}
          iconBg={overdueCount > 0 ? 'bg-red-100 dark:bg-red-900/40' : 'bg-slate-100 dark:bg-slate-700'}
        />
        <StatCard
          title="Fines Collected"
          value={formatCurrency(totalFinesCollected, settings.currency)}
          icon={DollarSign}
          iconColor="text-green-500"
          iconBg="bg-green-100 dark:bg-green-900/40"
        />
        <StatCard
          title="Outstanding Fines"
          value={formatCurrency(totalOutstandingFines, settings.currency)}
          icon={TrendingUp}
          iconColor={totalOutstandingFines > 0 ? 'text-amber-500' : 'text-slate-400'}
          iconBg={totalOutstandingFines > 0 ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-slate-100 dark:bg-slate-700'}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Monthly Issues */}
        <Card>
          <CardHeader title="Books Issued per Month" subtitle="Last 12 months" />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: 'var(--muted)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--muted)' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--border)', opacity: 0.5 }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Books Issued" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Category Pie */}
        <Card>
          <CardHeader title="Borrowing by Category" subtitle="All time" />
          {categoryData.length === 0 ? (
            <div className="flex items-center justify-center h-60 text-slate-500 text-sm">
              No borrowing data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span style={{ color: 'var(--foreground)', fontSize: 12 }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Popular Books Chart */}
      <Card>
        <CardHeader title="Most Popular Books" subtitle="Top 10 by borrow count" />
        {popularBooksData.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
            No borrowing data yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={popularBooksData}
              layout="vertical"
              margin={{ top: 4, right: 16, bottom: 0, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: 'var(--muted)' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: 'var(--muted)' }}
                tickLine={false}
                axisLine={false}
                width={130}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--border)', opacity: 0.5 }} />
              <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Times Borrowed" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Overdue Report Table */}
      <Card>
        <CardHeader
          title="Overdue Report"
          subtitle={`${overdueCount} book(s) currently overdue`}
        />
        {overdueCount === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">
            No overdue books. Great job! 🎉
          </p>
        ) : (
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Book</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Member</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Date</th>
                  <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {transactions
                  .filter((t) => !t.returnDate && new Date() > new Date(t.dueDate))
                  .map((t) => {
                    const book = books.find((b) => b.id === t.bookId);
                    const member = members.find((m) => m.id === t.memberId);
                    const daysOverdue = Math.floor(
                      (Date.now() - new Date(t.dueDate).getTime()) / 86400000
                    );
                    const fine = daysOverdue * settings.finePerDay;
                    return (
                      <tr key={t.id}>
                        <td className="py-2.5 pr-4 font-medium text-slate-800 dark:text-slate-100">
                          {book?.title ?? 'Unknown'}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-600 dark:text-slate-300 hidden sm:table-cell">
                          {member?.name ?? 'Unknown'}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">
                          {format(parseISO(t.dueDate), 'MMM dd, yyyy')}
                          <span className="ml-2 text-red-500 text-xs">({daysOverdue}d ago)</span>
                        </td>
                        <td className="py-2.5 text-right font-semibold text-red-600 dark:text-red-400">
                          {formatCurrency(fine, settings.currency)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
