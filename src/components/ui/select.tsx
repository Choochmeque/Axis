import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import * as React from 'react';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

type SelectProps = Omit<
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>,
  'onChange'
> & {
  children?: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onValueChange?: (value: string) => void;
  name?: string;
  required?: boolean;
  disabled?: boolean;
};

type SelectOptionNode = {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
};

type OptionElement = React.ReactElement<React.OptionHTMLAttributes<HTMLOptionElement>>;
type OptGroupElement = React.ReactElement<React.OptgroupHTMLAttributes<HTMLOptGroupElement>>;

function isOptionElement(node: React.ReactNode): node is OptionElement {
  return React.isValidElement(node) && node.type === 'option';
}

function isOptGroupElement(node: React.ReactNode): node is OptGroupElement {
  return React.isValidElement(node) && node.type === 'optgroup';
}

function getOptionNode(element: OptionElement): SelectOptionNode {
  return {
    value: String(element.props.value ?? ''),
    label: element.props.children,
    disabled: Boolean(element.props.disabled),
  };
}

const SelectItem = forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item ref={ref} className={cn('dropdown-item', className)} {...props}>
    <SelectPrimitive.ItemIndicator className="absolute left-2">
      <Check size={12} />
    </SelectPrimitive.ItemIndicator>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = 'SelectItem';

const SelectLabel = forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label ref={ref} className={cn('dropdown-label', className)} {...props} />
));
SelectLabel.displayName = 'SelectLabel';

const SelectGroup = SelectPrimitive.Group;

const SelectSeparator = forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator ref={ref} className={cn('dropdown-separator', className)} {...props} />
));
SelectSeparator.displayName = 'SelectSeparator';

const Select = forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      className,
      children,
      value,
      defaultValue,
      onChange,
      onValueChange,
      name,
      required,
      disabled,
      ...triggerProps
    },
    ref
  ) => {
    let placeholder: React.ReactNode | undefined;
    const items: React.ReactNode[] = [];

    React.Children.forEach(children, (child, index) => {
      if (!React.isValidElement(child)) return;

      if (isOptionElement(child)) {
        const option = getOptionNode(child);
        if (option.value === '' && placeholder === undefined) {
          placeholder = option.label;
        }
        if (option.value !== '') {
          items.push(
            <SelectItem
              key={`${option.value}-${index}`}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          );
        }
        return;
      }

      if (isOptGroupElement(child)) {
        const groupLabel = child.props.label;
        const groupItems: React.ReactNode[] = [];

        React.Children.forEach(child.props.children, (groupChild, groupIndex) => {
          if (!React.isValidElement(groupChild) || !isOptionElement(groupChild)) return;
          const option = getOptionNode(groupChild);
          if (option.value === '' && placeholder === undefined) {
            placeholder = option.label;
          }
          if (option.value !== '') {
            groupItems.push(
              <SelectItem
                key={`${option.value}-${groupIndex}`}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </SelectItem>
            );
          }
        });

        if (groupItems.length > 0) {
          items.push(
            <SelectGroup key={`group-${groupLabel ?? index}`}>
              {groupLabel ? <SelectLabel>{groupLabel}</SelectLabel> : null}
              {groupItems}
            </SelectGroup>
          );
        }
      }
    });

    const handleValueChange = (nextValue: string) => {
      onValueChange?.(nextValue);
      if (onChange) {
        onChange({ target: { value: nextValue } } as React.ChangeEvent<HTMLSelectElement>);
      }
    };

    return (
      <SelectPrimitive.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={handleValueChange}
        disabled={disabled}
        name={name}
        required={required}
      >
        <SelectPrimitive.Trigger
          ref={ref}
          className={cn('input flex items-center justify-between gap-2', className)}
          {...triggerProps}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon className="text-(--text-tertiary)">
            <ChevronDown size={14} />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="dropdown-content min-w-(--radix-select-trigger-width)"
            position="popper"
          >
            <SelectPrimitive.ScrollUpButton className="flex items-center justify-center py-1 text-(--text-tertiary)">
              <ChevronUp size={14} />
            </SelectPrimitive.ScrollUpButton>
            <SelectPrimitive.Viewport>{items}</SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollDownButton className="flex items-center justify-center py-1 text-(--text-tertiary)">
              <ChevronDown size={14} />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    );
  }
);
Select.displayName = 'Select';

export { Select };
