import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type AlertVariant = 'error' | 'success' | 'warning' | 'info';

const config: Record<
  AlertVariant,
  { icon: React.FC<{ className?: string }>; classes: string }
> = {
  error: {
    icon: XCircle,
    classes:
      'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400',
  },
  success: {
    icon: CheckCircle,
    classes:
      'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400',
  },
  warning: {
    icon: AlertCircle,
    classes:
      'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400',
  },
  info: {
    icon: Info,
    classes:
      'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400',
  },
};

interface AlertProps {
  variant?: AlertVariant;
  message: string;
  className?: string;
}

export default function Alert({
  variant = 'error',
  message,
  className,
}: AlertProps) {
  const { icon: Icon, classes } = config[variant];
  return (
    <div
      className={cn('flex items-start gap-2.5 px-4 py-3 rounded-lg border text-sm', classes, className)}
      role="alert"
    >
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
