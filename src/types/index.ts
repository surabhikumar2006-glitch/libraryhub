// ─── Enums ────────────────────────────────────────────────────────────────────

export type BookCategory =
  | 'Fiction'
  | 'Non-Fiction'
  | 'Science'
  | 'Technology'
  | 'History'
  | 'Biography'
  | 'Children'
  | 'Other';

export type MembershipType = 'Student' | 'Teacher' | 'General';

export type MemberStatus = 'Active' | 'Suspended';

export type TransactionStatus = 'Active' | 'Returned' | 'Overdue';

// ─── Core Models ──────────────────────────────────────────────────────────────

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: BookCategory;
  publisher: string;
  year: number;
  totalCopies: number;
  shelfLocation: string;
  description: string;
  createdAt: string; // ISO date
}

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  membershipType: MembershipType;
  joinDate: string; // ISO date
  status: MemberStatus;
  createdAt: string; // ISO date
}

export interface Transaction {
  id: string;
  bookId: string;
  memberId: string;
  issueDate: string;   // ISO date
  dueDate: string;     // ISO date
  returnDate: string | null;
  renewedAt: string | null;
  status: TransactionStatus;
  fineAmount: number | null;
  finePaid: boolean;
  finePaidDate: string | null;
}

export interface Settings {
  libraryName: string;
  loanPeriodDays: number;
  finePerDay: number;
  borrowLimit: number;
  theme: 'light' | 'dark';
  currency: string;
  aiApiKey: string;
}

// ─── Computed / View Models ───────────────────────────────────────────────────

export interface TransactionWithDetails extends Transaction {
  bookTitle: string;
  bookIsbn: string;
  memberName: string;
  daysOverdue: number;
  computedFine: number;
}

export interface MemberWithStats extends Member {
  activeLoans: number;
  totalBorrowed: number;
  unpaidFines: number;
}

export interface BookWithAvailability extends Book {
  availableCopies: number;
  isAvailable: boolean;
  timesBorrowed: number;
}

// ─── AI Chat ──────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const BOOK_CATEGORIES: BookCategory[] = [
  'Fiction',
  'Non-Fiction',
  'Science',
  'Technology',
  'History',
  'Biography',
  'Children',
  'Other',
];

export const MEMBERSHIP_TYPES: MembershipType[] = ['Student', 'Teacher', 'General'];

export const MEMBER_STATUSES: MemberStatus[] = ['Active', 'Suspended'];

export const DEFAULT_SETTINGS: Settings = {
  libraryName: 'LibraryHub',
  loanPeriodDays: 14,
  finePerDay: 0.5,
  borrowLimit: 3,
  theme: 'light',
  currency: '$',
  aiApiKey: '',
};
