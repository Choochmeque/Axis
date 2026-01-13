import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input type={type} className={cn('input', className)} ref={ref} {...props} />
  )
);
Input.displayName = 'Input';

export { Input };
