import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva('btn', {
  variants: {
    variant: {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      destructive:
        'bg-(--color-error) border border-(--color-error) text-white hover:not-disabled:opacity-80',
      ghost: 'bg-transparent border-none hover:bg-(--bg-hover)',
    },
    size: {
      default: '',
      sm: 'py-1.5 px-3 text-xs',
      lg: 'py-2.5 px-5 text-sm',
      icon: 'p-2',
    },
    hasIcon: {
      true: 'btn-icon',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'secondary',
    size: 'default',
    hasIcon: false,
  },
});

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, hasIcon, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, hasIcon, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
