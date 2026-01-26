import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import type { Operation } from '@/store/operationStore';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number }) => {
      if (key === 'ui.operations.count') return `${opts?.count} operations`;
      if (key.startsWith('ui.operations.stages.')) return key.split('.').pop();
      return key;
    },
  }),
}));

const mockOperations = new Map<string, Operation>();

vi.mock('@/store/operationStore', () => ({
  useOperationStore: (selector: (s: { operations: Map<string, Operation> }) => unknown) =>
    selector({ operations: mockOperations }),
}));

import { OperationsIndicator } from './OperationsIndicator';

describe('OperationsIndicator', () => {
  beforeEach(() => {
    mockOperations.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not render when no operations', () => {
    const { container } = render(<OperationsIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it('should render when there are operations', () => {
    mockOperations.set('op-1', {
      id: 'op-1',
      name: 'Test Operation',
      category: 'general',
      startedAt: Date.now(),
    });

    render(<OperationsIndicator />);

    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should show count badge with correct number', () => {
    mockOperations.set('op-1', {
      id: 'op-1',
      name: 'Op 1',
      category: 'general',
      startedAt: Date.now(),
    });
    mockOperations.set('op-2', {
      id: 'op-2',
      name: 'Op 2',
      category: 'general',
      startedAt: Date.now(),
    });
    mockOperations.set('op-3', {
      id: 'op-3',
      name: 'Op 3',
      category: 'general',
      startedAt: Date.now(),
    });

    render(<OperationsIndicator />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should have correct aria attributes', () => {
    mockOperations.set('op-1', {
      id: 'op-1',
      name: 'Op 1',
      category: 'general',
      startedAt: Date.now(),
    });

    render(<OperationsIndicator />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'ui.operations.ariaLabel');
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('should toggle dropdown on click', async () => {
    mockOperations.set('op-1', {
      id: 'op-1',
      name: 'Test Operation',
      category: 'general',
      startedAt: Date.now(),
    });

    render(<OperationsIndicator />);

    const button = screen.getByRole('button');
    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByText('ui.operations.title')).toBeInTheDocument();
    expect(screen.getByText('Test Operation')).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('should close dropdown on click outside', async () => {
    mockOperations.set('op-1', {
      id: 'op-1',
      name: 'Test Operation',
      category: 'general',
      startedAt: Date.now(),
    });

    render(<OperationsIndicator />);

    const button = screen.getByRole('button');
    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByText('ui.operations.title')).toBeInTheDocument();

    // Click outside
    await act(async () => {
      fireEvent.mouseDown(document.body);
    });

    expect(screen.queryByText('ui.operations.title')).not.toBeInTheDocument();
  });

  it('should close dropdown on escape key', async () => {
    mockOperations.set('op-1', {
      id: 'op-1',
      name: 'Test Operation',
      category: 'general',
      startedAt: Date.now(),
    });

    render(<OperationsIndicator />);

    const button = screen.getByRole('button');
    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByText('ui.operations.title')).toBeInTheDocument();

    // Press escape
    await act(async () => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });

    expect(screen.queryByText('ui.operations.title')).not.toBeInTheDocument();
  });

  it('should show operation description when present', async () => {
    mockOperations.set('op-1', {
      id: 'op-1',
      name: 'Test Operation',
      description: 'This is a description',
      category: 'general',
      startedAt: Date.now(),
    });

    render(<OperationsIndicator />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(screen.getByText('This is a description')).toBeInTheDocument();
  });

  it('should render indicator when operation has progress', () => {
    mockOperations.set('op-1', {
      id: 'op-1',
      name: 'Clone',
      category: 'git',
      startedAt: Date.now(),
      progress: {
        stage: 'Receiving',
        totalObjects: 100,
        receivedObjects: 50,
        indexedObjects: 25,
        receivedBytes: 1024 * 1024, // 1 MB
        totalDeltas: 10,
        indexedDeltas: 5,
      },
    });

    render(<OperationsIndicator />);

    // Indicator should render with progress operations
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should format duration correctly', async () => {
    const tenSecondsAgo = Date.now() - 10000;
    mockOperations.set('op-1', {
      id: 'op-1',
      name: 'Test',
      category: 'general',
      startedAt: tenSecondsAgo,
    });

    render(<OperationsIndicator />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(screen.getByText('10s')).toBeInTheDocument();
  });

  it('should format duration in minutes', async () => {
    const twoMinutesAgo = Date.now() - 125000; // 2m 5s
    mockOperations.set('op-1', {
      id: 'op-1',
      name: 'Test',
      category: 'general',
      startedAt: twoMinutesAgo,
    });

    render(<OperationsIndicator />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(screen.getByText('2m 5s')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    mockOperations.set('op-1', {
      id: 'op-1',
      name: 'Test',
      category: 'general',
      startedAt: Date.now(),
    });

    const { container } = render(<OperationsIndicator className="custom-class" />);

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('should update duration every second', async () => {
    const now = Date.now();
    mockOperations.set('op-1', {
      id: 'op-1',
      name: 'Test',
      category: 'general',
      startedAt: now,
    });

    render(<OperationsIndicator />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(screen.getByText('0s')).toBeInTheDocument();

    // Advance time by 5 seconds
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText('5s')).toBeInTheDocument();
  });
});
