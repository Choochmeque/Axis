import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TabType, type Tab } from '@/store/tabsStore';

// Mock @dnd-kit/sortable
const mockUseSortable = vi.fn();
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: (args: { id: string }) => mockUseSortable(args),
}));

// Mock @dnd-kit/utilities
vi.mock('@dnd-kit/utilities', () => ({
  // eslint-disable-next-line @typescript-eslint/naming-convention -- Matches library export
  CSS: {
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Matches library export
    Transform: {
      toString: (transform: unknown) => (transform ? 'transform-string' : undefined),
    },
  },
}));

// Mock Radix Tabs to avoid context issues
vi.mock('@radix-ui/react-tabs', () => ({
  Trigger: ({
    children,
    className,
    style,
  }: {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <div data-testid="tab-trigger" className={className} style={style}>
      {children}
    </div>
  ),
}));

import { DraggableTab } from './DraggableTab';

describe('DraggableTab', () => {
  const defaultSortableReturn = {
    attributes: { role: 'button', tabIndex: 0 },
    listeners: { onPointerDown: vi.fn() },
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  };

  const mockTab: Tab = {
    id: 'test-tab',
    type: TabType.Repository,
    name: 'Test Repo',
    path: '/test/repo',
    isDirty: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSortable.mockReturnValue(defaultSortableReturn);
  });

  it('should render tab name', () => {
    render(<DraggableTab tab={mockTab} onClose={vi.fn()} />);

    expect(screen.getByText('Test Repo')).toBeInTheDocument();
  });

  it('should render close button', () => {
    const { container } = render(<DraggableTab tab={mockTab} onClose={vi.fn()} />);

    const closeButton = container.querySelector('button');
    expect(closeButton).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<DraggableTab tab={mockTab} onClose={onClose} />);

    const closeButton = container.querySelector('button');
    fireEvent.click(closeButton!);

    expect(onClose).toHaveBeenCalledWith(expect.any(Object), 'test-tab');
  });

  it('should show dirty indicator when tab is dirty', () => {
    const dirtyTab: Tab = { ...mockTab, isDirty: true };
    const { container } = render(<DraggableTab tab={dirtyTab} onClose={vi.fn()} />);

    const dirtyIndicator = container.querySelector('.bg-blue-500.rounded-full');
    expect(dirtyIndicator).toBeInTheDocument();
  });

  it('should not show dirty indicator when tab is not dirty', () => {
    const { container } = render(<DraggableTab tab={mockTab} onClose={vi.fn()} />);

    const dirtyIndicator = container.querySelector('.bg-blue-500.rounded-full');
    expect(dirtyIndicator).not.toBeInTheDocument();
  });

  it('should apply dragging class when isDragging is true', () => {
    mockUseSortable.mockReturnValue({
      ...defaultSortableReturn,
      isDragging: true,
    });

    render(<DraggableTab tab={mockTab} onClose={vi.fn()} />);

    const trigger = screen.getByTestId('tab-trigger');
    expect(trigger.className).toContain('tab-dragging');
  });

  it('should not apply dragging class when isDragging is false', () => {
    render(<DraggableTab tab={mockTab} onClose={vi.fn()} />);

    const trigger = screen.getByTestId('tab-trigger');
    expect(trigger.className).not.toContain('tab-dragging');
  });

  it('should pass transform and transition from useSortable to style', () => {
    const mockTransform = { x: 10, y: 0, scaleX: 1, scaleY: 1 };
    const mockTransition = 'transform 200ms ease';

    mockUseSortable.mockReturnValue({
      ...defaultSortableReturn,
      transform: mockTransform,
      transition: mockTransition,
    });

    render(<DraggableTab tab={mockTab} onClose={vi.fn()} />);

    // Verify useSortable was called and its values would be used
    expect(mockUseSortable).toHaveBeenCalledWith({ id: 'test-tab' });

    const trigger = screen.getByTestId('tab-trigger');
    // The transition should be applied (transform depends on CSS.Transform.toString mock)
    expect(trigger.style.transition).toBe(mockTransition);
  });

  it('should call useSortable with tab id', () => {
    render(<DraggableTab tab={mockTab} onClose={vi.fn()} />);

    expect(mockUseSortable).toHaveBeenCalledWith({ id: 'test-tab' });
  });

  it('should stop pointer event propagation on close button', () => {
    const { container } = render(<DraggableTab tab={mockTab} onClose={vi.fn()} />);

    const closeButton = container.querySelector('button');
    const pointerDownEvent = new PointerEvent('pointerdown', { bubbles: true });
    const stopPropagationSpy = vi.spyOn(pointerDownEvent, 'stopPropagation');

    fireEvent(closeButton!, pointerDownEvent);

    expect(stopPropagationSpy).toHaveBeenCalled();
  });
});
