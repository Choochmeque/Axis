import { useState, useEffect, useRef } from 'react';
import { signingApi } from '@/services/api';
import { getErrorMessage } from '@/lib/errorUtils';
import type { SignatureVerification } from '@/types';
import type { SigningFormat } from '@/types';

interface UseSignatureVerificationResult {
  verification: SignatureVerification | null;
  isVerifying: boolean;
}

/**
 * Hook to verify a commit's signature on demand.
 * Only triggers verification when oid and format are non-null.
 * Results are cached on the backend, so repeat calls for the same OID are fast.
 */
export function useSignatureVerification(
  oid: string | null,
  format: SigningFormat | null
): UseSignatureVerificationResult {
  const [verification, setVerification] = useState<SignatureVerification | null>(null);
  const [fetchedOid, setFetchedOid] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!oid || !format) {
      return;
    }

    const requestId = ++requestIdRef.current;

    signingApi
      .verifyCommitSignature(oid, format)
      .then((result) => {
        if (requestIdRef.current === requestId) {
          setVerification(result);
          setFetchedOid(oid);
        }
      })
      .catch((err) => {
        if (requestIdRef.current === requestId) {
          console.error(`Signature verification failed for ${oid}: ${getErrorMessage(err)}`);
          setVerification(null);
          setFetchedOid(oid);
        }
      });
  }, [oid, format]);

  if (!oid || !format) {
    return { verification: null, isVerifying: false };
  }

  const isVerifying = fetchedOid !== oid;

  return { verification: isVerifying ? null : verification, isVerifying };
}
