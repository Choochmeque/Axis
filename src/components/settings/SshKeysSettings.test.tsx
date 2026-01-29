import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SshKeysSettings } from './SshKeysSettings';
import { sshKeysApi } from '@/services/api';
import { open } from '@tauri-apps/plugin-dialog';
import type { SshKeyInfo } from '@/types';

// Mock the API
vi.mock('@/services/api', () => ({
  sshKeysApi: {
    list: vi.fn(),
    generate: vi.fn(),
    getPublicKey: vi.fn(),
    getFingerprint: vi.fn(),
    delete: vi.fn(),
    import: vi.fn(),
    export: vi.fn(),
  },
}));

// Mock clipboard
vi.mock('@/lib/actions', () => ({
  copyToClipboard: vi.fn().mockResolvedValue(true),
}));

const mockKeys: SshKeyInfo[] = [
  {
    path: '/home/user/.ssh/id_ed25519',
    publicKeyPath: '/home/user/.ssh/id_ed25519.pub',
    keyType: 'Ed25519',
    comment: 'user@example.com',
    fingerprint: 'SHA256:abc123def456',
    bits: null,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    path: '/home/user/.ssh/id_rsa',
    publicKeyPath: '/home/user/.ssh/id_rsa.pub',
    keyType: 'Rsa',
    comment: null,
    fingerprint: 'SHA256:xyz789',
    bits: 4096,
    createdAt: '2024-06-01T00:00:00Z',
  },
];

describe('SshKeysSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sshKeysApi.list).mockResolvedValue(mockKeys);
  });

  it('should load and display SSH keys', async () => {
    render(<SshKeysSettings />);

    await waitFor(() => {
      expect(sshKeysApi.list).toHaveBeenCalled();
    });

    expect(screen.getByText('user@example.com')).toBeInTheDocument();
    expect(screen.getByText('Ed25519')).toBeInTheDocument();
    expect(screen.getByText('SHA256:abc123def456')).toBeInTheDocument();
    expect(screen.getByText('Rsa')).toBeInTheDocument();
    expect(screen.getByText('SHA256:xyz789')).toBeInTheDocument();
  });

  it('should show empty state when no keys', async () => {
    vi.mocked(sshKeysApi.list).mockResolvedValue([]);

    render(<SshKeysSettings />);

    await waitFor(() => {
      expect(screen.getByText('No SSH keys found')).toBeInTheDocument();
    });

    expect(screen.getByText('Generate or import an SSH key to get started.')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    vi.mocked(sshKeysApi.list).mockReturnValue(new Promise(() => {}));

    render(<SshKeysSettings />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should open generate dialog when create is clicked', async () => {
    render(<SshKeysSettings />);

    await waitFor(() => {
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Create'));

    await waitFor(() => {
      expect(screen.getByText('Generate SSH Key')).toBeInTheDocument();
    });
  });

  it('should generate a key successfully', async () => {
    vi.mocked(sshKeysApi.generate).mockResolvedValue(mockKeys[0]);

    render(<SshKeysSettings />);

    await waitFor(() => {
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });

    // Open generate dialog
    fireEvent.click(screen.getByTitle('Create'));

    await waitFor(() => {
      expect(screen.getByText('Generate SSH Key')).toBeInTheDocument();
    });

    // Fill in filename
    const filenameInput = screen.getByPlaceholderText('id_ed25519');
    fireEvent.change(filenameInput, { target: { value: 'my_key' } });

    // Click generate
    fireEvent.click(screen.getByText('Generate Key'));

    await waitFor(() => {
      expect(sshKeysApi.generate).toHaveBeenCalledWith({
        algorithm: 'Ed25519',
        comment: null,
        passphrase: null,
        filename: 'my_key',
        bits: null,
      });
    });
  });

  it('should show error when filename is empty on generate', async () => {
    render(<SshKeysSettings />);

    await waitFor(() => {
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Create'));

    await waitFor(() => {
      expect(screen.getByText('Generate SSH Key')).toBeInTheDocument();
    });

    // Click generate without filename
    fireEvent.click(screen.getByText('Generate Key'));

    await waitFor(() => {
      expect(screen.getByText('Filename is required')).toBeInTheDocument();
    });
  });

  it('should open import dialog when import is clicked', async () => {
    render(<SshKeysSettings />);

    await waitFor(() => {
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Import SSH Key'));

    await waitFor(() => {
      expect(screen.getByText('Import SSH Key')).toBeInTheDocument();
      expect(screen.getByText('Browse')).toBeInTheDocument();
    });
  });

  it('should import a key via file dialog', async () => {
    vi.mocked(open).mockResolvedValue('/tmp/my_key');
    vi.mocked(sshKeysApi.import).mockResolvedValue(mockKeys[0]);

    render(<SshKeysSettings />);

    await waitFor(() => {
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Import SSH Key'));

    await waitFor(() => {
      expect(screen.getByText('Import SSH Key')).toBeInTheDocument();
    });

    // Click browse
    fireEvent.click(screen.getByText('Browse'));

    await waitFor(() => {
      expect(open).toHaveBeenCalled();
    });

    // Fill target filename
    const targetInput = screen.getByPlaceholderText('imported_key');
    fireEvent.change(targetInput, { target: { value: 'imported' } });

    // Click import button
    fireEvent.click(screen.getByText('Import Key'));

    await waitFor(() => {
      expect(sshKeysApi.import).toHaveBeenCalledWith({
        sourcePath: '/tmp/my_key',
        targetFilename: 'imported',
      });
    });
  });

  it('should copy public key when copy button is clicked', async () => {
    const { copyToClipboard } = await import('@/lib/actions');
    vi.mocked(sshKeysApi.getPublicKey).mockResolvedValue('ssh-ed25519 AAAA... user@example.com');

    render(<SshKeysSettings />);

    await waitFor(() => {
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });

    // Click the copy button for first key
    const copyButtons = screen.getAllByTitle('Copy Public Key');
    fireEvent.click(copyButtons[0]);

    await waitFor(() => {
      expect(sshKeysApi.getPublicKey).toHaveBeenCalledWith('/home/user/.ssh/id_ed25519');
      expect(copyToClipboard).toHaveBeenCalledWith(
        'ssh-ed25519 AAAA... user@example.com',
        'Public key copied to clipboard'
      );
    });
  });

  it('should show delete confirmation dialog', async () => {
    render(<SshKeysSettings />);

    await waitFor(() => {
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });

    // Click delete button for first key
    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Delete SSH Key')).toBeInTheDocument();
      expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    });
  });

  it('should delete a key when confirmed', async () => {
    vi.mocked(sshKeysApi.delete).mockResolvedValue(undefined as unknown as null);

    render(<SshKeysSettings />);

    await waitFor(() => {
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });

    // Click delete
    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Delete SSH Key')).toBeInTheDocument();
    });

    // Confirm delete
    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => {
      expect(sshKeysApi.delete).toHaveBeenCalledWith('/home/user/.ssh/id_ed25519');
    });
  });

  it('should open export dialog when export button is clicked', async () => {
    render(<SshKeysSettings />);

    await waitFor(() => {
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });

    // Click export button for first key
    const exportButtons = screen.getAllByTitle('Export');
    fireEvent.click(exportButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Export SSH Key')).toBeInTheDocument();
      expect(screen.getByText('Export public key only')).toBeInTheDocument();
    });
  });

  it('should export a key via directory dialog', async () => {
    vi.mocked(open).mockResolvedValue('/tmp/export');
    vi.mocked(sshKeysApi.export).mockResolvedValue(undefined as unknown as null);

    render(<SshKeysSettings />);

    await waitFor(() => {
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });

    // Click export
    const exportButtons = screen.getAllByTitle('Export');
    fireEvent.click(exportButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Export SSH Key')).toBeInTheDocument();
    });

    // Click browse
    fireEvent.click(screen.getByText('Browse'));

    await waitFor(() => {
      expect(open).toHaveBeenCalledWith(expect.objectContaining({ directory: true }));
    });

    // Click export button
    fireEvent.click(screen.getByText('Export Key'));

    await waitFor(() => {
      expect(sshKeysApi.export).toHaveBeenCalledWith({
        keyPath: '/home/user/.ssh/id_ed25519',
        targetDir: '/tmp/export',
        publicOnly: true,
      });
    });
  });

  it('should show generate error on API failure', async () => {
    vi.mocked(sshKeysApi.generate).mockRejectedValue(new Error('Key generation failed'));

    render(<SshKeysSettings />);

    await waitFor(() => {
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Create'));

    await waitFor(() => {
      expect(screen.getByText('Generate SSH Key')).toBeInTheDocument();
    });

    const filenameInput = screen.getByPlaceholderText('id_ed25519');
    fireEvent.change(filenameInput, { target: { value: 'test_key' } });

    fireEvent.click(screen.getByText('Generate Key'));

    await waitFor(() => {
      expect(screen.getByText('Key generation failed')).toBeInTheDocument();
    });
  });

  it('should display key with no comment using filename', async () => {
    render(<SshKeysSettings />);

    await waitFor(() => {
      // The second key has no comment, should show filename
      expect(screen.getByText('id_rsa')).toBeInTheDocument();
    });
  });

  it('should render section title and description', async () => {
    render(<SshKeysSettings />);

    await waitFor(() => {
      expect(screen.getByText('SSH Keys')).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        'Manage SSH keys stored in ~/.ssh for authentication with remote repositories.'
      )
    ).toBeInTheDocument();
  });
});
