import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select className={cn('input', className)} ref={ref} {...props}>
      {children}
    </select>
  )
);
Select.displayName = 'Select';

export { Select };
