'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
  useMemo,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import {
  Book,
  Member,
  Transaction,
  Settings,
  DEFAULT_SETTINGS,
} from '@/types';
import { getInitialData } from '@/lib/seed-data';
import {
  getDueDate,
  calculateFine,
  getDaysOverdue,
  isOverdue,
  getUnpaidFines,
} from '@/lib/utils';

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const KEYS = {
  books: 'lh:books',
  members: 'lh:members',
  transactions: 'lh:transactions',
  settings: 'lh:settings',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded – ignore silently
  }
}

// ─── State Shape ──────────────────────────────────────────────────────────────

interface AppState {
  books: Book[];
  members: Member[];
  transactions: Transaction[];
  settings: Settings;
  initialized: boolean;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'INIT'; payload: Omit<AppState, 'initialized'> }
  | { type: 'ADD_BOOK'; payload: Book }
  | { type: 'UPDATE_BOOK'; payload: Book }
  | { type: 'DELETE_BOOK'; payload: string }
  | { type: 'ADD_MEMBER'; payload: Member }
  | { type: 'UPDATE_MEMBER'; payload: Member }
  | { type: 'DELETE_MEMBER'; payload: string }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
  | { type: 'UPDATE_SETTINGS'; payload: Settings }
  | { type: 'CLEAR_ALL' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'INIT':
      return { ...action.payload, initialized: true };

    case 'ADD_BOOK':
      return { ...state, books: [...state.books, action.payload] };
    case 'UPDATE_BOOK':
      return {
        ...state,
        books: state.books.map((b) =>
          b.id === action.payload.id ? action.payload : b
        ),
      };
    case 'DELETE_BOOK':
      return {
        ...state,
        books: state.books.filter((b) => b.id !== action.payload),
      };

    case 'ADD_MEMBER':
      return { ...state, members: [...state.members, action.payload] };
    case 'UPDATE_MEMBER':
      return {
        ...state,
        members: state.members.map((m) =>
          m.id === action.payload.id ? action.payload : m
        ),
      };
    case 'DELETE_MEMBER':
      return {
        ...state,
        members: state.members.filter((m) => m.id !== action.payload),
      };

    case 'ADD_TRANSACTION':
      return {
        ...state,
        transactions: [...state.transactions, action.payload],
      };
    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t.id === action.payload.id ? action.payload : t
        ),
      };

    case 'UPDATE_SETTINGS':
      return { ...state, settings: action.payload };

    case 'CLEAR_ALL': {
      const seed = getInitialData();
      return { ...seed, initialized: true };
    }

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  // Books
  addBook: (book: Omit<Book, 'id' | 'createdAt'>) => Book;
  updateBook: (book: Book) => void;
  deleteBook: (id: string) => { ok: boolean; reason?: string };
  // Members
  addMember: (member: Omit<Member, 'id' | 'createdAt'>) => Member;
  updateMember: (member: Member) => void;
  deleteMember: (id: string) => { ok: boolean; reason?: string };
  // Transactions
  issueBook: (
    bookId: string,
    memberId: string
  ) => { ok: boolean; reason?: string; transaction?: Transaction };
  returnBook: (
    transactionId: string
  ) => { ok: boolean; reason?: string; fine?: number };
  renewBook: (
    transactionId: string
  ) => { ok: boolean; reason?: string };
  markFinePaid: (transactionId: string) => void;
  // Settings
  updateSettings: (settings: Settings) => void;
  clearAllData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    books: [],
    members: [],
    transactions: [],
    settings: DEFAULT_SETTINGS,
    initialized: false,
  });

  // Load from localStorage on mount (client only)
  useEffect(() => {
    const seed = getInitialData();
    const books = loadFromStorage(KEYS.books, seed.books);
    const members = loadFromStorage(KEYS.members, seed.members);
    const transactions = loadFromStorage(KEYS.transactions, seed.transactions);
    const settings = loadFromStorage(KEYS.settings, seed.settings);
    dispatch({ type: 'INIT', payload: { books, members, transactions, settings } });
  }, []);

  // Persist whenever state changes
  useEffect(() => {
    if (!state.initialized) return;
    saveToStorage(KEYS.books, state.books);
    saveToStorage(KEYS.members, state.members);
    saveToStorage(KEYS.transactions, state.transactions);
    saveToStorage(KEYS.settings, state.settings);
  }, [state]);

  // ── Book Operations ──────────────────────────────────────────────────────────

  const addBook = useCallback(
    (book: Omit<Book, 'id' | 'createdAt'>): Book => {
      const newBook: Book = {
        ...book,
        id: uuidv4(),
        createdAt: format(new Date(), 'yyyy-MM-dd'),
      };
      dispatch({ type: 'ADD_BOOK', payload: newBook });
      return newBook;
    },
    []
  );

  const updateBook = useCallback((book: Book) => {
    dispatch({ type: 'UPDATE_BOOK', payload: book });
  }, []);

  const deleteBook = useCallback(
    (id: string): { ok: boolean; reason?: string } => {
      const hasActive = state.transactions.some(
        (t) => t.bookId === id && !t.returnDate
      );
      if (hasActive) {
        return {
          ok: false,
          reason: 'Cannot delete — one or more copies of this book are currently issued.',
        };
      }
      dispatch({ type: 'DELETE_BOOK', payload: id });
      return { ok: true };
    },
    [state.transactions]
  );

  // ── Member Operations ────────────────────────────────────────────────────────

  const addMember = useCallback(
    (member: Omit<Member, 'id' | 'createdAt'>): Member => {
      const newMember: Member = {
        ...member,
        id: uuidv4(),
        createdAt: format(new Date(), 'yyyy-MM-dd'),
      };
      dispatch({ type: 'ADD_MEMBER', payload: newMember });
      return newMember;
    },
    []
  );

  const updateMember = useCallback((member: Member) => {
    dispatch({ type: 'UPDATE_MEMBER', payload: member });
  }, []);

  const deleteMember = useCallback(
    (id: string): { ok: boolean; reason?: string } => {
      const hasActive = state.transactions.some(
        (t) => t.memberId === id && !t.returnDate
      );
      if (hasActive) {
        return {
          ok: false,
          reason: 'Cannot delete — this member has active loans.',
        };
      }
      dispatch({ type: 'DELETE_MEMBER', payload: id });
      return { ok: true };
    },
    [state.transactions]
  );

  // ── Transaction Operations ───────────────────────────────────────────────────

  const issueBook = useCallback(
    (
      bookId: string,
      memberId: string
    ): { ok: boolean; reason?: string; transaction?: Transaction } => {
      const book = state.books.find((b) => b.id === bookId);
      const member = state.members.find((m) => m.id === memberId);
      const { settings, transactions } = state;

      if (!book) return { ok: false, reason: 'Book not found.' };
      if (!member) return { ok: false, reason: 'Member not found.' };

      if (member.status === 'Suspended') {
        return { ok: false, reason: 'Member account is suspended.' };
      }

      const activeLoanCount = transactions.filter(
        (t) => t.memberId === memberId && !t.returnDate
      ).length;
      if (activeLoanCount >= settings.borrowLimit) {
        return {
          ok: false,
          reason: `Member has reached the borrow limit of ${settings.borrowLimit} book(s).`,
        };
      }

      const activeCount = transactions.filter(
        (t) => t.bookId === bookId && !t.returnDate
      ).length;
      if (activeCount >= book.totalCopies) {
        return { ok: false, reason: 'No copies of this book are currently available.' };
      }

      const unpaidFines = getUnpaidFines(memberId, transactions, settings.finePerDay);
      if (unpaidFines > 10) {
        return {
          ok: false,
          reason: `Member has unpaid fines of ${settings.currency}${unpaidFines.toFixed(2)}. Please settle outstanding fines before borrowing.`,
        };
      }

      const today = format(new Date(), 'yyyy-MM-dd');
      const dueDate = getDueDate(today, settings.loanPeriodDays);

      const transaction: Transaction = {
        id: uuidv4(),
        bookId,
        memberId,
        issueDate: today,
        dueDate,
        returnDate: null,
        renewedAt: null,
        status: 'Active',
        fineAmount: null,
        finePaid: false,
        finePaidDate: null,
      };

      dispatch({ type: 'ADD_TRANSACTION', payload: transaction });
      return { ok: true, transaction };
    },
    [state]
  );

  const returnBook = useCallback(
    (transactionId: string): { ok: boolean; reason?: string; fine?: number } => {
      const transaction = state.transactions.find((t) => t.id === transactionId);
      if (!transaction) return { ok: false, reason: 'Transaction not found.' };
      if (transaction.returnDate) {
        return { ok: false, reason: 'This book has already been returned.' };
      }

      const today = format(new Date(), 'yyyy-MM-dd');
      const fine = calculateFine(
        { ...transaction, returnDate: today },
        state.settings.finePerDay
      );

      const updated: Transaction = {
        ...transaction,
        returnDate: today,
        status: 'Returned',
        fineAmount: fine,
        finePaid: fine === 0,
        finePaidDate: fine === 0 ? today : null,
      };

      dispatch({ type: 'UPDATE_TRANSACTION', payload: updated });
      return { ok: true, fine };
    },
    [state]
  );

  const renewBook = useCallback(
    (transactionId: string): { ok: boolean; reason?: string } => {
      const transaction = state.transactions.find((t) => t.id === transactionId);
      if (!transaction) return { ok: false, reason: 'Transaction not found.' };
      if (transaction.renewedAt) {
        return { ok: false, reason: 'This loan has already been renewed once.' };
      }
      if (isOverdue(transaction)) {
        return { ok: false, reason: 'Overdue loans cannot be renewed.' };
      }
      if (transaction.returnDate) {
        return { ok: false, reason: 'This book has already been returned.' };
      }

      const today = format(new Date(), 'yyyy-MM-dd');
      const newDueDate = getDueDate(today, state.settings.loanPeriodDays);
      const updated: Transaction = {
        ...transaction,
        dueDate: newDueDate,
        renewedAt: today,
      };
      dispatch({ type: 'UPDATE_TRANSACTION', payload: updated });
      return { ok: true };
    },
    [state]
  );

  const markFinePaid = useCallback((transactionId: string) => {
    const transaction = state.transactions.find((t) => t.id === transactionId);
    if (!transaction) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const fine =
      transaction.fineAmount !== null
        ? transaction.fineAmount
        : calculateFine(transaction, state.settings.finePerDay);
    const updated: Transaction = {
      ...transaction,
      fineAmount: fine,
      finePaid: true,
      finePaidDate: today,
    };
    dispatch({ type: 'UPDATE_TRANSACTION', payload: updated });
  }, [state]);

  const updateSettings = useCallback((settings: Settings) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  }, []);

  const clearAllData = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      addBook,
      updateBook,
      deleteBook,
      addMember,
      updateMember,
      deleteMember,
      issueBook,
      returnBook,
      renewBook,
      markFinePaid,
      updateSettings,
      clearAllData,
    }),
    [
      state,
      addBook,
      updateBook,
      deleteBook,
      addMember,
      updateMember,
      deleteMember,
      issueBook,
      returnBook,
      renewBook,
      markFinePaid,
      updateSettings,
      clearAllData,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
