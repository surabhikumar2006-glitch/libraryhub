'use client';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  enrichTransaction,
  formatDate,
  formatCurrency,
  getUnpaidFines,
} from '@/lib/utils';
import MemberForm from '@/components/members/MemberForm';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Alert from '@/components/ui/Alert';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  DollarSign,
} from 'lucide-react';
import Link from 'next/link';

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, updateMember, deleteMember, markFinePaid } = useApp();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const member = state.members.find((m) => m.id === id);

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-slate-500">Member not found.</p>
        <Link href="/members" className="mt-3">
          <Button variant="secondary" icon={<ArrowLeft className="w-4 h-4" />}>
            Back to Members
          </Button>
        </Link>
      </div>
    );
  }

  const memberTransactions = state.transactions
    .filter((t) => t.memberId === id)
    .map((t) =>
      enrichTransaction(t, state.books, state.members, state.settings.finePerDay)
    )
    .sort((a, b) => (a.issueDate < b.issueDate ? 1 : -1));

  const activeLoans = memberTransactions.filter((t) => !t.returnDate);
  const history = memberTransactions.filter((t) => t.returnDate);
  const unpaidFines = getUnpaidFines(id, state.transactions, state.settings.finePerDay);
  const totalFinesEver = memberTransactions.reduce(
    (sum, t) => sum + (t.fineAmount ?? 0),
    0
  );

  const handleEdit = (values: any) => {
    updateMember({ ...member, ...values });
    setEditOpen(false);
    setSuccess('Member updated.');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDelete = () => {
    const result = deleteMember(member.id);
    if (!result.ok) {
      setDeleteOpen(false);
      setError(result.reason ?? 'Cannot delete.');
      return;
    }
    router.push('/members');
  };

  const handleMarkPaid = (transactionId: string) => {
    markFinePaid(transactionId);
    setSuccess('Fine marked as paid.');
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Back + Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link href="/members">
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
            Back to Members
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<Edit2 className="w-4 h-4" />} onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          <Button variant="danger" size="sm" icon={<Trash2 className="w-4 h-4" />} onClick={() => setDeleteOpen(true)}>
            Delete
          </Button>
        </div>
      </div>

      {success && <Alert variant="success" message={success} />}
      {error && <Alert variant="error" message={error} />}

      {/* Profile Card */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-5">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0 self-start">
            {member.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{member.name}</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                  {member.membershipType} Member
                </p>
              </div>
              <Badge variant={member.status === 'Active' ? 'success' : 'danger'} dot>
                {member.status}
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-sm">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="truncate">{member.email}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>{member.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Joined {formatDate(member.joinDate)}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <BookOpen className="w-4 h-4 text-slate-400" />
                <span>{activeLoans.length} active loan(s)</span>
              </div>
            </div>
            {unpaidFines > 0 && (
              <div className="mt-3">
                <Alert
                  variant="warning"
                  message={`Unpaid fines: ${formatCurrency(unpaidFines, state.settings.currency)}`}
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Active Loans */}
      <Card>
        <CardHeader title="Active Loans" subtitle={`${activeLoans.length} book(s) currently borrowed`} />
        {activeLoans.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
            No active loans.
          </p>
        ) : (
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Book</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Date</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {activeLoans.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2.5 pr-4 font-medium text-slate-800 dark:text-slate-100">{t.bookTitle}</td>
                    <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">{formatDate(t.dueDate)}</td>
                    <td className="py-2.5 pr-4">
                      {t.daysOverdue > 0 ? (
                        <Badge variant="danger" dot>{t.daysOverdue}d overdue</Badge>
                      ) : (
                        <Badge variant="info" dot>On Time</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Borrowing History + Fines */}
      <Card>
        <CardHeader
          title="Borrowing History"
          subtitle={`${history.length} returned book(s) · ${formatCurrency(totalFinesEver, state.settings.currency)} total fines`}
        />
        {history.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">No history yet.</p>
        ) : (
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Book</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Returned</th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fine</th>
                  <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fine Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {history.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2.5 pr-4 text-slate-700 dark:text-slate-200">{t.bookTitle}</td>
                    <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                      {t.returnDate ? formatDate(t.returnDate) : '—'}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-700 dark:text-slate-200">
                      {t.fineAmount !== null
                        ? formatCurrency(t.fineAmount, state.settings.currency)
                        : '—'}
                    </td>
                    <td className="py-2.5">
                      {(t.fineAmount ?? 0) === 0 ? (
                        <Badge variant="slate">No Fine</Badge>
                      ) : t.finePaid ? (
                        <Badge variant="success">Paid</Badge>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge variant="warning">Unpaid</Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkPaid(t.id)}
                          >
                            Mark Paid
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Member" size="md">
        <MemberForm
          member={member}
          existingEmails={state.members.map((m) => m.email)}
          onSubmit={handleEdit}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>

      {/* Delete */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Member"
        message={`Delete ${member.name}? This cannot be undone.`}
        confirmLabel="Delete Member"
        variant="danger"
      />
    </div>
  );
}
