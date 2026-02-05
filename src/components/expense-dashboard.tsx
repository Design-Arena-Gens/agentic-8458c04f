'use client';

import { useEffect, useMemo, useState } from 'react';

type ExpenseCategory =
  | 'Housing'
  | 'Transportation'
  | 'Food'
  | 'Utilities'
  | 'Entertainment'
  | 'Health'
  | 'Education'
  | 'Other';

type ExpenseFrequency = 'One-time' | 'Recurring';

export type Expense = {
  id: string;
  label: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  frequency: ExpenseFrequency;
  notes?: string;
};

type Filters = {
  search: string;
  category: ExpenseCategory | 'All';
  frequency: ExpenseFrequency | 'All';
  startDate: string;
  endDate: string;
};

const categories: ExpenseCategory[] = [
  'Housing',
  'Transportation',
  'Food',
  'Utilities',
  'Entertainment',
  'Health',
  'Education',
  'Other',
];

const defaultExpenses: Expense[] = [
  {
    id: crypto.randomUUID(),
    label: 'Rent',
    amount: 1800,
    category: 'Housing',
    date: new Date().toISOString(),
    frequency: 'Recurring',
    notes: 'Paid on the 1st',
  },
  {
    id: crypto.randomUUID(),
    label: 'Groceries',
    amount: 240.35,
    category: 'Food',
    date: shiftDays(-6),
    frequency: 'Recurring',
    notes: 'Weekly Costco run',
  },
  {
    id: crypto.randomUUID(),
    label: 'Gym Membership',
    amount: 65,
    category: 'Health',
    date: shiftDays(-20),
    frequency: 'Recurring',
  },
  {
    id: crypto.randomUUID(),
    label: 'Car Insurance',
    amount: 120,
    category: 'Transportation',
    date: shiftDays(-25),
    frequency: 'Recurring',
  },
  {
    id: crypto.randomUUID(),
    label: 'Laptop Repair',
    amount: 320,
    category: 'Education',
    date: shiftDays(-12),
    frequency: 'One-time',
    notes: 'Replaced screen',
  },
  {
    id: crypto.randomUUID(),
    label: 'Movie Night',
    amount: 54.5,
    category: 'Entertainment',
    date: shiftDays(-2),
    frequency: 'One-time',
  },
  {
    id: crypto.randomUUID(),
    label: 'Water Bill',
    amount: 42,
    category: 'Utilities',
    date: shiftDays(-9),
    frequency: 'Recurring',
  },
  {
    id: crypto.randomUUID(),
    label: 'Coffee Subscription',
    amount: 18,
    category: 'Food',
    date: shiftDays(-14),
    frequency: 'Recurring',
  },
];

const storageKey = 'expense-dashboard-data@v1';

function shiftDays(delta: number) {
  const result = new Date();
  result.setDate(result.getDate() + delta);
  return result.toISOString();
}

export function ExpenseDashboard() {
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    if (typeof window === 'undefined') return defaultExpenses;
    try {
      const cached = localStorage.getItem(storageKey);
      if (!cached) return defaultExpenses;
      const parsed = JSON.parse(cached) as Expense[];
      return parsed.map((item) => ({ ...item, date: new Date(item.date).toISOString() }));
    } catch (error) {
      console.error('Failed to parse stored expenses', error);
      return defaultExpenses;
    }
  });
  const [filters, setFilters] = useState<Filters>({
    search: '',
    category: 'All',
    frequency: 'All',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(storageKey, JSON.stringify(expenses));
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();
    return expenses.filter((expense) => {
      const matchesSearch =
        !searchTerm ||
        expense.label.toLowerCase().includes(searchTerm) ||
        expense.notes?.toLowerCase().includes(searchTerm);
      const matchesCategory =
        filters.category === 'All' || expense.category === filters.category;
      const matchesFrequency =
        filters.frequency === 'All' || expense.frequency === filters.frequency;
      const expenseDate = new Date(expense.date);
      const matchesStart = !filters.startDate || expenseDate >= new Date(filters.startDate);
      const matchesEnd = !filters.endDate || expenseDate <= new Date(filters.endDate);
      return matchesSearch && matchesCategory && matchesFrequency && matchesStart && matchesEnd;
    });
  }, [expenses, filters]);

  const { total, avgDaily, avgMonthly, recurringTotal } = useMemo(() => {
    if (filteredExpenses.length === 0) {
      return { total: 0, avgDaily: 0, avgMonthly: 0, recurringTotal: 0 };
    }
    const totals = filteredExpenses.reduce(
      (acc, expense) => {
        acc.total += expense.amount;
        if (expense.frequency === 'Recurring') {
          acc.recurring += expense.amount;
        }
        acc.byDate.push({ amount: expense.amount, date: new Date(expense.date) });
        return acc;
      },
      { total: 0, recurring: 0, byDate: [] as { amount: number; date: Date }[] },
    );

    const firstDate =
      totals.byDate.length > 0
        ? totals.byDate.reduce((earliest, item) =>
            item.date < earliest ? item.date : earliest,
          totals.byDate[0].date)
        : new Date();
    const lastDate =
      totals.byDate.length > 0
        ? totals.byDate.reduce(
            (latest, item) => (item.date > latest ? item.date : latest),
            totals.byDate[0].date,
          )
        : new Date();
    const diffDays = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / 86400000));
    const diffMonths = Math.max(1, Math.ceil(diffDays / 30));

    return {
      total: totals.total,
      avgDaily: totals.total / diffDays,
      avgMonthly: totals.total / diffMonths,
      recurringTotal: totals.recurring,
    };
  }, [filteredExpenses]);

  const categoryBreakdown = useMemo(() => {
    const byCategory = new Map<ExpenseCategory, number>();
    filteredExpenses.forEach((expense) => {
      byCategory.set(expense.category, (byCategory.get(expense.category) ?? 0) + expense.amount);
    });
    const largest = Math.max(1, ...Array.from(byCategory.values()));
    return categories.map((category) => {
      const amount = byCategory.get(category) ?? 0;
      return {
        category,
        amount,
        percentage: total === 0 ? 0 : (amount / total) * 100,
        width: (amount / largest) * 100,
      };
    });
  }, [filteredExpenses, total]);

  const trend = useMemo(() => {
    const byMonth = new Map<string, number>();
    filteredExpenses.forEach((expense) => {
      const date = new Date(expense.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      byMonth.set(key, (byMonth.get(key) ?? 0) + expense.amount);
    });
    const sorted = Array.from(byMonth.entries())
      .map(([key, amount]) => ({
        key,
        amount,
        label: new Date(`${key}-01`).toLocaleString('default', { month: 'short', year: 'numeric' }),
      }))
      .sort((a, b) => (a.key < b.key ? -1 : 1));
    return sorted;
  }, [filteredExpenses]);

  const handleAddExpense = (expense: Expense) => {
    setExpenses((prev) => [expense, ...prev]);
  };

  return (
    <div className="min-h-screen bg-slate-100/80 py-10 text-slate-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6">
        <header className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Expense Intelligence</h1>
            <p className="text-sm text-slate-600">
              Track personal and business expenses, spot spending trends, and plan ahead.
            </p>
          </div>
          <AddExpenseForm onAdd={handleAddExpense} />
        </header>

        <FiltersPanel filters={filters} onChange={setFilters} />

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Total spend" value={formatCurrency(total)} tone="emerald" />
          <SummaryCard
            label="Avg. monthly"
            value={formatCurrency(avgMonthly)}
            tone="sky"
            helper="Based on filtered range"
          />
          <SummaryCard
            label="Avg. daily"
            value={formatCurrency(avgDaily)}
            tone="violet"
            helper="Helpful for monthly budgeting"
          />
          <SummaryCard
            label="Recurring spend"
            value={formatCurrency(recurringTotal)}
            tone="amber"
            helper="Subscriptions & regular bills"
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <ExpensesTable expenses={filteredExpenses} />
          <div className="flex flex-col gap-6">
            <CategoryBreakdown breakdown={categoryBreakdown} />
            <TrendInsight trend={trend} />
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  helper,
}: {
  label: string;
  value: string;
  tone: 'emerald' | 'sky' | 'violet' | 'amber';
  helper?: string;
}) {
  const toneClass = {
    emerald: 'bg-emerald-100 text-emerald-900 border-emerald-200 shadow-emerald-100',
    sky: 'bg-sky-100 text-sky-900 border-sky-200 shadow-sky-100',
    violet: 'bg-violet-100 text-violet-900 border-violet-200 shadow-violet-100',
    amber: 'bg-amber-100 text-amber-900 border-amber-200 shadow-amber-100',
  }[tone];

  return (
    <article
      className={`rounded-2xl border p-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg ${toneClass}`}
    >
      <p className="text-xs uppercase tracking-wide">{label}</p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      {helper ? <p className="mt-2 text-xs text-slate-600/80">{helper}</p> : null}
    </article>
  );
}

function FiltersPanel({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (filters: Filters) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Search</span>
          <input
            type="search"
            value={filters.search}
            onChange={(event) => onChange({ ...filters, search: event.target.value })}
            placeholder="Merchant, notes, category"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Category</span>
          <select
            value={filters.category}
            onChange={(event) =>
              onChange({ ...filters, category: event.target.value as Filters['category'] })
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          >
            <option value="All">All</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Frequency</span>
          <select
            value={filters.frequency}
            onChange={(event) =>
              onChange({ ...filters, frequency: event.target.value as Filters['frequency'] })
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          >
            <option value="All">All</option>
            <option value="Recurring">Recurring</option>
            <option value="One-time">One-time</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Start date</span>
          <input
            type="date"
            value={filters.startDate}
            max={filters.endDate || undefined}
            onChange={(event) => onChange({ ...filters, startDate: event.target.value })}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">End date</span>
          <input
            type="date"
            value={filters.endDate}
            min={filters.startDate || undefined}
            onChange={(event) => onChange({ ...filters, endDate: event.target.value })}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </label>
      </div>
    </section>
  );
}

function ExpensesTable({ expenses }: { expenses: Expense[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Expenses</h2>
          <p className="text-xs text-slate-600">
            {expenses.length === 0 ? 'No matching expenses' : `${expenses.length} records`}
          </p>
        </div>
      </header>
      <div className="relative overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-6 py-3">Label</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Frequency</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-6 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-10 text-center text-sm text-slate-500"
                >
                  Try clearing filters or adding a new expense.
                </td>
              </tr>
            ) : (
              expenses.map((expense) => (
                <tr
                  key={expense.id}
                  className="border-b border-slate-50 last:border-none hover:bg-slate-50/80"
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900">{expense.label}</span>
                      {expense.notes ? (
                        <span className="text-xs text-slate-500">{expense.notes}</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{expense.category}</td>
                  <td className="px-4 py-4 text-slate-600">{expense.frequency}</td>
                  <td className="px-4 py-4 text-slate-600">
                    {new Date(expense.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-slate-900">
                    {formatCurrency(expense.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TrendInsight({
  trend,
}: {
  trend: { key: string; label: string; amount: number }[];
}) {
  if (trend.length === 0) {
    return (
      <aside className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Not enough data to chart trends yet.
      </aside>
    );
  }

  const maxAmount = Math.max(...trend.map((item) => item.amount));

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Monthly trend</h2>
          <p className="text-xs text-slate-600">Visually compare spend month over month.</p>
        </div>
      </div>
      <div className="mt-6 grid gap-4">
        {trend.map((item) => (
          <div key={item.key}>
            <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
              <span>{item.label}</span>
              <span className="font-medium text-slate-700">{formatCurrency(item.amount)}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-violet-400"
                style={{ width: `${(item.amount / maxAmount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function CategoryBreakdown({
  breakdown,
}: {
  breakdown: {
    category: ExpenseCategory;
    amount: number;
    percentage: number;
    width: number;
  }[];
}) {
  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Category breakdown</h2>
          <p className="text-xs text-slate-600">Where your money is going right now.</p>
        </div>
      </div>
      <div className="mt-6 space-y-4">
        {breakdown.map((item) => (
          <div key={item.category}>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium text-slate-700">{item.category}</span>
              <span>{item.percentage.toFixed(1)}%</span>
            </div>
            <div className="mt-1 flex items-center gap-3">
              <div className="h-2 flex-1 rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-400"
                  style={{ width: `${item.width}%` }}
                />
              </div>
              <span className="w-20 text-right text-xs font-medium text-slate-600">
                {formatCurrency(item.amount)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function AddExpenseForm({ onAdd }: { onAdd: (expense: Expense) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    label: '',
    amount: '',
    category: categories[0] as ExpenseCategory,
    frequency: 'One-time' as ExpenseFrequency,
    date: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedAmount = Number(form.amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    const newExpense: Expense = {
      id: crypto.randomUUID(),
      label: form.label.trim() || 'Untitled expense',
      amount: Number(parsedAmount.toFixed(2)),
      category: form.category,
      frequency: form.frequency,
      date: new Date(form.date).toISOString(),
      notes: form.notes.trim() || undefined,
    };

    onAdd(newExpense);

    setForm((prev) => ({
      ...prev,
      label: '',
      amount: '',
      notes: '',
    }));
    setError(null);
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-4 w-4"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add expense
      </button>
      <p className="text-xs text-slate-500">
        Quickly log purchases, subscriptions, or reimbursements.
      </p>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <header className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">New expense</h2>
                <p className="text-xs text-slate-500">
                  Fill in the details below to add this expense to your records.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
                aria-label="Close"
                className="rounded-full border border-transparent p-1 text-slate-500 transition hover:border-slate-200 hover:text-slate-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-4 w-4"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </header>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700">Label</span>
                <input
                  required
                  value={form.label}
                  onChange={(event) => setForm({ ...form, label: event.target.value })}
                  placeholder="e.g. Software subscription"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700">Amount</span>
                <input
                  required
                  value={form.amount}
                  onChange={(event) => setForm({ ...form, amount: event.target.value })}
                  placeholder="e.g. 59.99"
                  inputMode="decimal"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700">Category</span>
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm({ ...form, category: event.target.value as ExpenseCategory })
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700">Frequency</span>
                <select
                  value={form.frequency}
                  onChange={(event) =>
                    setForm({ ...form, frequency: event.target.value as ExpenseFrequency })
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="One-time">One-time</option>
                  <option value="Recurring">Recurring</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700">Date</span>
                <input
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm({ ...form, date: event.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
              </label>
              <label className="sm:col-span-2 flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700">Notes</span>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  rows={3}
                  placeholder="Optional context, reminders, or reimbursement details"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
              </label>
            </div>
            {error ? <p className="mt-3 text-sm text-rose-500">{error}</p> : null}
            <footer className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
              >
                Save expense
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

export default ExpenseDashboard;
