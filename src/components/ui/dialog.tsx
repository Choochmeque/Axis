import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, type LucideIcon } from 'lucide-react';
import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;

const DialogOverlay = forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn('dialog-overlay-animated', className)}
    {...props}
  />
));
DialogOverlay.displayName = 'DialogOverlay';

/* eslint-disable @typescript-eslint/naming-convention -- Tailwind CSS size conventions */
const maxWidthClasses = {
  sm: 'max-w-80',
  md: 'max-w-105',
  lg: 'max-w-125',
  xl: 'max-w-150',
  '2xl': 'max-w-175',
} as const;
/* eslint-enable @typescript-eslint/naming-convention */

interface DialogContentProps extends React.ComponentPropsWithoutRef<
  typeof DialogPrimitive.Content
> {
  maxWidth?: keyof typeof maxWidthClasses;
  showClose?: boolean;
}

const DialogContent = forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, maxWidth = 'md', showClose = true, ...props }, ref) => {
  const { t } = useTranslation();

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        aria-describedby={undefined}
        className={cn('dialog-content', maxWidthClasses[maxWidth], className)}
        {...props}
      >
        {children}
        {showClose && (
          <DialogPrimitive.Close asChild>
            <button className="btn-close absolute top-3 right-3" aria-label={t('common.close')}>
              <X size={16} />
            </button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = 'DialogContent';

interface DialogTitleProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title> {
  icon?: LucideIcon;
  iconClassName?: string;
}

const DialogTitle = forwardRef<React.ComponentRef<typeof DialogPrimitive.Title>, DialogTitleProps>(
  ({ className, icon: Icon, iconClassName, children, ...props }, ref) => (
    <DialogPrimitive.Title ref={ref} className={cn('dialog-title', className)} {...props}>
      {Icon && <Icon size={18} className={iconClassName} />}
      {children}
    </DialogPrimitive.Title>
  )
);
DialogTitle.displayName = 'DialogTitle';

const DialogDescription = forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-(--text-secondary) px-5 pb-2', className)}
    {...props}
  />
));
DialogDescription.displayName = 'DialogDescription';

const DialogBody = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('dialog-body', className)} {...props} />
  )
);
DialogBody.displayName = 'DialogBody';

const DialogFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('dialog-footer', className)} {...props} />
  )
);
DialogFooter.displayName = 'DialogFooter';

const DialogClose = DialogPrimitive.Close;

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogClose,
  DialogOverlay,
  DialogPortal,
};
