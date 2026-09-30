'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Book, BOOK_CATEGORIES } from '@/types';
import Input, { Textarea, Select } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';

const currentYear = new Date().getFullYear();

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  author: z.string().min(1, 'Author is required').max(200),
  isbn: z
    .string()
    .min(1, 'ISBN is required')
    .max(20, 'ISBN too long')
    .regex(/^[\d\-X ]+$/, 'ISBN must contain only digits, hyphens, or X'),
  category: z.enum(BOOK_CATEGORIES as [string, ...string[]]),
  publisher: z.string().min(1, 'Publisher is required').max(200),
  year: z
    .number({ invalid_type_error: 'Year must be a number' })
    .int()
    .min(1000, 'Year must be after 1000')
    .max(currentYear, `Year cannot be in the future`),
  totalCopies: z
    .number({ invalid_type_error: 'Must be a number' })
    .int()
    .min(1, 'Must have at least 1 copy'),
  shelfLocation: z.string().min(1, 'Shelf location is required').max(50),
  description: z.string().max(1000),
});

type FormValues = z.infer<typeof schema>;

interface BookFormProps {
  book?: Book;
  existingISBNs: string[];
  onSubmit: (values: Omit<Book, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function BookForm({
  book,
  existingISBNs,
  onSubmit,
  onCancel,
  loading = false,
}: BookFormProps) {
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: book?.title ?? '',
      author: book?.author ?? '',
      isbn: book?.isbn ?? '',
      category: book?.category ?? ('Fiction' as string),
      publisher: book?.publisher ?? '',
      year: book?.year ?? currentYear,
      totalCopies: book?.totalCopies ?? 1,
      shelfLocation: book?.shelfLocation ?? '',
      description: book?.description ?? '',
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleFormSubmit = (values: any) => {
    setServerError('');
    // ISBN uniqueness check
    const isDuplicate = existingISBNs.some(
      (isbn) => isbn === values.isbn && isbn !== book?.isbn
    );
    if (isDuplicate) {
      setServerError('A book with this ISBN already exists. Please use a unique ISBN.');
      return;
    }
    onSubmit(values as Omit<Book, 'id' | 'createdAt'>);
  };

  const categoryOptions = BOOK_CATEGORIES.map((c) => ({ value: c, label: c }));

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {serverError && <Alert variant="error" message={serverError} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Input
            label="Title"
            required
            {...register('title')}
            error={errors.title?.message}
            placeholder="e.g. Clean Code"
          />
        </div>
        <Input
          label="Author"
          required
          {...register('author')}
          error={errors.author?.message}
          placeholder="e.g. Robert C. Martin"
        />
        <Input
          label="ISBN"
          required
          {...register('isbn')}
          error={errors.isbn?.message}
          placeholder="e.g. 978-0132350884"
        />
        <Select
          label="Category"
          required
          {...register('category')}
          options={categoryOptions}
          error={errors.category?.message}
        />
        <Input
          label="Publisher"
          required
          {...register('publisher')}
          error={errors.publisher?.message}
          placeholder="e.g. Prentice Hall"
        />
        <Input
          label="Year"
          type="number"
          required
          {...register('year', { valueAsNumber: true })}
          error={errors.year?.message}
          placeholder={String(currentYear)}
        />
        <Input
          label="Total Copies"
          type="number"
          required
          min={1}
          {...register('totalCopies', { valueAsNumber: true })}
          error={errors.totalCopies?.message}
        />
        <Input
          label="Shelf Location"
          required
          {...register('shelfLocation')}
          error={errors.shelfLocation?.message}
          placeholder="e.g. T-01"
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Description"
            {...register('description')}
            error={errors.description?.message}
            placeholder="Brief description of the book..."
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={loading}>
          {book ? 'Update Book' : 'Add Book'}
        </Button>
      </div>
    </form>
  );
}
