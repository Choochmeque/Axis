import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string>) => {
      if (opts?.path) return `${key}: ${opts.path}`;
      return key;
    },
  }),
}));

describe('DeleteConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    filePath: 'src/file-to-delete.ts',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when open', () => {
    render(<DeleteConfirmDialog {...defaultProps} />);

    expect(screen.getByText('dialogs.deleteFile.title')).toBeInTheDocument();
    expect(
      screen.getByText('dialogs.deleteFile.message: src/file-to-delete.ts')
    ).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<DeleteConfirmDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('dialogs.deleteFile.title')).not.toBeInTheDocument();
  });

  it('should call onConfirm and onClose when delete clicked', () => {
    render(<DeleteConfirmDialog {...defaultProps} />);

    const deleteButton = screen.getByText('common.delete');
    fireEvent.click(deleteButton);

    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('should show cancel button', () => {
    render(<DeleteConfirmDialog {...defaultProps} />);

    expect(screen.getByText('common.cancel')).toBeInTheDocument();
  });

  it('should display file path in message', () => {
    render(<DeleteConfirmDialog {...defaultProps} filePath="another/path.js" />);

    expect(screen.getByText('dialogs.deleteFile.message: another/path.js')).toBeInTheDocument();
  });
});
