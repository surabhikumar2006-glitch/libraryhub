import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantClasses: Record<string, string> = {
  primary:
    'bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 hover:border-blue-700 disabled:bg-blue-400 disabled:border-blue-400',
  secondary:
    'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 hover:border-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 dark:border-slate-600',
  danger:
    'bg-red-600 hover:bg-red-700 text-white border border-red-600 hover:border-red-700 disabled:bg-red-400 disabled:border-red-400',
  success:
    'bg-green-600 hover:bg-green-700 text-white border border-green-600 hover:border-green-700 disabled:bg-green-400 disabled:border-green-400',
  ghost:
    'bg-transparent hover:bg-slate-100 text-slate-600 border border-transparent dark:hover:bg-slate-700 dark:text-slate-300',
  outline:
    'bg-transparent hover:bg-slate-50 text-slate-700 border border-slate-300 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800',
};

const sizeClasses: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-md gap-1.5',
  md: 'px-4 py-2 text-sm rounded-lg gap-2',
  lg: 'px-5 py-2.5 text-base rounded-lg gap-2',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
