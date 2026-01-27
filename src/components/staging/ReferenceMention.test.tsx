import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReferenceMention } from './ReferenceMention';
import type { ReferenceItem } from '@/hooks/useReferenceMention';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('ReferenceMention', () => {
  const mockItems: ReferenceItem[] = [
    { type: 'issue', number: 1, title: 'Fix bug' },
    { type: 'pr', number: 2, title: 'Add feature' },
    { type: 'issue', number: 3, title: 'Update docs' },
  ];

  let mockAnchorElement: HTMLTextAreaElement;

  beforeEach(() => {
    // Create a mock textarea in the DOM
    mockAnchorElement = document.createElement('textarea');
    mockAnchorElement.value = 'Testing #';
    mockAnchorElement.style.cssText = 'width: 300px; height: 100px; padding: 8px; font-size: 14px;';
    document.body.appendChild(mockAnchorElement);

    // Mock getBoundingClientRect
    vi.spyOn(mockAnchorElement, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      left: 100,
      right: 400,
      bottom: 200,
      width: 300,
      height: 100,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    });

    // Mock getComputedStyle
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      paddingLeft: '8px',
      paddingTop: '8px',
      borderLeftWidth: '1px',
      borderTopWidth: '1px',
      lineHeight: '20px',
      fontSize: '14px',
      fontStyle: 'normal',
      fontWeight: '400',
      fontFamily: 'sans-serif',
    } as CSSStyleDeclaration);
  });

  afterEach(() => {
    document.body.removeChild(mockAnchorElement);
    vi.restoreAllMocks();
  });

  const defaultProps = {
    isOpen: true,
    items: mockItems,
    selectedIndex: 0,
    anchorElement: null as HTMLTextAreaElement | null,
    cursorPosition: 9,
    onSelect: vi.fn(),
    onClose: vi.fn(),
  };

  it('should return null when not open', () => {
    const { container } = render(<ReferenceMention {...defaultProps} isOpen={false} />);

    expect(container.firstChild).toBeNull();
  });

  it('should return null when no position calculated', () => {
    const { container } = render(<ReferenceMention {...defaultProps} anchorElement={null} />);

    expect(container.firstChild).toBeNull();
  });

  it('should render dropdown when open with valid anchor', async () => {
    render(<ReferenceMention {...defaultProps} anchorElement={mockAnchorElement} />);

    // Give time for the position calculation
    await vi.waitFor(() => {
      const dropdown = document.querySelector('.reference-mention-dropdown');
      expect(dropdown).toBeInTheDocument();
    });
  });

  it('should show no matches message when items is empty', async () => {
    render(<ReferenceMention {...defaultProps} anchorElement={mockAnchorElement} items={[]} />);

    await vi.waitFor(() => {
      expect(screen.getByText('staging.referenceMention.noMatches')).toBeInTheDocument();
    });
  });

  it('should render items with correct icons', async () => {
    render(<ReferenceMention {...defaultProps} anchorElement={mockAnchorElement} />);

    await vi.waitFor(() => {
      // Check that issue numbers are rendered
      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('#2')).toBeInTheDocument();
      expect(screen.getByText('#3')).toBeInTheDocument();
    });
  });

  it('should render item titles', async () => {
    render(<ReferenceMention {...defaultProps} anchorElement={mockAnchorElement} />);

    await vi.waitFor(() => {
      expect(screen.getByText('Fix bug')).toBeInTheDocument();
      expect(screen.getByText('Add feature')).toBeInTheDocument();
      expect(screen.getByText('Update docs')).toBeInTheDocument();
    });
  });

  it('should mark selected item', async () => {
    render(
      <ReferenceMention {...defaultProps} anchorElement={mockAnchorElement} selectedIndex={1} />
    );

    await vi.waitFor(() => {
      const items = document.querySelectorAll('.reference-mention-item');
      expect(items[1]).toHaveAttribute('data-selected', 'true');
    });
  });

  it('should call onSelect when item is clicked', async () => {
    const onSelect = vi.fn();

    render(
      <ReferenceMention {...defaultProps} anchorElement={mockAnchorElement} onSelect={onSelect} />
    );

    await vi.waitFor(() => {
      const item = screen.getByText('Fix bug');
      fireEvent.click(item.closest('.reference-mention-item')!);
    });

    expect(onSelect).toHaveBeenCalledWith(mockItems[0]);
  });

  it('should call onClose when clicking outside', async () => {
    const onClose = vi.fn();

    render(
      <ReferenceMention {...defaultProps} anchorElement={mockAnchorElement} onClose={onClose} />
    );

    await vi.waitFor(() => {
      const dropdown = document.querySelector('.reference-mention-dropdown');
      expect(dropdown).toBeInTheDocument();
    });

    // Click outside
    fireEvent.mouseDown(document.body);

    expect(onClose).toHaveBeenCalled();
  });

  it('should not close when clicking inside dropdown', async () => {
    const onClose = vi.fn();

    render(
      <ReferenceMention {...defaultProps} anchorElement={mockAnchorElement} onClose={onClose} />
    );

    await vi.waitFor(() => {
      const dropdown = document.querySelector('.reference-mention-dropdown');
      fireEvent.mouseDown(dropdown!);
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('should not close when clicking anchor element', async () => {
    const onClose = vi.fn();

    render(
      <ReferenceMention {...defaultProps} anchorElement={mockAnchorElement} onClose={onClose} />
    );

    await vi.waitFor(() => {
      fireEvent.mouseDown(mockAnchorElement);
    });

    expect(onClose).not.toHaveBeenCalled();
  });
});
