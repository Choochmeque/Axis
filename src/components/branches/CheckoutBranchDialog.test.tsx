import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CheckoutBranchDialog } from './CheckoutBranchDialog';
import { BranchType } from '@/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockCheckoutBranch = vi.fn();

const createMockState = () => ({
  branches: [
    { name: 'main', fullName: 'refs/heads/main', branchType: BranchType.Local, isHead: true },
    {
      name: 'feature-1',
      fullName: 'refs/heads/feature-1',
      branchType: BranchType.Local,
      isHead: false,
    },
    {
      name: 'origin/develop',
      fullName: 'refs/remotes/origin/develop',
      branchType: BranchType.Remote,
      isHead: false,
    },
  ] as Array<{ name: string; fullName: string; branchType: string; isHead: boolean }>,
  checkoutBranch: mockCheckoutBranch,
});

let mockState = createMockState();

vi.mock('../../store/repositoryStore', () => ({
  useRepositoryStore: (selector?: (state: ReturnType<typeof createMockState>) => unknown) => {
    if (typeof selector === 'function') {
      return selector(mockState);
    }
    return mockState;
  },
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => String(err),
}));

describe('CheckoutBranchDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    mockState = createMockState();
    vi.clearAllMocks();
  });

  it('should render when open', () => {
    render(<CheckoutBranchDialog {...defaultProps} />);

    expect(screen.getByText('branches.checkout.title')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<CheckoutBranchDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('branches.checkout.title')).not.toBeInTheDocument();
  });

  it('should display current branch info', () => {
    render(<CheckoutBranchDialog {...defaultProps} />);

    expect(screen.getByText('branches.checkout.currentBranchLabel')).toBeInTheDocument();
    expect(screen.getByText('main')).toBeInTheDocument();
  });

  it('should have branch select field', () => {
    render(<CheckoutBranchDialog {...defaultProps} />);

    expect(screen.getByText('branches.checkout.selectBranchLabel')).toBeInTheDocument();
  });

  it('should have cancel and checkout buttons', () => {
    render(<CheckoutBranchDialog {...defaultProps} />);

    expect(screen.getByText('common.cancel')).toBeInTheDocument();
    expect(screen.getByText('branches.checkout.checkoutButton')).toBeInTheDocument();
  });

  it('should disable checkout button when no branch selected', () => {
    render(<CheckoutBranchDialog {...defaultProps} />);

    const checkoutButton = screen.getByText('branches.checkout.checkoutButton');
    expect(checkoutButton.closest('button')).toBeDisabled();
  });

  it('should call onClose when cancel clicked', () => {
    render(<CheckoutBranchDialog {...defaultProps} />);

    const cancelButton = screen.getByText('common.cancel');
    fireEvent.click(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
