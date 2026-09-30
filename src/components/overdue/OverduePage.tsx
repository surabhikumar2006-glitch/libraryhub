'use client';
import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { enrichTransaction, formatDate, formatCurrency } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import EmptyState from '@/components/ui/EmptyState';
import { Card, CardHeader } from '@/components/ui/Card';
import StatCard from '@/components/ui/StatCard';
import {
  AlertCircle,
  CheckCircle,
  DollarSign,
  Clock,
  Search,
  PartyPopper,
} from 'lucide-react';
import Input from '@/components/ui/Input';

export default function OverduePage() {
  const { state, markFinePaid } = useApp();
  const [search, setSearch] = useState('');
  const [success, setSuccess] = useState('');

  const overdueTransactions = useMemo(() => {
    return state.transactions
      .filter((t) => !t.returnDate && new Date() > new Date(t.dueDate))
      .map((t) => enrichTransaction(t, state.books, state.members, state.settings.finePerDay))
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [state.transactions, state.books, state.members, state.settings.finePerDay]);

  const unpaidReturnedFines = useMemo(() => {
    return state.transactions
      .filter((t) => t.returnDate && !t.finePaid && (t.fineAmount ?? 0) > 0)
      .map((t) => enrichTransaction(t, state.books, state.members, state.settings.finePerDay))
      .sort((a, b) => b.computedFine - a.computedFine);
  }, [state.transactions, state.books, state.members, state.settings.finePerDay]);

  const filteredOverdue = useMemo(() => {
    const q = search.toLowerCase();
    return overdueTransactions.filter(
      (t) =>
        !q ||
        t.bookTitle.toLowerCase().includes(q) ||
        t.memberName.toLowerCase().includes(q)
    );
  }, [overdueTransactions, search]);

  const filteredUnpaid = useMemo(() => {
    const q = search.toLowerCase();
    return unpaidReturnedFines.filter(
      (t) =>
        !q ||
        t.bookTitle.toLowerCase().includes(q) ||
        t.memberName.toLowerCase().includes(q)
    );
  }, [unpaidReturnedFines, search]);

  const totalOutstandingFines = overdueTransactions.reduce(
    (sum, t) => sum + t.computedFine,
    0
  ) + unpaidReturnedFines.reduce((sum, t) => sum + (t.fineAmount ?? 0), 0);

  const totalFinesCollected = state.transactions
    .filter((t) => t.finePaid && (t.fineAmount ?? 0) > 0)
    .reduce((sum, t) => sum + (t.fineAmount ?? 0), 0);

  const handleMarkPaid = (transactionId: string) => {
    markFinePaid(transactionId);
    setSuccess('Fine marked as paid.');
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          Overdue & Fines
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Track overdue books and manage fine payments
        </p>
      </div>

      {success && <Alert variant="success" message={success} />}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Overdue Books"
          value={overdueTransactions.length}
          icon={AlertCircle}
          iconColor="text-red-500"
          iconBg="bg-red-100 dark:bg-red-900/40"
        />
        <StatCard
          title="Unpaid Fines (returned)"
          value={unpaidReturnedFines.length}
          icon={Clock}
          iconColor="text-amber-500"
          iconBg="bg-amber-100 dark:bg-amber-900/40"
        />
        <StatCard
          title="Outstanding Fines"
          value={formatCurrency(totalOutstandingFines, state.settings.currency)}
          icon={DollarSign}
          iconColor="text-orange-500"
          iconBg="bg-orange-100 dark:bg-orange-900/40"
        />
        <StatCard
          title="Fines Collected"
          value={formatCurrency(totalFinesCollected, state.settings.currency)}
          icon={CheckCircle}
          iconColor="text-green-500"
          iconBg="bg-green-100 dark:bg-green-900/40"
        />
      </div>

      {/* Search */}
      <div className="max-w-sm">
        <Input
          placeholder="Search by book or member..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search className="w-4 h-4" />}
        />
      </div>

      {/* Overdue Table */}
      <Card>
        <CardHeader
          title="Currently Overdue"
          subtitle={`${overdueTransactions.length} unreturned book(s) past due date`}
        />
        {filteredOverdue.length === 0 ? (
          <EmptyState
            icon={PartyPopper as any}
            title={search ? 'No overdue books match your search.' : 'No overdue books. 🎉'}
            description={!search ? "All books are returned on time. Great job!" : undefined}
          />
        ) : (
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Book</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Member</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Date</th>
                  <th className="text-center py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Days</th>
                  <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filteredOverdue.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="py-2.5 pr-4">
                      <div className="font-medium text-slate-800 dark:text-slate-100">{t.bookTitle}</div>
                      <div className="text-xs text-slate-400 sm:hidden">{t.memberName}</div>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-600 dark:text-slate-300 hidden sm:table-cell">
                      {t.memberName}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">
                      {formatDate(t.dueDate)}
                    </td>
                    <td className="py-2.5 pr-4 text-center">
                      <Badge variant="danger">{t.daysOverdue}d</Badge>
                    </td>
                    <td className="py-2.5 text-right">
                      <span className="font-semibold text-red-600 dark:text-red-400">
                        {formatCurrency(t.computedFine, state.settings.currency)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Unpaid Returned Fines */}
      {(filteredUnpaid.length > 0 || search) && (
        <Card>
          <CardHeader
            title="Unpaid Fines (Returned Books)"
            subtitle="Books returned late with outstanding fine payments"
          />
          {filteredUnpaid.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
              No unpaid returned fines found.
            </p>
          ) : (
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Book</th>
                    <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Member</th>
                    <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Returned</th>
                    <th className="text-right py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fine</th>
                    <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filteredUnpaid.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="py-2.5 pr-4">
                        <div className="font-medium text-slate-800 dark:text-slate-100">{t.bookTitle}</div>
                        <div className="text-xs text-slate-400 sm:hidden">{t.memberName}</div>
                      </td>
                      <td className="py-2.5 pr-4 text-slate-600 dark:text-slate-300 hidden sm:table-cell">
                        {t.memberName}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                        {t.returnDate ? formatDate(t.returnDate) : '—'}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-semibold text-amber-600 dark:text-amber-400">
                        {formatCurrency(t.fineAmount ?? 0, state.settings.currency)}
                      </td>
                      <td className="py-2.5 text-right">
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => handleMarkPaid(t.id)}
                          icon={<CheckCircle className="w-3.5 h-3.5" />}
                        >
                          Mark Paid
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
