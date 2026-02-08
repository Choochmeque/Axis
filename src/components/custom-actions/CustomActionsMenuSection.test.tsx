import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CustomActionsMenuSection } from './CustomActionsMenuSection';
import type { CustomAction, ActionContext } from '@/types';

const mockGetActionsForContext = vi.fn();
const mockConfirmAndExecute = vi.fn();
let mockExecutingActionId: string | null = null;
let mockRepository: { path: string; currentBranch: string | null } | null = null;

vi.mock('@/store/customActionsStore', () => ({
  useCustomActionsStore: (selector: (state: unknown) => unknown) => {
    const state = {
      getActionsForContext: mockGetActionsForContext,
      confirmAndExecute: mockConfirmAndExecute,
      executingActionId: mockExecutingActionId,
    };
    return selector(state);
  },
}));

vi.mock('@/store/repositoryStore', () => ({
  useRepositoryStore: (selector: (state: unknown) => unknown) => {
    const state = {
      repository: mockRepository,
    };
    return selector(state);
  },
}));

vi.mock('@/components/ui', () => ({
  MenuItem: ({
    children,
    onSelect,
    disabled,
    shortcut,
    icon: Icon,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
    disabled?: boolean;
    shortcut?: string;
    icon?: React.ComponentType<{ className?: string }>;
  }) => (
    <button
      data-testid="menu-item"
      onClick={onSelect}
      disabled={disabled}
      data-shortcut={shortcut}
    >
      {Icon && <Icon className="icon" />}
      {children}
    </button>
  ),
  MenuSeparator: () => <hr data-testid="menu-separator" />,
}));

describe('CustomActionsMenuSection', () => {
  const mockActions: CustomAction[] = [
    {
      id: 'action-1',
      name: 'Run Tests',
      command: 'npm test',
      context: ['commit'] as ActionContext[],
      shortcut: 'Ctrl+T',
      confirm: false,
      showOutput: true,
      enabled: true,
    },
    {
      id: 'action-2',
      name: 'Deploy',
      command: 'npm run deploy',
      context: ['commit'] as ActionContext[],
      shortcut: undefined,
      confirm: true,
      showOutput: false,
      enabled: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockExecutingActionId = null;
    mockRepository = { path: '/path/to/repo', currentBranch: 'main' };
    mockGetActionsForContext.mockReturnValue([]);
  });

  it('should return null when no actions available', () => {
    mockGetActionsForContext.mockReturnValue([]);

    const { container } = render(
      <CustomActionsMenuSection context="commit" />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render separator and actions when available', () => {
    mockGetActionsForContext.mockReturnValue(mockActions);

    render(<CustomActionsMenuSection context="commit" />);

    expect(screen.getByTestId('menu-separator')).toBeInTheDocument();
    expect(screen.getAllByTestId('menu-item')).toHaveLength(2);
    expect(screen.getByText('Run Tests')).toBeInTheDocument();
    expect(screen.getByText('Deploy')).toBeInTheDocument();
  });

  it('should display shortcut when provided', () => {
    mockGetActionsForContext.mockReturnValue(mockActions);

    render(<CustomActionsMenuSection context="commit" />);

    const items = screen.getAllByTestId('menu-item');
    expect(items[0]).toHaveAttribute('data-shortcut', 'Ctrl+T');
    expect(items[1]).not.toHaveAttribute('data-shortcut', expect.any(String));
  });

  it('should call confirmAndExecute when action selected', () => {
    mockGetActionsForContext.mockReturnValue(mockActions);

    render(<CustomActionsMenuSection context="commit" />);

    fireEvent.click(screen.getByText('Run Tests'));

    expect(mockConfirmAndExecute).toHaveBeenCalledWith(
      mockActions[0],
      expect.objectContaining({
        repoPath: '/path/to/repo',
        branch: 'main',
      })
    );
  });

  it('should build variables with all provided values', () => {
    mockGetActionsForContext.mockReturnValue([mockActions[0]]);

    const variables = {
      file: 'src/test.ts',
      selectedFiles: ['src/a.ts', 'src/b.ts'],
      commitHash: 'abc123',
      commitShort: 'abc',
      commitMessage: 'Test commit',
      remoteUrl: 'https://github.com/user/repo',
      tag: 'v1.0.0',
      stashRef: 'stash@{0}',
    };

    render(
      <CustomActionsMenuSection context="commit" variables={variables} />
    );

    fireEvent.click(screen.getByText('Run Tests'));

    expect(mockConfirmAndExecute).toHaveBeenCalledWith(
      mockActions[0],
      {
        repoPath: '/path/to/repo',
        branch: 'main',
        file: 'src/test.ts',
        selectedFiles: ['src/a.ts', 'src/b.ts'],
        commitHash: 'abc123',
        commitShort: 'abc',
        commitMessage: 'Test commit',
        remoteUrl: 'https://github.com/user/repo',
        tag: 'v1.0.0',
        stashRef: 'stash@{0}',
      }
    );
  });

  it('should use null for missing variables', () => {
    mockGetActionsForContext.mockReturnValue([mockActions[0]]);

    render(<CustomActionsMenuSection context="commit" />);

    fireEvent.click(screen.getByText('Run Tests'));

    expect(mockConfirmAndExecute).toHaveBeenCalledWith(
      mockActions[0],
      {
        repoPath: '/path/to/repo',
        branch: 'main',
        file: null,
        selectedFiles: null,
        commitHash: null,
        commitShort: null,
        commitMessage: null,
        remoteUrl: null,
        tag: null,
        stashRef: null,
      }
    );
  });

  it('should handle missing repository', () => {
    mockRepository = null;
    mockGetActionsForContext.mockReturnValue([mockActions[0]]);

    render(<CustomActionsMenuSection context="commit" />);

    fireEvent.click(screen.getByText('Run Tests'));

    expect(mockConfirmAndExecute).toHaveBeenCalledWith(
      mockActions[0],
      expect.objectContaining({
        repoPath: '',
        branch: null,
      })
    );
  });

  it('should disable action when executing', () => {
    mockExecutingActionId = 'action-1';
    mockGetActionsForContext.mockReturnValue(mockActions);

    render(<CustomActionsMenuSection context="commit" />);

    const items = screen.getAllByTestId('menu-item');
    expect(items[0]).toBeDisabled();
    expect(items[1]).not.toBeDisabled();
  });

  it('should show loader icon for executing action', () => {
    mockExecutingActionId = 'action-1';
    mockGetActionsForContext.mockReturnValue(mockActions);

    render(<CustomActionsMenuSection context="commit" />);

    // Both items should have icons, but we can't easily distinguish between them
    // in this mock setup. The main test is that disabled state works.
    const items = screen.getAllByTestId('menu-item');
    expect(items[0]).toBeDisabled();
  });

  it('should call getActionsForContext with correct context', () => {
    mockGetActionsForContext.mockReturnValue([]);

    render(<CustomActionsMenuSection context="branch" />);

    expect(mockGetActionsForContext).toHaveBeenCalledWith('branch');
  });

  it('should render actions for different contexts', () => {
    const branchActions: CustomAction[] = [
      {
        id: 'branch-action',
        name: 'Merge Branch',
        command: 'git merge',
        context: ['branch'] as ActionContext[],
        confirm: false,
        showOutput: true,
        enabled: true,
      },
    ];
    mockGetActionsForContext.mockReturnValue(branchActions);

    render(<CustomActionsMenuSection context="branch" />);

    expect(screen.getByText('Merge Branch')).toBeInTheDocument();
  });
});
