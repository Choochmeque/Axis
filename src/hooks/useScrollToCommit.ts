import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/hooks/useToast';
import { useRepositoryStore } from '@/store/repositoryStore';

const MAX_ITERATIONS = 50;
const LOADING_CHECK_INTERVAL = 100;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface UseScrollToCommitOptions {
  scrollToIndex: (index: number) => void;
}

export function useScrollToCommit({ scrollToIndex }: UseScrollToCommitOptions) {
  const { t } = useTranslation();
  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState(0);
  const cancelledRef = useRef(false);

  const scrollTargetOid = useRepositoryStore((s) => s.scrollTargetOid);
  const setScrollTarget = useRepositoryStore((s) => s.setScrollTarget);

  const scrollToCommit = useCallback(
    async (oid: string) => {
      const { commits } = useRepositoryStore.getState();

      // Already loaded? Scroll immediately
      const existingIndex = commits.findIndex((c) => c.oid === oid);
      if (existingIndex !== -1) {
        scrollToIndex(existingIndex);
        return;
      }

      // Start search with inline indicator
      cancelledRef.current = false;
      setIsSearching(true);
      setProgress(commits.length);

      let iterations = 0;

      while (iterations < MAX_ITERATIONS && !cancelledRef.current) {
        const state = useRepositoryStore.getState();

        // Found?
        const foundIndex = state.commits.findIndex((c) => c.oid === oid);
        if (foundIndex !== -1) {
          setIsSearching(false);
          scrollToIndex(foundIndex);
          return;
        }

        // No more to load?
        if (!state.hasMoreCommits) break;

        // Wait if already loading
        if (state.isLoadingMoreCommits) {
          await sleep(LOADING_CHECK_INTERVAL);
          continue;
        }

        // Load next batch and update progress
        await state.loadMoreCommits();
        iterations++;
        setProgress(useRepositoryStore.getState().commits.length);
      }

      // Cleanup
      setIsSearching(false);

      if (!cancelledRef.current) {
        toast.warning(
          t('history.scrollToCommit.notFound'),
          t('history.scrollToCommit.notFoundDesc', { oid: oid.slice(0, 7) })
        );
      }
    },
    [scrollToIndex, t]
  );

  const cancelScroll = useCallback(() => {
    cancelledRef.current = true;
    setIsSearching(false);
    setScrollTarget(null);
  }, [setScrollTarget]);

  // Watch for scroll target from store (set by sidebar, etc.)
  useEffect(() => {
    if (scrollTargetOid) {
      const targetOid = scrollTargetOid;
      setScrollTarget(null);
      // Defer to avoid setState in effect body
      queueMicrotask(() => {
        scrollToCommit(targetOid);
      });
    }
  }, [scrollTargetOid, scrollToCommit, setScrollTarget]);

  return { scrollToCommit, cancelScroll, isSearching, progress };
}
