import { ReactNode, forwardRef } from 'react';
import * as RadixContextMenu from '@radix-ui/react-context-menu';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// ==================== ContextMenu ====================

interface ContextMenuProps {
  trigger: ReactNode;
  children: ReactNode;
  onOpenChange?: (open: boolean) => void;
}

export function ContextMenu({ trigger, children, onOpenChange }: ContextMenuProps) {
  return (
    <RadixContextMenu.Root onOpenChange={onOpenChange}>
      <RadixContextMenu.Trigger asChild>{trigger}</RadixContextMenu.Trigger>
      <RadixContextMenu.Portal>
        <RadixContextMenu.Content className="menu-content">{children}</RadixContextMenu.Content>
      </RadixContextMenu.Portal>
    </RadixContextMenu.Root>
  );
}

// ==================== MenuItem ====================

interface MenuItemProps {
  children: ReactNode;
  icon?: LucideIcon;
  onSelect?: () => void;
  disabled?: boolean;
  danger?: boolean;
  /** Right-aligned gray hint text */
  hint?: string;
  /** Right-aligned mono text (for commit OIDs, etc.) */
  shortcut?: string;
  /** Additional class names */
  className?: string;
}

export const MenuItem = forwardRef<HTMLDivElement, MenuItemProps>(
  ({ children, icon: Icon, onSelect, disabled, danger, hint, shortcut, className }, ref) => {
    return (
      <RadixContextMenu.Item
        ref={ref}
        className={cn(danger ? 'menu-item-danger' : 'menu-item', className)}
        onSelect={onSelect}
        disabled={disabled}
      >
        {Icon && <Icon size={14} />}
        <span>{children}</span>
        {hint && <span className="menu-hint">{hint}</span>}
        {shortcut && (
          <span className="ml-auto text-sm text-(--text-tertiary) font-mono">{shortcut}</span>
        )}
      </RadixContextMenu.Item>
    );
  }
);
MenuItem.displayName = 'MenuItem';

// ==================== MenuSeparator ====================

export function MenuSeparator() {
  return <RadixContextMenu.Separator className="menu-separator" />;
}

// ==================== SubMenu ====================

type SubMenuWidth = 'sm' | 'md' | 'lg';

const widthClasses: Record<SubMenuWidth, string> = {
  sm: 'min-w-32',
  md: 'min-w-40',
  lg: 'min-w-48',
};

interface SubMenuProps {
  children: ReactNode;
  icon?: LucideIcon;
  label: string;
  disabled?: boolean;
  /** Content width preset */
  minWidth?: SubMenuWidth;
  /** Custom max-height for scrollable lists */
  maxHeight?: string;
  /** Additional class names for content */
  className?: string;
}

export function SubMenu({
  children,
  icon: Icon,
  label,
  disabled,
  minWidth = 'md',
  maxHeight,
  className,
}: SubMenuProps) {
  return (
    <RadixContextMenu.Sub>
      <RadixContextMenu.SubTrigger className="menu-item" disabled={disabled}>
        {Icon && <Icon size={14} />}
        <span>{label}</span>
        <ChevronRight size={14} className="menu-chevron" />
      </RadixContextMenu.SubTrigger>
      <RadixContextMenu.Portal>
        <RadixContextMenu.SubContent
          className={cn('menu-content', widthClasses[minWidth], className)}
          style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
        >
          {children}
        </RadixContextMenu.SubContent>
      </RadixContextMenu.Portal>
    </RadixContextMenu.Sub>
  );
}

// ==================== Re-exports for advanced use cases ====================
// For custom submenu content, interactive elements, etc.

export const ContextMenuRoot = RadixContextMenu.Root;
export const ContextMenuTrigger = RadixContextMenu.Trigger;
export const ContextMenuPortal = RadixContextMenu.Portal;
export const ContextMenuContent = RadixContextMenu.Content;
export const ContextMenuSub = RadixContextMenu.Sub;
export const ContextMenuSubTrigger = RadixContextMenu.SubTrigger;
export const ContextMenuSubContent = RadixContextMenu.SubContent;
export const ContextMenuRadioGroup = RadixContextMenu.RadioGroup;
export const ContextMenuRadioItem = RadixContextMenu.RadioItem;
export const ContextMenuItemIndicator = RadixContextMenu.ItemIndicator;

// Type exports
export type { ContextMenuProps, MenuItemProps, SubMenuProps };
