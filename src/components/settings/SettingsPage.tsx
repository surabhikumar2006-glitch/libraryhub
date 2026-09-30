'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useApp } from '@/context/AppContext';
import { Settings } from '@/types';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Card, CardHeader } from '@/components/ui/Card';
import { Library, ShieldAlert, Eye, EyeOff } from 'lucide-react';

const schema = z.object({
  libraryName: z.string().min(1, 'Library name is required').max(100),
  loanPeriodDays: z.number().int().min(1).max(365),
  finePerDay: z.number().min(0).max(100),
  borrowLimit: z.number().int().min(1).max(20),
  currency: z.string().min(1).max(5),
  aiApiKey: z.string(),
});

type FormValues = z.infer<typeof schema>;

export default function SettingsPage() {
  const { state, updateSettings, clearAllData } = useApp();
  const [success, setSuccess] = useState('');
  const [clearOpen, setClearOpen] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const settings = state.settings;

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      libraryName: settings.libraryName,
      loanPeriodDays: settings.loanPeriodDays,
      finePerDay: settings.finePerDay,
      borrowLimit: settings.borrowLimit,
      currency: settings.currency,
      aiApiKey: settings.aiApiKey ?? '',
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSave = (values: any) => {
    updateSettings({
      ...settings,
      ...values,
      aiApiKey: values.aiApiKey ?? '',
    });
    setSuccess('Settings saved successfully!');
    setTimeout(() => setSuccess(''), 3000);
    reset(values);
  };

  const toggleTheme = () => {
    updateSettings({
      ...settings,
      theme: settings.theme === 'dark' ? 'light' : 'dark',
    });
  };

  const handleClearData = () => {
    clearAllData();
    setClearOpen(false);
    setSuccess('All data has been reset to sample data.');
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Configure library preferences and rules
        </p>
      </div>

      {success && <Alert variant="success" message={success} />}

      {/* Appearance */}
      <Card>
        <CardHeader title="Appearance" subtitle="Theme and display preferences" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {settings.theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {settings.theme === 'dark'
                ? 'Switch to light mode for a brighter interface'
                : 'Switch to dark mode for reduced eye strain'}
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              settings.theme === 'dark' ? 'bg-blue-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                settings.theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </Card>

      {/* Library Settings Form */}
      <Card>
        <CardHeader
          title="Library Configuration"
          subtitle="Rules and defaults for loans and fines"
          action={<Library className="w-5 h-5 text-slate-400" />}
        />
        <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
          <Input
            label="Library Name"
            required
            {...register('libraryName')}
            error={errors.libraryName?.message}
            placeholder="e.g. City Central Library"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Loan Period (days)"
              type="number"
              min={1}
              max={365}
              required
              {...register('loanPeriodDays', { valueAsNumber: true })}
              error={errors.loanPeriodDays?.message}
              hint="Default: 14 days"
            />
            <Input
              label="Borrow Limit"
              type="number"
              min={1}
              max={20}
              required
              {...register('borrowLimit', { valueAsNumber: true })}
              error={errors.borrowLimit?.message}
              hint="Max books per member"
            />
            <Input
              label="Fine Per Day"
              type="number"
              step="0.01"
              min={0}
              required
              {...register('finePerDay', { valueAsNumber: true })}
              error={errors.finePerDay?.message}
              hint="Amount charged per overdue day"
            />
            <Input
              label="Currency Symbol"
              required
              {...register('currency')}
              error={errors.currency?.message}
              placeholder="$"
              hint="e.g. $, €, £, ₹"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              AI API Key <span className="text-slate-400 text-xs font-normal">(optional)</span>
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                {...register('aiApiKey')}
                placeholder="sk-... (leave blank to use mock AI)"
                className="w-full rounded-lg border px-3 py-2 pr-10 text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 placeholder:text-slate-400 border-slate-300 dark:border-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Optional: enter an OpenAI API key to enable real AI responses. Without it, the assistant uses built-in mock responses.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => reset()}
              disabled={!isDirty}
            >
              Discard Changes
            </Button>
            <Button type="submit">Save Settings</Button>
          </div>
        </form>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-900/50">
        <CardHeader
          title="Danger Zone"
          action={<ShieldAlert className="w-5 h-5 text-red-500" />}
        />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Reset All Data
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Clears all data and reloads the sample dataset. This cannot be undone.
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setClearOpen(true)}
          >
            Reset to Sample Data
          </Button>
        </div>
      </Card>

      {/* Librarian Info */}
      <Card>
        <CardHeader title="Account" />
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold">
            L
          </div>
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100">Librarian</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              librarian@{settings.libraryName.toLowerCase().replace(/\s+/g, '')}.org
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Mock account — authentication is not required in this version
            </p>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        onConfirm={handleClearData}
        title="Reset All Data"
        message="This will delete all books, members, and transactions and replace them with sample data. This action cannot be undone. Are you sure?"
        confirmLabel="Yes, Reset Everything"
        variant="danger"
      />
    </div>
  );
}
