'use client';
import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { enrichBook, formatDate } from '@/lib/utils';
import { BOOK_CATEGORIES, BookCategory } from '@/types';
import BookForm from './BookForm';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';
import Alert from '@/components/ui/Alert';
import Input from '@/components/ui/Input';
import { Select } from '@/components/ui/Input';
import { Card, CardHeader } from '@/components/ui/Card';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  BookOpen,
  Eye,
  Filter,
} from 'lucide-react';
import Link from 'next/link';

export default function BooksPage() {
  const { state, addBook, updateBook, deleteBook } = useApp();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('');
  const [addOpen, setAddOpen] = useState(false);
  const [editBook, setEditBook] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [opError, setOpError] = useState('');
  const [opSuccess, setOpSuccess] = useState('');

  const enriched = useMemo(
    () => state.books.map((b) => enrichBook(b, state.transactions)),
    [state.books, state.transactions]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return enriched.filter((b) => {
      const matchSearch =
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.isbn.toLowerCase().includes(q);
      const matchCat = !categoryFilter || b.category === categoryFilter;
      const matchAvail =
        !availabilityFilter ||
        (availabilityFilter === 'available' && b.isAvailable) ||
        (availabilityFilter === 'unavailable' && !b.isAvailable);
      return matchSearch && matchCat && matchAvail;
    });
  }, [enriched, search, categoryFilter, availabilityFilter]);

  const editingBook = editBook ? state.books.find((b) => b.id === editBook) : undefined;
  const existingISBNs = state.books.map((b) => b.isbn);

  const handleAdd = (values: Parameters<typeof addBook>[0]) => {
    addBook(values);
    setAddOpen(false);
    setOpSuccess('Book added successfully.');
    setTimeout(() => setOpSuccess(''), 3000);
  };

  const handleEdit = (values: Parameters<typeof addBook>[0]) => {
    if (!editingBook) return;
    updateBook({ ...editingBook, ...values });
    setEditBook(null);
    setOpSuccess('Book updated successfully.');
    setTimeout(() => setOpSuccess(''), 3000);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    const result = deleteBook(deleteId);
    if (!result.ok) {
      setDeleteError(result.reason ?? 'Cannot delete this book.');
      setDeleteId(null);
      return;
    }
    setDeleteId(null);
    setOpSuccess('Book deleted.');
    setTimeout(() => setOpSuccess(''), 3000);
  };

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...BOOK_CATEGORIES.map((c) => ({ value: c, label: c })),
  ];

  const availOptions = [
    { value: '', label: 'Any Availability' },
    { value: 'available', label: 'Available' },
    { value: 'unavailable', label: 'Unavailable' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Book Catalog
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {state.books.length} total books
          </p>
        </div>
        <Button
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setAddOpen(true)}
        >
          Add Book
        </Button>
      </div>

      {opSuccess && <Alert variant="success" message={opSuccess} />}
      {deleteError && (
        <Alert
          variant="error"
          message={deleteError}
        />
      )}

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search by title, author, or ISBN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="w-full sm:w-44">
            <Select
              options={categoryOptions}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-44">
            <Select
              options={availOptions}
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        {filtered.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={
              search || categoryFilter || availabilityFilter
                ? 'No books match your search.'
                : 'No books yet.'
            }
            description={
              search || categoryFilter || availabilityFilter
                ? 'Try adjusting your filters.'
                : 'Add your first book to start building the catalog.'
            }
            action={
              !search && !categoryFilter && !availabilityFilter ? (
                <Button
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => setAddOpen(true)}
                >
                  Add First Book
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
                    Title / Author
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">
                    ISBN
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">
                    Category
                  </th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Copies
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
                {filtered.map((book) => (
                  <tr
                    key={book.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-800 dark:text-slate-100 truncate max-w-xs">
                        {book.title}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                        {book.author} · {book.year}
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-slate-500 dark:text-slate-400 hidden md:table-cell">
                      {book.isbn}
                    </td>
                    <td className="px-3 py-3.5 hidden sm:table-cell">
                      <Badge variant="slate">{book.category}</Badge>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <span className="text-slate-700 dark:text-slate-200 font-medium">
                        {book.availableCopies}
                      </span>
                      <span className="text-slate-400 dark:text-slate-500">
                        /{book.totalCopies}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <Badge
                        variant={book.isAvailable ? 'success' : 'danger'}
                        dot
                      >
                        {book.isAvailable ? 'Available' : 'Unavailable'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/books/${book.id}`}>
                          <Button variant="ghost" size="sm" icon={<Eye className="w-3.5 h-3.5" />} title="View">
                            <span className="sr-only">View</span>
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Edit2 className="w-3.5 h-3.5" />}
                          onClick={() => setEditBook(book.id)}
                          title="Edit"
                        >
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}
                          onClick={() => {
                            setDeleteError('');
                            setDeleteId(book.id);
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

      {/* Add Modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add New Book"
        size="lg"
      >
        <BookForm
          existingISBNs={existingISBNs}
          onSubmit={handleAdd}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={!!editBook}
        onClose={() => setEditBook(null)}
        title="Edit Book"
        size="lg"
      >
        {editingBook && (
          <BookForm
            book={editingBook}
            existingISBNs={existingISBNs}
            onSubmit={handleEdit}
            onCancel={() => setEditBook(null)}
          />
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Book"
        message="Are you sure you want to delete this book? This action cannot be undone."
        confirmLabel="Delete Book"
        variant="danger"
      />
    </div>
  );
}
