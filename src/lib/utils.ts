import {
  differenceInDays,
  parseISO,
  isAfter,
  isEqual,
  format,
  addDays,
} from 'date-fns';
import {
  Transaction,
  Book,
  Member,
  Settings,
  TransactionWithDetails,
  BookWithAvailability,
} from '@/types';

// ─── Date Helpers ─────────────────────────────────────────────────────────────

export function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM dd, yyyy');
  } catch {
    return dateStr;
  }
}

export function formatCurrency(amount: number, currency = '$'): string {
  return `${currency}${amount.toFixed(2)}`;
}

// ─── Business Logic ───────────────────────────────────────────────────────────

export function getDueDate(issueDate: string, loanPeriodDays: number): string {
  return format(addDays(parseISO(issueDate), loanPeriodDays), 'yyyy-MM-dd');
}

export function isOverdue(transaction: Transaction): boolean {
  if (transaction.returnDate) return false;
  const due = parseISO(transaction.dueDate);
  const now = today();
  return isAfter(now, due);
}

export function isDueToday(transaction: Transaction): boolean {
  if (transaction.returnDate) return false;
  const due = parseISO(transaction.dueDate);
  const now = today();
  return isEqual(due, now);
}

export function getDaysOverdue(transaction: Transaction): number {
  if (transaction.returnDate) {
    // Fine at return time
    const returnDate = parseISO(transaction.returnDate);
    const dueDate = parseISO(transaction.dueDate);
    if (isAfter(returnDate, dueDate)) {
      return differenceInDays(returnDate, dueDate);
    }
    return 0;
  }
  const due = parseISO(transaction.dueDate);
  const now = today();
  if (isAfter(now, due)) {
    return differenceInDays(now, due);
  }
  return 0;
}

export function calculateFine(
  transaction: Transaction,
  finePerDay: number
): number {
  const days = getDaysOverdue(transaction);
  return Math.round(days * finePerDay * 100) / 100;
}

export function canBorrow(
  member: Member,
  activeTransactions: Transaction[],
  borrowLimit: number
): { ok: boolean; reason?: string } {
  if (member.status === 'Suspended') {
    return { ok: false, reason: 'Member account is suspended.' };
  }
  const activeLoanCount = activeTransactions.filter(
    (t) => t.memberId === member.id && !t.returnDate
  ).length;
  if (activeLoanCount >= borrowLimit) {
    return {
      ok: false,
      reason: `Member has reached the borrow limit of ${borrowLimit} book(s).`,
    };
  }
  return { ok: true };
}

export function canRenew(
  transaction: Transaction
): { ok: boolean; reason?: string } {
  if (transaction.renewedAt) {
    return { ok: false, reason: 'This loan has already been renewed once.' };
  }
  if (isOverdue(transaction)) {
    return { ok: false, reason: 'Overdue loans cannot be renewed.' };
  }
  if (transaction.returnDate) {
    return { ok: false, reason: 'This book has already been returned.' };
  }
  return { ok: true };
}

// ─── Computed Views ───────────────────────────────────────────────────────────

export function getAvailableCopies(book: Book, transactions: Transaction[]): number {
  const activeCount = transactions.filter(
    (t) => t.bookId === book.id && !t.returnDate
  ).length;
  return Math.max(0, book.totalCopies - activeCount);
}

export function enrichBook(
  book: Book,
  transactions: Transaction[]
): BookWithAvailability {
  const availableCopies = getAvailableCopies(book, transactions);
  const timesBorrowed = transactions.filter((t) => t.bookId === book.id).length;
  return {
    ...book,
    availableCopies,
    isAvailable: availableCopies > 0,
    timesBorrowed,
  };
}

export function enrichTransaction(
  transaction: Transaction,
  books: Book[],
  members: Member[],
  finePerDay: number
): TransactionWithDetails {
  const book = books.find((b) => b.id === transaction.bookId);
  const member = members.find((m) => m.id === transaction.memberId);
  const daysOverdue = getDaysOverdue(transaction);
  const computedFine =
    transaction.fineAmount !== null
      ? transaction.fineAmount
      : calculateFine(transaction, finePerDay);

  return {
    ...transaction,
    bookTitle: book?.title ?? 'Unknown Book',
    bookIsbn: book?.isbn ?? '',
    memberName: member?.name ?? 'Unknown Member',
    daysOverdue,
    computedFine,
  };
}

export function getUnpaidFines(
  memberId: string,
  transactions: Transaction[],
  finePerDay: number
): number {
  return transactions
    .filter((t) => t.memberId === memberId && !t.finePaid)
    .reduce((sum, t) => {
      const fine =
        t.fineAmount !== null
          ? t.fineAmount
          : calculateFine(t, finePerDay);
      return sum + fine;
    }, 0);
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
