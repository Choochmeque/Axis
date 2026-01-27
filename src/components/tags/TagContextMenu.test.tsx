import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TagContextMenu } from './TagContextMenu';
import type { Tag, Remote } from '@/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string>) => {
      if (opts) return `${key}: ${JSON.stringify(opts)}`;
      return key;
    },
  }),
}));

vi.mock('@/lib/actions', () => ({
  copyToClipboard: vi.fn(),
}));

vi.mock('@/components/custom-actions', () => ({
  CustomActionsMenuSection: () => null,
}));

describe('TagContextMenu', () => {
  const mockTag: Tag = {
    name: 'v1.0.0',
    oid: 'abc123',
    message: 'Release v1.0.0',
    taggerName: 'Test User',
    taggerEmail: 'test@example.com',
    taggedAt: new Date().toISOString(),
    isAnnotated: true,
  };

  const mockRemotes: Remote[] = [
    { name: 'origin', url: 'https://github.com/user/repo.git', direction: 'Push' },
    { name: 'upstream', url: 'https://github.com/org/repo.git', direction: 'Push' },
  ];

  const defaultProps = {
    tag: mockTag,
    remotes: mockRemotes,
    children: <button>Trigger</button>,
    onCheckout: vi.fn(),
    onShowDetails: vi.fn(),
    onDiffAgainstCurrent: vi.fn(),
    onPush: vi.fn(),
    onDelete: vi.fn(),
  };

  it('should render trigger element', () => {
    render(<TagContextMenu {...defaultProps} />);

    expect(screen.getByText('Trigger')).toBeInTheDocument();
  });

  it('should render with minimal props', () => {
    render(
      <TagContextMenu tag={mockTag} remotes={[]}>
        <span>Tag</span>
      </TagContextMenu>
    );

    expect(screen.getByText('Tag')).toBeInTheDocument();
  });

  it('should render with empty remotes', () => {
    render(
      <TagContextMenu {...defaultProps} remotes={[]}>
        <span>Tag Button</span>
      </TagContextMenu>
    );

    expect(screen.getByText('Tag Button')).toBeInTheDocument();
  });
});
