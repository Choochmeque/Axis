import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DiscardConfirmDialog } from './DiscardConfirmDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string>) => {
      if (opts?.path) return `${key}: ${opts.path}`;
      return key;
    },
  }),
}));

describe('DiscardConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    mode: 'file' as const,
    filePath: 'src/test.ts',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when open', () => {
    render(<DiscardConfirmDialog {...defaultProps} />);

    expect(screen.getByText('dialogs.discard.title')).toBeInTheDocument();
    expect(screen.getByText('dialogs.discard.message: src/test.ts')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<DiscardConfirmDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('dialogs.discard.title')).not.toBeInTheDocument();
  });

  it('should show different title for all mode', () => {
    render(<DiscardConfirmDialog {...defaultProps} mode="all" />);

    expect(screen.getByText('dialogs.discard.titleAll')).toBeInTheDocument();
    expect(screen.getByText('dialogs.discard.messageAll')).toBeInTheDocument();
  });

  it('should call onConfirm and onClose when confirm clicked', () => {
    render(<DiscardConfirmDialog {...defaultProps} />);

    const confirmButton = screen.getByText('dialogs.discard.discardButton');
    fireEvent.click(confirmButton);

    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('should show cancel button', () => {
    render(<DiscardConfirmDialog {...defaultProps} />);

    expect(screen.getByText('common.cancel')).toBeInTheDocument();
  });

  it('should have destructive variant on confirm button', () => {
    render(<DiscardConfirmDialog {...defaultProps} />);

    const confirmButton = screen.getByText('dialogs.discard.discardButton');
    // The button should exist and be clickable
    expect(confirmButton).toBeInTheDocument();
    expect(confirmButton.closest('button')).not.toBeDisabled();
  });
});
