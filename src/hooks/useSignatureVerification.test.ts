import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SigningFormat } from '@/types';
import { useSignatureVerification } from './useSignatureVerification';

const mockVerifyCommitSignature = vi.fn();

vi.mock('@/services/api', () => ({
  signingApi: {
    verifyCommitSignature: (...args: unknown[]) => mockVerifyCommitSignature(...args),
  },
}));

describe('useSignatureVerification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return idle state when oid is null', () => {
    const { result } = renderHook(() => useSignatureVerification(null, SigningFormat.Gpg));

    expect(result.current.verification).toBeNull();
    expect(result.current.isVerifying).toBe(false);
    expect(mockVerifyCommitSignature).not.toHaveBeenCalled();
  });

  it('should return idle state when format is null', () => {
    const { result } = renderHook(() => useSignatureVerification('abc123', null));

    expect(result.current.verification).toBeNull();
    expect(result.current.isVerifying).toBe(false);
    expect(mockVerifyCommitSignature).not.toHaveBeenCalled();
  });

  it('should return idle state when both oid and format are null', () => {
    const { result } = renderHook(() => useSignatureVerification(null, null));

    expect(result.current.verification).toBeNull();
    expect(result.current.isVerifying).toBe(false);
    expect(mockVerifyCommitSignature).not.toHaveBeenCalled();
  });

  it('should show verifying state initially when oid and format are provided', () => {
    mockVerifyCommitSignature.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useSignatureVerification('abc123', SigningFormat.Gpg));

    expect(result.current.isVerifying).toBe(true);
    expect(result.current.verification).toBeNull();
    expect(mockVerifyCommitSignature).toHaveBeenCalledWith('abc123', SigningFormat.Gpg);
  });

  it('should return verification result on success', async () => {
    const mockResult = { verified: true, signer: 'Test User <test@example.com>' };
    mockVerifyCommitSignature.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useSignatureVerification('abc123', SigningFormat.Gpg));

    await waitFor(() => {
      expect(result.current.isVerifying).toBe(false);
    });

    expect(result.current.verification).toEqual(mockResult);
  });

  it('should return unverified result', async () => {
    const mockResult = { verified: false, signer: null };
    mockVerifyCommitSignature.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useSignatureVerification('abc123', SigningFormat.Ssh));

    await waitFor(() => {
      expect(result.current.isVerifying).toBe(false);
    });

    expect(result.current.verification).toEqual(mockResult);
  });

  it('should handle errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockVerifyCommitSignature.mockRejectedValue(new Error('Verification failed'));

    const { result } = renderHook(() => useSignatureVerification('abc123', SigningFormat.Gpg));

    await waitFor(() => {
      expect(result.current.isVerifying).toBe(false);
    });

    expect(result.current.verification).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Signature verification failed for abc123')
    );

    consoleSpy.mockRestore();
  });

  it('should discard stale results when oid changes', async () => {
    let resolveFirst: (value: unknown) => void;
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const secondResult = { verified: true, signer: 'Second' };

    mockVerifyCommitSignature.mockReturnValueOnce(firstPromise).mockResolvedValueOnce(secondResult);

    const { result, rerender } = renderHook(
      ({ oid, format }) => useSignatureVerification(oid, format),
      {
        initialProps: {
          oid: 'first-oid' as string | null,
          format: SigningFormat.Gpg as SigningFormat | null,
        },
      }
    );

    expect(result.current.isVerifying).toBe(true);

    // Change oid before first resolves
    rerender({ oid: 'second-oid', format: SigningFormat.Gpg });

    await waitFor(() => {
      expect(result.current.isVerifying).toBe(false);
    });

    expect(result.current.verification).toEqual(secondResult);

    // Now resolve the first (stale) request - should be ignored
    await act(async () => {
      resolveFirst!({ verified: false, signer: 'First' });
    });

    // Should still have second result
    expect(result.current.verification).toEqual(secondResult);
  });

  it('should reset to idle state when oid becomes null', async () => {
    const mockResult = { verified: true, signer: 'Test' };
    mockVerifyCommitSignature.mockResolvedValue(mockResult);

    const { result, rerender } = renderHook(
      ({ oid, format }) => useSignatureVerification(oid, format),
      {
        initialProps: {
          oid: 'abc123' as string | null,
          format: SigningFormat.Gpg as SigningFormat | null,
        },
      }
    );

    await waitFor(() => {
      expect(result.current.isVerifying).toBe(false);
    });

    expect(result.current.verification).toEqual(mockResult);

    // Now set oid to null
    rerender({ oid: null, format: SigningFormat.Gpg });

    expect(result.current.verification).toBeNull();
    expect(result.current.isVerifying).toBe(false);
  });

  it('should verify with SSH format', async () => {
    const mockResult = { verified: true, signer: 'ssh-key' };
    mockVerifyCommitSignature.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useSignatureVerification('abc123', SigningFormat.Ssh));

    await waitFor(() => {
      expect(result.current.isVerifying).toBe(false);
    });

    expect(mockVerifyCommitSignature).toHaveBeenCalledWith('abc123', SigningFormat.Ssh);
    expect(result.current.verification).toEqual(mockResult);
  });

  it('should re-verify when oid changes', async () => {
    const firstResult = { verified: true, signer: 'First' };
    const secondResult = { verified: false, signer: null };

    mockVerifyCommitSignature
      .mockResolvedValueOnce(firstResult)
      .mockResolvedValueOnce(secondResult);

    const { result, rerender } = renderHook(
      ({ oid, format }) => useSignatureVerification(oid, format),
      {
        initialProps: {
          oid: 'oid-1' as string | null,
          format: SigningFormat.Gpg as SigningFormat | null,
        },
      }
    );

    await waitFor(() => {
      expect(result.current.isVerifying).toBe(false);
    });

    expect(result.current.verification).toEqual(firstResult);

    rerender({ oid: 'oid-2', format: SigningFormat.Gpg });

    await waitFor(() => {
      expect(result.current.isVerifying).toBe(false);
    });

    expect(result.current.verification).toEqual(secondResult);
    expect(mockVerifyCommitSignature).toHaveBeenCalledTimes(2);
  });
});
