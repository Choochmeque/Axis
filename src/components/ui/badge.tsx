import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('badge', {
  variants: {
    variant: {
      default: '',
      success: 'bg-(--color-success)/20 text-(--color-success)',
      warning: 'bg-(--color-warning)/20 text-(--color-warning)',
      error: 'bg-(--color-error)/20 text-(--color-error)',
      accent: 'bg-(--accent-color)/20 text-(--accent-color)',
    },
    size: {
      default: '',
      sm: 'py-0 px-1 text-[9px]',
      lg: 'py-1 px-2 text-[11px]',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant, size, className }))} {...props} />
  )
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
