import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastContainer, ToastHistoryDropdown } from './toast';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@/lib/dateUtils', () => ({
  formatRelativeTime: (date: number) => `${Math.round((Date.now() - date) / 1000)}s ago`,
}));

// Use any to avoid strict type checking in tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockToasts: any[] = [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockHistory: any[] = [];
const mockRemoveToast = vi.fn();
const mockClearHistory = vi.fn();

vi.mock('@/store/toastStore', () => ({
  useToastStore: (selector: (state: unknown) => unknown) => {
    const state = {
      toasts: mockToasts,
      history: mockHistory,
      removeToast: mockRemoveToast,
      clearHistory: mockClearHistory,
    };
    return selector(state);
  },
}));

describe('ToastContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToasts.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return null when no toasts', () => {
    const { container } = render(<ToastContainer />);

    expect(container.firstChild).toBeNull();
  });

  it('should render toast items', () => {
    mockToasts.push({
      id: '1',
      type: 'success',
      title: 'Success!',
      description: 'Operation completed',
      duration: 3000,
    });

    render(<ToastContainer />);

    expect(screen.getByText('Success!')).toBeInTheDocument();
    expect(screen.getByText('Operation completed')).toBeInTheDocument();
  });

  it('should render error toast', () => {
    mockToasts.push({
      id: '1',
      type: 'error',
      title: 'Error occurred',
      duration: 0,
    });

    render(<ToastContainer />);

    const toast = screen.getByRole('alert');
    expect(toast).toHaveAttribute('aria-live', 'assertive');
    expect(screen.getByText('Error occurred')).toBeInTheDocument();
  });

  it('should render warning toast', () => {
    mockToasts.push({
      id: '1',
      type: 'warning',
      title: 'Warning',
      duration: 3000,
    });

    render(<ToastContainer />);

    expect(screen.getByText('Warning')).toBeInTheDocument();
  });

  it('should render info toast', () => {
    mockToasts.push({
      id: '1',
      type: 'info',
      title: 'Info',
      duration: 3000,
    });

    render(<ToastContainer />);

    expect(screen.getByText('Info')).toBeInTheDocument();
  });

  it('should call removeToast when dismiss button clicked', () => {
    mockToasts.push({
      id: 'toast-1',
      type: 'success',
      title: 'Test',
      duration: 3000,
    });

    render(<ToastContainer />);

    fireEvent.click(screen.getByLabelText('ui.toast.dismiss'));

    expect(mockRemoveToast).toHaveBeenCalledWith('toast-1');
  });

  it('should render multiple toasts', () => {
    mockToasts.push(
      { id: '1', type: 'success', title: 'Toast 1', duration: 3000 },
      { id: '2', type: 'error', title: 'Toast 2', duration: 3000 }
    );

    render(<ToastContainer />);

    expect(screen.getByText('Toast 1')).toBeInTheDocument();
    expect(screen.getByText('Toast 2')).toBeInTheDocument();
  });

  it('should not show progress bar when duration is 0', () => {
    mockToasts.push({
      id: '1',
      type: 'success',
      title: 'No Progress',
      duration: 0,
    });

    render(<ToastContainer />);

    expect(document.querySelector('.toast-progress-track')).not.toBeInTheDocument();
  });

  it('should show progress bar when duration > 0', () => {
    mockToasts.push({
      id: '1',
      type: 'success',
      title: 'With Progress',
      duration: 3000,
    });

    render(<ToastContainer />);

    expect(document.querySelector('.toast-progress-track')).toBeInTheDocument();
  });
});

describe('ToastHistoryDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHistory.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render trigger button', () => {
    render(<ToastHistoryDropdown />);

    expect(screen.getByTitle('ui.toast.notifications')).toBeInTheDocument();
  });

  it('should show badge when history has items', () => {
    mockHistory.push({
      id: '1',
      type: 'success',
      title: 'Test',
      dismissedAt: Date.now(),
    });

    render(<ToastHistoryDropdown />);

    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should not show badge when history is empty', () => {
    render(<ToastHistoryDropdown />);

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('should toggle dropdown on click', () => {
    render(<ToastHistoryDropdown />);

    const trigger = screen.getByTitle('ui.toast.notifications');

    fireEvent.click(trigger);
    expect(screen.getByText('ui.toast.noNotifications')).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.queryByText('ui.toast.noNotifications')).not.toBeInTheDocument();
  });

  it('should show empty message when no history', () => {
    render(<ToastHistoryDropdown />);

    fireEvent.click(screen.getByTitle('ui.toast.notifications'));

    expect(screen.getByText('ui.toast.noNotifications')).toBeInTheDocument();
  });

  it('should render history items', () => {
    mockHistory.push({
      id: '1',
      type: 'success',
      title: 'Completed',
      description: 'Task done',
      dismissedAt: Date.now() - 5000,
    });

    render(<ToastHistoryDropdown />);

    fireEvent.click(screen.getByTitle('ui.toast.notifications'));

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Task done')).toBeInTheDocument();
  });

  it('should show clear all button when history has items', () => {
    mockHistory.push({
      id: '1',
      type: 'success',
      title: 'Test',
      dismissedAt: Date.now(),
    });

    render(<ToastHistoryDropdown />);

    fireEvent.click(screen.getByTitle('ui.toast.notifications'));

    expect(screen.getByText('ui.toast.clearAll')).toBeInTheDocument();
  });

  it('should call clearHistory when clear button clicked', () => {
    mockHistory.push({
      id: '1',
      type: 'success',
      title: 'Test',
      dismissedAt: Date.now(),
    });

    render(<ToastHistoryDropdown />);

    fireEvent.click(screen.getByTitle('ui.toast.notifications'));
    fireEvent.click(screen.getByText('ui.toast.clearAll'));

    expect(mockClearHistory).toHaveBeenCalled();
  });

  it('should close on escape key', () => {
    render(<ToastHistoryDropdown />);

    fireEvent.click(screen.getByTitle('ui.toast.notifications'));
    expect(screen.getByText('ui.toast.noNotifications')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByText('ui.toast.noNotifications')).not.toBeInTheDocument();
  });

  it('should close on click outside', () => {
    render(
      <div>
        <ToastHistoryDropdown />
        <div data-testid="outside">Outside</div>
      </div>
    );

    fireEvent.click(screen.getByTitle('ui.toast.notifications'));
    expect(screen.getByText('ui.toast.noNotifications')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside'));

    expect(screen.queryByText('ui.toast.noNotifications')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<ToastHistoryDropdown className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
