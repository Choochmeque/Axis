import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, Check, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const alertVariants = cva('alert', {
  variants: {
    variant: {
      error: 'alert-error',
      success: 'alert-success',
      warning: 'alert-warning',
      info: 'bg-(--accent-color)/10 border border-(--accent-color) text-(--accent-color)',
    },
    inline: {
      true: 'alert-inline',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'error',
    inline: false,
  },
});

const icons = {
  error: AlertCircle,
  success: Check,
  warning: AlertTriangle,
  info: Info,
};

interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  showIcon?: boolean;
}

const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'error', inline, showIcon = true, children, ...props }, ref) => {
    const Icon = icons[variant ?? 'error'];
    return (
      <div ref={ref} className={cn(alertVariants({ variant, inline, className }))} {...props}>
        {showIcon && !inline && <Icon size={16} className="shrink-0" />}
        <span className="wrap-break-word">{children}</span>
      </div>
    );
  }
);
Alert.displayName = 'Alert';

export { Alert, alertVariants };
