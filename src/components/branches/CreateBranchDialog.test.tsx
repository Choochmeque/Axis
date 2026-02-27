import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BranchType } from '@/types';
import { CreateBranchDialog } from './CreateBranchDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string>) => {
      if (opts) return `${key}: ${JSON.stringify(opts)}`;
      return key;
    },
  }),
}));

vi.mock('@/store/repositoryStore', () => ({
  useRepositoryStore: () => ({
    branches: [
      { name: 'main', isHead: true, branchType: BranchType.Local },
      { name: 'develop', isHead: false, branchType: BranchType.Local },
    ],
    loadBranches: vi.fn(),
    refreshRepository: vi.fn(),
  }),
}));

vi.mock('@/services/api', () => ({
  branchApi: {
    create: vi.fn(),
    checkout: vi.fn(),
  },
}));

vi.mock('@/hooks', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/branchValidation', () => ({
  validateBranchName: vi.fn(() => null),
}));

vi.mock('@/lib/errorUtils', () => ({
  getErrorMessage: (err: unknown) => String(err),
}));

describe('CreateBranchDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when open', () => {
    render(<CreateBranchDialog {...defaultProps} />);

    expect(screen.getByText('branches.create.title')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<CreateBranchDialog {...defaultProps} open={false} />);

    expect(screen.queryByText('branches.create.title')).not.toBeInTheDocument();
  });

  it('should render branch name input', () => {
    render(<CreateBranchDialog {...defaultProps} />);

    expect(screen.getByPlaceholderText('branches.create.namePlaceholder')).toBeInTheDocument();
  });

  it('should render create button', () => {
    render(<CreateBranchDialog {...defaultProps} />);

    expect(screen.getByText('branches.create.createButton')).toBeInTheDocument();
  });

  it('should render cancel button', () => {
    render(<CreateBranchDialog {...defaultProps} />);

    expect(screen.getByText('common.cancel')).toBeInTheDocument();
  });

  it('should render checkout checkbox', () => {
    render(<CreateBranchDialog {...defaultProps} />);

    expect(screen.getByText('branches.create.checkoutNewBranch')).toBeInTheDocument();
  });

  it('should update branch name on input', () => {
    render(<CreateBranchDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText('branches.create.namePlaceholder');
    fireEvent.change(input, { target: { value: 'feature/new-branch' } });

    expect(input).toHaveValue('feature/new-branch');
  });

  it('should disable create button when branch name is empty', () => {
    render(<CreateBranchDialog {...defaultProps} />);

    const createButton = screen.getByText('branches.create.createButton');
    expect(createButton).toBeDisabled();
  });

  it('should enable create button when branch name is filled', () => {
    render(<CreateBranchDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText('branches.create.namePlaceholder');
    fireEvent.change(input, { target: { value: 'feature/new-branch' } });

    const createButton = screen.getByText('branches.create.createButton');
    expect(createButton).not.toBeDisabled();
  });

  it('should render with startPoint prop', () => {
    render(<CreateBranchDialog {...defaultProps} startPoint="abc123" />);

    expect(screen.getByText('branches.create.title')).toBeInTheDocument();
  });

  it('should render starting point label', () => {
    render(<CreateBranchDialog {...defaultProps} />);

    expect(screen.getByText('branches.create.startingPointLabel')).toBeInTheDocument();
  });
});
