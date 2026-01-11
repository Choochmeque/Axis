import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TagDialog } from './TagDialog';
import { tagApi } from '../../services/api';

// Mock the API
vi.mock('../../services/api', () => ({
  tagApi: {
    create: vi.fn(),
  },
}));

describe('TagDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when not open', () => {
    render(<TagDialog isOpen={false} onClose={() => {}} />);
    expect(screen.queryByPlaceholderText('v1.0.0')).not.toBeInTheDocument();
  });

  it('should render when open', () => {
    render(<TagDialog isOpen={true} onClose={() => {}} />);
    expect(screen.getByPlaceholderText('v1.0.0')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Tag' })).toBeInTheDocument();
  });

  it('should show target commit when provided', () => {
    render(
      <TagDialog
        isOpen={true}
        onClose={() => {}}
        targetCommit="abc123def456"
        targetCommitSummary="Initial commit"
      />
    );

    expect(screen.getByText('abc123d')).toBeInTheDocument();
    expect(screen.getByText('Initial commit')).toBeInTheDocument();
  });

  it('should call onClose when cancel is clicked', () => {
    const onClose = vi.fn();
    render(<TagDialog isOpen={true} onClose={onClose} />);

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('should create lightweight tag', async () => {
    const onTagCreated = vi.fn();
    vi.mocked(tagApi.create).mockResolvedValue({
      success: true,
      message: 'Tag created',
      tag: {
        name: 'v1.0.0',
        full_name: 'refs/tags/v1.0.0',
        target_oid: 'abc123',
        short_oid: 'abc123',
        is_annotated: false,
        message: null,
        tagger: null,
        target_summary: null,
        target_time: null,
      },
    });

    render(<TagDialog isOpen={true} onClose={() => {}} onTagCreated={onTagCreated} />);

    // Uncheck annotated
    const annotatedCheckbox = screen.getByRole('checkbox');
    fireEvent.click(annotatedCheckbox);

    // Enter tag name
    const nameInput = screen.getByPlaceholderText('v1.0.0');
    fireEvent.change(nameInput, { target: { value: 'v1.0.0' } });

    // Submit
    const createButton = screen.getByRole('button', { name: 'Create Tag' });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(tagApi.create).toHaveBeenCalledWith('v1.0.0', {
        target: undefined,
        annotated: false,
        message: undefined,
      });
    });

    await waitFor(() => {
      expect(onTagCreated).toHaveBeenCalled();
    });
  });

  it('should create annotated tag with message', async () => {
    vi.mocked(tagApi.create).mockResolvedValue({
      success: true,
      message: 'Tag created',
      tag: {
        name: 'v2.0.0',
        full_name: 'refs/tags/v2.0.0',
        target_oid: 'abc123',
        short_oid: 'abc123',
        is_annotated: true,
        message: 'Release v2.0.0',
        tagger: null,
        target_summary: null,
        target_time: null,
      },
    });

    render(<TagDialog isOpen={true} onClose={() => {}} />);

    // Enter tag name
    const nameInput = screen.getByPlaceholderText('v1.0.0');
    fireEvent.change(nameInput, { target: { value: 'v2.0.0' } });

    // Enter message
    const messageInput = screen.getByPlaceholderText('Tag message...');
    fireEvent.change(messageInput, { target: { value: 'Release v2.0.0' } });

    // Submit
    const createButton = screen.getByRole('button', { name: 'Create Tag' });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(tagApi.create).toHaveBeenCalledWith('v2.0.0', {
        target: undefined,
        annotated: true,
        message: 'Release v2.0.0',
      });
    });
  });

  it('should disable create button when tag name is empty', async () => {
    render(<TagDialog isOpen={true} onClose={() => {}} />);

    const createButton = screen.getByRole('button', { name: 'Create Tag' });

    // Button should be disabled when tag name is empty
    expect(createButton).toBeDisabled();

    // Enter a name
    const nameInput = screen.getByPlaceholderText('v1.0.0');
    fireEvent.change(nameInput, { target: { value: 'v1.0.0' } });

    // Button should now be enabled
    expect(createButton).not.toBeDisabled();
  });

  it('should show success message after creation', async () => {
    vi.mocked(tagApi.create).mockResolvedValue({
      success: true,
      message: 'Tag created',
      tag: {
        name: 'v1.0.0',
        full_name: 'refs/tags/v1.0.0',
        target_oid: 'abc123',
        short_oid: 'abc123',
        is_annotated: false,
        message: null,
        tagger: null,
        target_summary: null,
        target_time: null,
      },
    });

    render(<TagDialog isOpen={true} onClose={() => {}} />);

    const nameInput = screen.getByPlaceholderText('v1.0.0');
    fireEvent.change(nameInput, { target: { value: 'v1.0.0' } });

    const createButton = screen.getByRole('button', { name: 'Create Tag' });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText("Tag 'v1.0.0' created successfully")).toBeInTheDocument();
    });
  });
});
