import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MarkdownContent } from './markdown-content';

vi.mock('@/services/api', () => ({
  shellApi: {
    openUrl: vi.fn(),
  },
}));

describe('MarkdownContent', () => {
  it('should render GitHub-style safe HTML', () => {
    render(
      <MarkdownContent>
        {
          '<details><summary>Dependabot commands and options</summary><br /><p>See <a href="https://example.com">docs</a>.</p></details>'
        }
      </MarkdownContent>
    );

    expect(screen.getByText('Dependabot commands and options').tagName).toBe('SUMMARY');
    expect(screen.getByText('docs')).toHaveAttribute('href', 'https://example.com');
  });

  it('should sanitize unsafe raw HTML', () => {
    const { container } = render(
      <MarkdownContent>
        {
          '<img src="https://example.com/x.png" onerror="alert(1)" /><script>alert(1)</script><a href="javascript:alert(1)">bad</a>'
        }
      </MarkdownContent>
    );

    expect(container.querySelector('script')).not.toBeInTheDocument();
    expect(container.querySelector('img')).not.toHaveAttribute('onerror');
    expect(screen.getByText('bad')).not.toHaveAttribute('href');
  });
});
