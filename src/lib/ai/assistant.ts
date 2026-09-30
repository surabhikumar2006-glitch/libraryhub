import { Book, Member, Transaction, Settings } from '@/types';
import { format } from 'date-fns';

export interface LibraryContext {
  books: Book[];
  members: Member[];
  transactions: Transaction[];
  settings: Settings;
}

// ─── Mock Response Engine ─────────────────────────────────────────────────────
// This function answers questions using the actual library data without requiring
// an API key. It handles common query patterns with regex matching.
// A real LLM API can be plugged in by replacing the `getAIResponse` function.

function getAvailableCopies(bookId: string, ctx: LibraryContext): number {
  const active = ctx.transactions.filter(
    (t) => t.bookId === bookId && !t.returnDate
  ).length;
  const book = ctx.books.find((b) => b.id === bookId);
  return Math.max(0, (book?.totalCopies ?? 0) - active);
}

function getOverdueTransactions(ctx: LibraryContext) {
  const now = new Date();
  return ctx.transactions.filter(
    (t) => !t.returnDate && now > new Date(t.dueDate)
  );
}

function getMemberActiveLoans(memberId: string, ctx: LibraryContext) {
  return ctx.transactions.filter(
    (t) => t.memberId === memberId && !t.returnDate
  );
}

export function mockResponse(query: string, ctx: LibraryContext): string {
  const q = query.toLowerCase().trim();
  const { books, members, transactions, settings } = ctx;
  const now = new Date();
  const today = format(now, 'MMMM d, yyyy');

  // Overdue books
  if (q.includes('overdue')) {
    const overdueList = getOverdueTransactions(ctx);
    if (overdueList.length === 0) {
      return `Great news! As of ${today}, there are no overdue books. Everything has been returned on time. 🎉`;
    }
    const lines = overdueList.map((t) => {
      const book = books.find((b) => b.id === t.bookId);
      const member = members.find((m) => m.id === t.memberId);
      const daysOverdue = Math.floor((now.getTime() - new Date(t.dueDate).getTime()) / 86400000);
      const fine = daysOverdue * settings.finePerDay;
      return `• **${book?.title ?? 'Unknown'}** — borrowed by ${member?.name ?? 'Unknown'} (${daysOverdue} days overdue, fine: ${settings.currency}${fine.toFixed(2)})`;
    });
    return `There are **${overdueList.length} overdue book(s)** as of ${today}:\n\n${lines.join('\n')}`;
  }

  // Book availability by title
  const availabilityMatch = q.match(/(?:is|are|check|available)[^a-z]*([a-z\s0-9:,'-]+?)(?:\s+available|\?|$)/i);
  if (availabilityMatch || q.includes('available')) {
    const searchTerm = availabilityMatch?.[1]?.trim().toLowerCase();
    if (searchTerm && searchTerm.length > 2) {
      const matchedBooks = books.filter(
        (b) =>
          b.title.toLowerCase().includes(searchTerm) ||
          b.isbn.includes(searchTerm) ||
          b.author.toLowerCase().includes(searchTerm)
      );
      if (matchedBooks.length === 0) {
        return `I couldn't find any book matching "${searchTerm}" in the catalog. Try searching by a different title or author.`;
      }
      const lines = matchedBooks.map((b) => {
        const avail = getAvailableCopies(b.id, ctx);
        return `• **${b.title}** by ${b.author} — ${avail > 0 ? `✅ ${avail} of ${b.totalCopies} copies available` : `❌ Not available (all ${b.totalCopies} copies are issued)`}`;
      });
      return `Here's the availability for your search:\n\n${lines.join('\n')}`;
    }
    // General availability question
    const availCount = books.filter((b) => getAvailableCopies(b.id, ctx) > 0).length;
    return `Currently **${availCount} out of ${books.length}** books in the catalog have at least one copy available.`;
  }

  // What did a member borrow
  const memberBorrowMatch = q.match(/(?:what|which|books).*(?:did|has|have)[^a-z]*([a-z]+(?:\s+[a-z]+)?)\s+(?:borrowed|borrow|read|taken)/i);
  if (memberBorrowMatch) {
    const nameSearch = memberBorrowMatch[1].toLowerCase();
    const member = members.find((m) => m.name.toLowerCase().includes(nameSearch));
    if (!member) {
      return `I couldn't find a member matching "${memberBorrowMatch[1]}". Please check the spelling or search by email.`;
    }
    const memberLoans = transactions.filter((t) => t.memberId === member.id);
    if (memberLoans.length === 0) {
      return `**${member.name}** hasn't borrowed any books yet.`;
    }
    const lines = memberLoans.map((t) => {
      const book = books.find((b) => b.id === t.bookId);
      const status = t.returnDate ? 'Returned' : 'Currently borrowed';
      return `• **${book?.title ?? 'Unknown'}** (${status})`;
    });
    return `**${member.name}** has borrowed **${memberLoans.length} book(s)**:\n\n${lines.join('\n')}`;
  }

  // Book suggestion by category
  const suggestMatch = q.match(/suggest|recommend.*(?:from|in|about|on)\s+([a-z]+)/i) ||
    q.match(/([a-z]+)\s+(?:books?|suggestion|recommendation)/i);
  if (q.includes('suggest') || q.includes('recommend')) {
    const catSearch = suggestMatch?.[1]?.toLowerCase();
    const categoryBooks = books.filter(
      (b) => !catSearch || b.category.toLowerCase().includes(catSearch)
    );
    const available = categoryBooks.filter((b) => getAvailableCopies(b.id, ctx) > 0);
    const pool = available.length > 0 ? available : categoryBooks;
    if (pool.length === 0) {
      return `Sorry, I couldn't find any ${catSearch ?? ''} books in the catalog.`;
    }
    const pick = pool[Math.floor(Math.random() * Math.min(pool.length, 5))];
    return `I'd recommend **"${pick.title}"** by ${pick.author}${pick.description ? `\n\n${pick.description}` : ''}.\n\n${getAvailableCopies(pick.id, ctx) > 0 ? `✅ It's available at shelf **${pick.shelfLocation}**.` : '❌ It\'s currently not available.'}`;
  }

  // How many books issued today
  if (q.includes('issued today') || q.includes('borrowed today')) {
    const todayStr = format(now, 'yyyy-MM-dd');
    const count = transactions.filter((t) => t.issueDate === todayStr).length;
    return `**${count} book(s)** have been issued today (${today}).`;
  }

  // Total stats
  if (q.includes('total') || q.includes('how many') || q.includes('count') || q.includes('stats')) {
    const activeLoans = transactions.filter((t) => !t.returnDate).length;
    const overdueCount = getOverdueTransactions(ctx).length;
    return `Here's a quick overview of ${settings.libraryName}:

📚 **Books:** ${books.length} total, ${books.filter((b) => getAvailableCopies(b.id, ctx) > 0).length} available
👥 **Members:** ${members.length} registered (${members.filter((m) => m.status === 'Active').length} active)
📖 **Active Loans:** ${activeLoans}
⚠️ **Overdue:** ${overdueCount}
📅 **As of:** ${today}`;
  }

  // Member info
  if (q.includes('member') || q.includes('who')) {
    const nameMatch = q.match(/(?:member|about|info)[^a-z]*([a-z]+(?:\s+[a-z]+)?)/i);
    if (nameMatch) {
      const nameSearch = nameMatch[1].toLowerCase();
      const member = members.find((m) => m.name.toLowerCase().includes(nameSearch));
      if (member) {
        const active = getMemberActiveLoans(member.id, ctx).length;
        return `**${member.name}** (${member.membershipType})\n📧 ${member.email} · 📞 ${member.phone}\n📅 Member since ${format(new Date(member.joinDate), 'MMMM yyyy')}\n📚 ${active} active loan(s)\n✅ Status: ${member.status}`;
      }
    }
    return `I can help you look up a member. Try asking: "What has Alice borrowed?" or "Is Alice Johnson's account active?"`;
  }

  // Help / fallback
  return `Hi! I'm the LibraryHub AI Assistant. I can answer questions like:

• "Which books are overdue?"
• "Is Clean Code available?"
• "What has Alice borrowed?"
• "How many books are issued today?"
• "Suggest a book from Science"
• "What are the library stats?"

What would you like to know?`;
}

// ─── Real AI API (plug-in point) ──────────────────────────────────────────────

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function callAI(
  messages: Message[],
  apiKey: string,
  model = 'gpt-4o-mini'
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.7 }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

export function buildSystemPrompt(ctx: LibraryContext): string {
  const { books, members, transactions, settings } = ctx;
  const now = new Date();

  const enrichedBooks = books.map((b) => {
    const activeCount = transactions.filter(
      (t) => t.bookId === b.id && !t.returnDate
    ).length;
    return {
      id: b.id,
      title: b.title,
      author: b.author,
      isbn: b.isbn,
      category: b.category,
      shelfLocation: b.shelfLocation,
      totalCopies: b.totalCopies,
      availableCopies: Math.max(0, b.totalCopies - activeCount),
    };
  });

  const overdueList = transactions
    .filter((t) => !t.returnDate && now > new Date(t.dueDate))
    .map((t) => {
      const book = books.find((b) => b.id === t.bookId);
      const member = members.find((m) => m.id === t.memberId);
      const daysOverdue = Math.floor(
        (now.getTime() - new Date(t.dueDate).getTime()) / 86400000
      );
      return {
        bookTitle: book?.title,
        memberName: member?.name,
        dueDate: t.dueDate,
        daysOverdue,
        fine: daysOverdue * settings.finePerDay,
      };
    });

  return `You are the AI Assistant for ${settings.libraryName}, a library management system.
Today's date is ${format(now, 'MMMM d, yyyy')}.

LIBRARY SETTINGS: Loan period: ${settings.loanPeriodDays} days, Fine per day: ${settings.currency}${settings.finePerDay}, Borrow limit: ${settings.borrowLimit}

BOOKS (${books.length} total):
${JSON.stringify(enrichedBooks, null, 2)}

MEMBERS (${members.length} total):
${JSON.stringify(members.map((m) => ({ id: m.id, name: m.name, email: m.email, membershipType: m.membershipType, status: m.status })), null, 2)}

ACTIVE LOANS (${transactions.filter((t) => !t.returnDate).length}):
${JSON.stringify(
  transactions
    .filter((t) => !t.returnDate)
    .map((t) => ({
      bookTitle: books.find((b) => b.id === t.bookId)?.title,
      memberName: members.find((m) => m.id === t.memberId)?.name,
      dueDate: t.dueDate,
    })),
  null, 2
)}

OVERDUE (${overdueList.length}):
${JSON.stringify(overdueList, null, 2)}

Answer questions about the library concisely and accurately. Base answers only on the data above.`;
}
