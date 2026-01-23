import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Label } from './label';

interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
}

const FormField = forwardRef<HTMLDivElement, FormFieldProps>(
  ({ className, label, htmlFor, error, hint, children, ...props }, ref) => (
    <div ref={ref} className={cn('field', className)} {...props}>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {error && <p className="text-xs text-error mt-1">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-(--text-muted)">{hint}</p>}
    </div>
  )
);
FormField.displayName = 'FormField';

export { FormField };
