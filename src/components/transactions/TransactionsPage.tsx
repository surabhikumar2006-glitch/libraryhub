'use client';
import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  enrichBook,
  enrichTransaction,
  formatDate,
  formatCurrency,
} from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Input from '@/components/ui/Input';
import { Card, CardHeader } from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import {
  ArrowLeftRight,
  BookPlus,
  RotateCcw,
  RefreshCw,
  Search,
  Check,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Select } from '@/components/ui/Input';

type ActiveTab = 'issue' | 'return' | 'history';

export default function TransactionsPage() {
  const { state, issueBook, returnBook, renewBook, markFinePaid } = useApp();
  const [activeTab, setActiveTab] = useState<ActiveTab>('issue');

  // Issue state
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [bookSearch, setBookSearch] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('');
  const [issueResult, setIssueResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // Return state
  const [returnSearch, setReturnSearch] = useState('');
  const [returnResult, setReturnResult] = useState<{
    ok: boolean;
    message: string;
    fine?: number;
  } | null>(null);

  // History state
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState('');

  // Derived
  const memberResults = useMemo(() => {
    const q = memberSearch.toLowerCase();
    if (!q) return state.members.slice(0, 8);
    return state.members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
    );
  }, [state.members, memberSearch]);

  const selectedMember = state.members.find((m) => m.id === selectedMemberId);

  const availableBooks = useMemo(() => {
    return state.books
      .map((b) => enrichBook(b, state.transactions))
      .filter((b) => {
        const q = bookSearch.toLowerCase();
        const matchSearch =
          !q ||
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.isbn.toLowerCase().includes(q);
        return matchSearch;
      });
  }, [state.books, state.transactions, bookSearch]);

  const activeTransactions = useMemo(() => {
    return state.transactions
      .filter((t) => !t.returnDate)
      .map((t) =>
        enrichTransaction(t, state.books, state.members, state.settings.finePerDay)
      )
      .filter((t) => {
        const q = returnSearch.toLowerCase();
        return (
          !q ||
          t.bookTitle.toLowerCase().includes(q) ||
          t.memberName.toLowerCase().includes(q) ||
          t.bookIsbn.toLowerCase().includes(q)
        );
      });
  }, [state.transactions, state.books, state.members, state.settings.finePerDay, returnSearch]);

  const allTransactions = useMemo(() => {
    return state.transactions
      .map((t) =>
        enrichTransaction(t, state.books, state.members, state.settings.finePerDay)
      )
      .filter((t) => {
        const q = historySearch.toLowerCase();
        const matchSearch =
          !q ||
          t.bookTitle.toLowerCase().includes(q) ||
          t.memberName.toLowerCase().includes(q);
        const matchFilter =
          !historyFilter ||
          (historyFilter === 'active' && !t.returnDate && t.daysOverdue === 0) ||
          (historyFilter === 'overdue' && !t.returnDate && t.daysOverdue > 0) ||
          (historyFilter === 'returned' && !!t.returnDate);
        return matchSearch && matchFilter;
      })
      .sort((a, b) => (a.issueDate < b.issueDate ? 1 : -1));
  }, [state.transactions, state.books, state.members, state.settings.finePerDay, historySearch, historyFilter]);

  const handleIssue = () => {
    setIssueResult(null);
    if (!selectedMemberId) {
      setIssueResult({ ok: false, message: 'Please select a member.' });
      return;
    }
    if (!selectedBookId) {
      setIssueResult({ ok: false, message: 'Please select a book.' });
      return;
    }
    const result = issueBook(selectedBookId, selectedMemberId);
    if (result.ok) {
      setIssueResult({
        ok: true,
        message: `Book issued successfully! Due date: ${formatDate(result.transaction!.dueDate)}`,
      });
      setSelectedMemberId('');
      setSelectedBookId('');
      setMemberSearch('');
      setBookSearch('');
    } else {
      setIssueResult({ ok: false, message: result.reason ?? 'Failed to issue book.' });
    }
  };

  const handleReturn = (transactionId: string) => {
    setReturnResult(null);
    const result = returnBook(transactionId);
    if (result.ok) {
      const fine = result.fine ?? 0;
      setReturnResult({
        ok: true,
        message:
          fine > 0
            ? `Book returned. Fine of ${formatCurrency(fine, state.settings.currency)} has been applied.`
            : 'Book returned successfully. No fine.',
        fine,
      });
    } else {
      setReturnResult({ ok: false, message: result.reason ?? 'Failed to return book.' });
    }
  };

  const handleRenew = (transactionId: string) => {
    const result = renewBook(transactionId);
    if (result.ok) {
      setReturnResult({ ok: true, message: 'Book renewed successfully!' });
    } else {
      setReturnResult({ ok: false, message: result.reason ?? 'Cannot renew.' });
    }
  };

  const tabs: { id: ActiveTab; label: string; icon: React.FC<any> }[] = [
    { id: 'issue', label: 'Issue Book', icon: BookPlus },
    { id: 'return', label: 'Return / Renew', icon: RotateCcw },
    { id: 'history', label: 'All Transactions', icon: ArrowLeftRight },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          Issue & Return
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Manage book loans, returns, and renewals
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setActiveTab(id);
              setIssueResult(null);
              setReturnResult(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === id
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ─── ISSUE TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'issue' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Step 1: Select Member */}
          <Card>
            <CardHeader title="Step 1: Select Member" />
            <Input
              placeholder="Search members by name or email..."
              value={memberSearch}
              onChange={(e) => {
                setMemberSearch(e.target.value);
                setSelectedMemberId('');
              }}
              icon={<Search className="w-4 h-4" />}
            />
            <div className="mt-3 space-y-1.5 max-h-60 overflow-y-auto">
              {memberResults.map((m) => {
                const activeCount = state.transactions.filter(
                  (t) => t.memberId === m.id && !t.returnDate
                ).length;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMemberId(m.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                      selectedMemberId === m.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-slate-800 dark:text-slate-100 text-sm">
                          {m.name}
                        </span>
                        <span className="text-xs text-slate-400 ml-2">{m.membershipType}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={m.status === 'Active' ? 'success' : 'danger'} dot>
                          {m.status}
                        </Badge>
                        <span className="text-xs text-slate-400">{activeCount} loans</span>
                        {selectedMemberId === m.id && (
                          <Check className="w-4 h-4 text-blue-500" />
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{m.email}</div>
                  </button>
                );
              })}
              {memberResults.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                  No members found.
                </p>
              )}
            </div>
          </Card>

          {/* Step 2: Select Book */}
          <Card>
            <CardHeader title="Step 2: Select Book" />
            <Input
              placeholder="Search books by title, author, or ISBN..."
              value={bookSearch}
              onChange={(e) => {
                setBookSearch(e.target.value);
                setSelectedBookId('');
              }}
              icon={<Search className="w-4 h-4" />}
            />
            <div className="mt-3 space-y-1.5 max-h-60 overflow-y-auto">
              {availableBooks.map((book) => (
                <button
                  key={book.id}
                  onClick={() => setSelectedBookId(book.id)}
                  disabled={!book.isAvailable}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    selectedBookId === book.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-slate-800 dark:text-slate-100 text-sm">
                        {book.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={book.isAvailable ? 'success' : 'danger'} dot>
                        {book.availableCopies}/{book.totalCopies}
                      </Badge>
                      {selectedBookId === book.id && (
                        <Check className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {book.author} · {book.category}
                  </div>
                </button>
              ))}
              {availableBooks.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                  No books found.
                </p>
              )}
            </div>
          </Card>

          {/* Step 3: Confirm */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader title="Step 3: Confirm Issue" />
              {issueResult && (
                <div className="mb-4">
                  <Alert
                    variant={issueResult.ok ? 'success' : 'error'}
                    message={issueResult.message}
                  />
                </div>
              )}
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 text-center sm:text-left">
                  {selectedMember ? (
                    <div className="text-sm">
                      <span className="text-slate-500">Member: </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        {selectedMember.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">No member selected</span>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 hidden sm:block" />
                <div className="flex-1 text-center sm:text-left">
                  {selectedBookId ? (
                    <div className="text-sm">
                      <span className="text-slate-500">Book: </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        {state.books.find((b) => b.id === selectedBookId)?.title}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">No book selected</span>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 hidden sm:block" />
                <div className="text-sm text-slate-500">
                  Due in{' '}
                  <strong className="text-slate-800 dark:text-slate-100">
                    {state.settings.loanPeriodDays} days
                  </strong>
                </div>
                <Button
                  onClick={handleIssue}
                  disabled={!selectedMemberId || !selectedBookId}
                  icon={<BookPlus className="w-4 h-4" />}
                >
                  Issue Book
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ─── RETURN TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'return' && (
        <div className="space-y-4">
          {returnResult && (
            <Alert
              variant={returnResult.ok ? 'success' : 'error'}
              message={returnResult.message}
            />
          )}
          <Card>
            <CardHeader
              title="Active Loans"
              subtitle="Select a loan to return or renew"
              action={
                <Input
                  placeholder="Search..."
                  value={returnSearch}
                  onChange={(e) => setReturnSearch(e.target.value)}
                  icon={<Search className="w-4 h-4" />}
                  className="w-56"
                />
              }
            />
            {activeTransactions.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
                No active loans found.
              </p>
            ) : (
              <div className="table-scroll">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Book</th>
                      <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Member</th>
                      <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Date</th>
                      <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {activeTransactions.map((t) => (
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
                        <td className="py-2.5 pr-4">
                          {t.daysOverdue > 0 ? (
                            <Badge variant="danger" dot>
                              {t.daysOverdue}d overdue · {formatCurrency(t.computedFine, state.settings.currency)} fine
                            </Badge>
                          ) : t.renewedAt ? (
                            <Badge variant="info" dot>Renewed</Badge>
                          ) : (
                            <Badge variant="success" dot>On Time</Badge>
                          )}
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleReturn(t.id)}
                              icon={<RotateCcw className="w-3.5 h-3.5" />}
                            >
                              Return
                            </Button>
                            {!t.renewedAt && t.daysOverdue === 0 && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleRenew(t.id)}
                                icon={<RefreshCw className="w-3.5 h-3.5" />}
                              >
                                Renew
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ─── HISTORY TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <Card>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Search by book or member..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { value: '', label: 'All' },
                  { value: 'active', label: 'Active' },
                  { value: 'overdue', label: 'Overdue' },
                  { value: 'returned', label: 'Returned' },
                ]}
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value)}
              />
            </div>
          </div>
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Book</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Member</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Issued</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Due</th>
                  <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {allTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="py-2.5 pr-4">
                      <div className="font-medium text-slate-800 dark:text-slate-100">{t.bookTitle}</div>
                      <div className="text-xs text-slate-400 sm:hidden">{t.memberName}</div>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-600 dark:text-slate-300 hidden sm:table-cell">{t.memberName}</td>
                    <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">{formatDate(t.issueDate)}</td>
                    <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">{formatDate(t.dueDate)}</td>
                    <td className="py-2.5">
                      {t.returnDate ? (
                        <Badge variant="success" dot>Returned</Badge>
                      ) : t.daysOverdue > 0 ? (
                        <Badge variant="danger" dot>{t.daysOverdue}d overdue</Badge>
                      ) : (
                        <Badge variant="info" dot>Active</Badge>
                      )}
                    </td>
                  </tr>
                ))}
                {allTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                      No transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
