'use client';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { enrichBook, enrichTransaction, formatDate } from '@/lib/utils';
import BookForm from '@/components/books/BookForm';
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
  BookOpen,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, updateBook, deleteBook } = useApp();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const book = state.books.find((b) => b.id === id);
  if (!book) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-slate-500">Book not found.</p>
        <Link href="/books" className="mt-3">
          <Button variant="secondary" icon={<ArrowLeft className="w-4 h-4" />}>
            Back to Books
          </Button>
        </Link>
      </div>
    );
  }

  const enriched = enrichBook(book, state.transactions);
  const bookTransactions = state.transactions
    .filter((t) => t.bookId === id)
    .map((t) => enrichTransaction(t, state.books, state.members, state.settings.finePerDay))
    .sort((a, b) => (a.issueDate < b.issueDate ? 1 : -1));

  const handleEdit = (values: Omit<typeof book, 'id' | 'createdAt'>) => {
    updateBook({ ...book, ...(values as typeof book) });
    setEditOpen(false);
    setSuccess('Book updated.');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDelete = () => {
    const result = deleteBook(book.id);
    if (!result.ok) {
      setDeleteOpen(false);
      setError(result.reason ?? 'Cannot delete.');
      return;
    }
    router.push('/books');
  };

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Back + Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link href="/books">
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
            Back to Books
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Edit2 className="w-4 h-4" />}
            onClick={() => setEditOpen(true)}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={<Trash2 className="w-4 h-4" />}
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      {success && <Alert variant="success" message={success} />}
      {error && <Alert variant="error" message={error} />}

      {/* Book Info */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-5">
          <div className="w-24 h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 self-start">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  {book.title}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  by {book.author}
                </p>
              </div>
              <Badge variant={enriched.isAvailable ? 'success' : 'danger'} dot>
                {enriched.isAvailable
                  ? `${enriched.availableCopies} Available`
                  : 'Not Available'}
              </Badge>
            </div>
            {book.description && (
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
                {book.description}
              </p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-sm">
              {[
                ['ISBN', book.isbn],
                ['Category', book.category],
                ['Publisher', book.publisher],
                ['Year', String(book.year)],
                ['Shelf', book.shelfLocation],
                ['Copies', `${enriched.availableCopies} / ${book.totalCopies}`],
              ].map(([label, val]) => (
                <div key={label}>
                  <div className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider mb-0.5">
                    {label}
                  </div>
                  <div className="text-slate-700 dark:text-slate-200 font-medium">
                    {val}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader title="Borrowing History" subtitle={`${bookTransactions.length} transaction(s)`} />
        {bookTransactions.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
            This book has never been borrowed.
          </p>
        ) : (
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Issued
                  </th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Due
                  </th>
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {bookTransactions.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2.5 pr-4 text-slate-700 dark:text-slate-200">
                      {t.memberName}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">
                      {formatDate(t.issueDate)}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">
                      {formatDate(t.dueDate)}
                    </td>
                    <td className="py-2.5 pr-4">
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
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Book" size="lg">
        <BookForm
          book={book}
          existingISBNs={state.books.map((b) => b.isbn)}
          onSubmit={(v) => handleEdit(v as any)}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Book"
        message={`Delete "${book.title}"? All borrowing history will remain but the book will no longer appear in the catalog.`}
        confirmLabel="Delete Book"
        variant="danger"
      />
    </div>
  );
}
