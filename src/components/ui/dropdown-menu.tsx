import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronRight, type LucideIcon } from 'lucide-react';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

const DropdownMenuContent = forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn('dropdown-content', className)}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = 'DropdownMenuContent';

interface DropdownMenuItemProps extends React.ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Item
> {
  icon?: LucideIcon;
  danger?: boolean;
  shortcut?: string;
}

const DropdownMenuItem = forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Item>,
  DropdownMenuItemProps
>(({ className, icon: Icon, danger, shortcut, children, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(danger ? 'dropdown-item-danger' : 'dropdown-item', className)}
    {...props}
  >
    {Icon && <Icon size={14} className={danger ? undefined : 'text-(--text-secondary)'} />}
    <span>{children}</span>
    {shortcut && (
      <span className="ml-auto text-sm text-(--text-tertiary) font-mono">{shortcut}</span>
    )}
  </DropdownMenuPrimitive.Item>
));
DropdownMenuItem.displayName = 'DropdownMenuItem';

const DropdownMenuCheckboxItem = forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn('dropdown-item pl-7', className)}
    checked={checked}
    {...props}
  >
    <DropdownMenuPrimitive.ItemIndicator className="absolute left-2">
      <Check size={12} />
    </DropdownMenuPrimitive.ItemIndicator>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = 'DropdownMenuCheckboxItem';

const DropdownMenuRadioItem = forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn('dropdown-item pl-7', className)}
    {...props}
  >
    <DropdownMenuPrimitive.ItemIndicator className="absolute left-2">
      <Check size={12} />
    </DropdownMenuPrimitive.ItemIndicator>
    {children}
  </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = 'DropdownMenuRadioItem';

const DropdownMenuLabel = forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Label ref={ref} className={cn('dropdown-label', className)} {...props} />
));
DropdownMenuLabel.displayName = 'DropdownMenuLabel';

const DropdownMenuSeparator = forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn('dropdown-separator', className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';

type DropdownSubMenuWidth = 'sm' | 'md' | 'lg';

const widthClasses: Record<DropdownSubMenuWidth, string> = {
  sm: 'min-w-32',
  md: 'min-w-40',
  lg: 'min-w-48',
};

interface DropdownSubMenuProps {
  children: React.ReactNode;
  icon?: LucideIcon;
  label: string;
  disabled?: boolean;
  minWidth?: DropdownSubMenuWidth;
  maxHeight?: string;
  className?: string;
}

const DropdownSubMenu = forwardRef<HTMLDivElement, DropdownSubMenuProps>(
  ({ children, icon: Icon, label, disabled, minWidth = 'md', maxHeight, className }, ref) => (
    <DropdownMenuPrimitive.Sub>
      <DropdownMenuPrimitive.SubTrigger ref={ref} className="dropdown-item" disabled={disabled}>
        {Icon && <Icon size={14} />}
        <span>{label}</span>
        <ChevronRight size={14} className="ml-auto opacity-60" />
      </DropdownMenuPrimitive.SubTrigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.SubContent
          className={cn('dropdown-content', widthClasses[minWidth], className)}
          style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
        >
          {children}
        </DropdownMenuPrimitive.SubContent>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Sub>
  )
);
DropdownSubMenu.displayName = 'DropdownSubMenu';

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuRadioGroup,
  DropdownSubMenu,
};

export type { DropdownMenuItemProps, DropdownSubMenuProps };
