'use client';
import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { getUnpaidFines, formatDate, formatCurrency } from '@/lib/utils';
import MemberForm from './MemberForm';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';
import Alert from '@/components/ui/Alert';
import Input from '@/components/ui/Input';
import { Select } from '@/components/ui/Input';
import { Card, CardHeader } from '@/components/ui/Card';
import { Plus, Search, Edit2, Trash2, Users, Eye } from 'lucide-react';
import Link from 'next/link';
import { MemberStatus } from '@/types';

export default function MembersPage() {
  const { state, addMember, updateMember, deleteMember } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [opError, setOpError] = useState('');
  const [opSuccess, setOpSuccess] = useState('');

  const membersWithStats = useMemo(() => {
    return state.members.map((m) => {
      const activeLoans = state.transactions.filter(
        (t) => t.memberId === m.id && !t.returnDate
      ).length;
      const unpaidFines = getUnpaidFines(m.id, state.transactions, state.settings.finePerDay);
      return { ...m, activeLoans, unpaidFines };
    });
  }, [state.members, state.transactions, state.settings.finePerDay]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return membersWithStats.filter((m) => {
      const matchSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.phone.includes(q);
      const matchStatus = !statusFilter || m.status === statusFilter;
      const matchType = !typeFilter || m.membershipType === typeFilter;
      return matchSearch && matchStatus && matchType;
    });
  }, [membersWithStats, search, statusFilter, typeFilter]);

  const editingMember = editId ? state.members.find((m) => m.id === editId) : undefined;
  const existingEmails = state.members.map((m) => m.email);

  const handleAdd = (values: Parameters<typeof addMember>[0]) => {
    addMember(values);
    setAddOpen(false);
    setOpSuccess('Member added successfully.');
    setTimeout(() => setOpSuccess(''), 3000);
  };

  const handleEdit = (values: Parameters<typeof addMember>[0]) => {
    if (!editingMember) return;
    updateMember({ ...editingMember, ...values });
    setEditId(null);
    setOpSuccess('Member updated.');
    setTimeout(() => setOpSuccess(''), 3000);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    const result = deleteMember(deleteId);
    if (!result.ok) {
      setOpError(result.reason ?? 'Cannot delete this member.');
      setDeleteId(null);
      return;
    }
    setDeleteId(null);
    setOpSuccess('Member deleted.');
    setTimeout(() => setOpSuccess(''), 3000);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Members</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {state.members.length} registered members
          </p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>
          Add Member
        </Button>
      </div>

      {opSuccess && <Alert variant="success" message={opSuccess} />}
      {opError && <Alert variant="error" message={opError} />}

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="w-full sm:w-40">
            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'Active', label: 'Active' },
                { value: 'Suspended', label: 'Suspended' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-40">
            <Select
              options={[
                { value: '', label: 'All Types' },
                { value: 'Student', label: 'Student' },
                { value: 'Teacher', label: 'Teacher' },
                { value: 'General', label: 'General' },
              ]}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={
              search || statusFilter || typeFilter
                ? 'No members match your search.'
                : 'No members registered yet.'
            }
            description={
              !search && !statusFilter && !typeFilter
                ? 'Add your first member to get started.'
                : 'Try adjusting your filters.'
            }
            action={
              !search && !statusFilter && !typeFilter ? (
                <Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>
                  Add First Member
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">
                    Contact
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">
                    Type
                  </th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Loans
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filtered.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800 dark:text-slate-100">
                            {member.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Since {formatDate(member.joinDate)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 hidden md:table-cell">
                      <div className="text-slate-600 dark:text-slate-300">{member.email}</div>
                      <div className="text-xs text-slate-400">{member.phone}</div>
                    </td>
                    <td className="px-3 py-3.5 hidden sm:table-cell">
                      <Badge variant={
                        member.membershipType === 'Teacher' ? 'purple' :
                        member.membershipType === 'Student' ? 'info' : 'slate'
                      }>
                        {member.membershipType}
                      </Badge>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {member.activeLoans}
                      </span>
                      {member.unpaidFines > 0 && (
                        <div className="text-xs text-red-500 dark:text-red-400">
                          {formatCurrency(member.unpaidFines, state.settings.currency)} fine
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      <Badge
                        variant={member.status === 'Active' ? 'success' : 'danger'}
                        dot
                      >
                        {member.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/members/${member.id}`}>
                          <Button variant="ghost" size="sm" icon={<Eye className="w-3.5 h-3.5" />} title="View">
                            <span className="sr-only">View</span>
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Edit2 className="w-3.5 h-3.5" />}
                          onClick={() => setEditId(member.id)}
                          title="Edit"
                        >
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}
                          onClick={() => {
                            setOpError('');
                            setDeleteId(member.id);
                          }}
                          title="Delete"
                        >
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modals */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add New Member" size="md">
        <MemberForm
          existingEmails={existingEmails}
          onSubmit={handleAdd}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>

      <Modal open={!!editId} onClose={() => setEditId(null)} title="Edit Member" size="md">
        {editingMember && (
          <MemberForm
            member={editingMember}
            existingEmails={existingEmails}
            onSubmit={handleEdit}
            onCancel={() => setEditId(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Member"
        message="Are you sure you want to delete this member? Their transaction history will remain but they will no longer appear in the system."
        confirmLabel="Delete Member"
        variant="danger"
      />
    </div>
  );
}
