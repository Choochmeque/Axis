import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TagDialog } from './TagDialog';
import { tagApi } from '../../services/api';

// Mock the API
vi.mock('../../services/api', () => ({
  tagApi: {
    create: vi.fn(),
  },
  remoteApi: {
    list: vi.fn().mockResolvedValue([]),
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

  it('should render when open', async () => {
    render(<TagDialog isOpen={true} onClose={() => {}} />);

    // Wait for async effects to complete
    await waitFor(() => {
      expect(screen.getByPlaceholderText('v1.0.0')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('should show target commit when provided', async () => {
    render(
      <TagDialog
        isOpen={true}
        onClose={() => {}}
        targetCommit="abc123def456"
        targetCommitSummary="Initial commit"
      />
    );

    // Wait for remoteApi.list to resolve
    await waitFor(() => {
      // The commit SHA is shown in the input field
      const commitInput = screen.getByDisplayValue('abc123def456');
      expect(commitInput).toBeInTheDocument();
    });

    // The summary is shown below the input
    expect(screen.getByText('Initial commit')).toBeInTheDocument();
  });

  it('should call onClose when cancel is clicked', async () => {
    const onClose = vi.fn();
    render(<TagDialog isOpen={true} onClose={onClose} />);

    // Wait for async effects to complete
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

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
        fullName: 'refs/tags/v1.0.0',
        targetOid: 'abc123',
        shortOid: 'abc123',
        isAnnotated: false,
        message: null,
        tagger: null,
        targetSummary: null,
        targetTime: null,
      },
    });

    render(<TagDialog isOpen={true} onClose={() => {}} onTagCreated={onTagCreated} />);

    // Enter tag name
    const nameInput = screen.getByPlaceholderText('v1.0.0');
    fireEvent.change(nameInput, { target: { value: 'v1.0.0' } });

    // Expand Advanced Options to access lightweight checkbox
    const advancedButton = screen.getByRole('button', { name: /Advanced Options/i });
    fireEvent.click(advancedButton);

    // Check lightweight tag checkbox
    const lightweightCheckbox = screen.getByRole('checkbox', { name: /Lightweight tag/i });
    fireEvent.click(lightweightCheckbox);

    // Submit
    const createButton = screen.getByRole('button', { name: 'Add' });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(tagApi.create).toHaveBeenCalledWith('v1.0.0', {
        target: null,
        annotated: false,
        message: null,
        force: false,
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
        fullName: 'refs/tags/v2.0.0',
        targetOid: 'abc123',
        shortOid: 'abc123',
        isAnnotated: true,
        message: 'Release v2.0.0',
        tagger: null,
        targetSummary: null,
        targetTime: null,
      },
    });

    render(<TagDialog isOpen={true} onClose={() => {}} />);

    // Enter tag name
    const nameInput = screen.getByPlaceholderText('v1.0.0');
    fireEvent.change(nameInput, { target: { value: 'v2.0.0' } });

    // Expand Advanced Options to access message field
    const advancedButton = screen.getByRole('button', { name: /Advanced Options/i });
    fireEvent.click(advancedButton);

    // Enter message (message field is shown by default when not lightweight)
    const messageInput = screen.getByPlaceholderText('Tag message...');
    fireEvent.change(messageInput, { target: { value: 'Release v2.0.0' } });

    // Submit
    const createButton = screen.getByRole('button', { name: 'Add' });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(tagApi.create).toHaveBeenCalledWith('v2.0.0', {
        target: null,
        annotated: true,
        message: 'Release v2.0.0',
        force: false,
      });
    });
  });

  it('should disable create button when tag name is empty', async () => {
    render(<TagDialog isOpen={true} onClose={() => {}} />);

    // Wait for async effects to complete
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: 'Add' });

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
        fullName: 'refs/tags/v1.0.0',
        targetOid: 'abc123',
        shortOid: 'abc123',
        isAnnotated: false,
        message: null,
        tagger: null,
        targetSummary: null,
        targetTime: null,
      },
    });

    render(<TagDialog isOpen={true} onClose={() => {}} />);

    const nameInput = screen.getByPlaceholderText('v1.0.0');
    fireEvent.change(nameInput, { target: { value: 'v1.0.0' } });

    const createButton = screen.getByRole('button', { name: 'Add' });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText("Tag 'v1.0.0' created successfully")).toBeInTheDocument();
    });
  });
});
