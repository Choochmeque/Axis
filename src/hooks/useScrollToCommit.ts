import { useState, useCallback, useRef, useEffect, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import { useRepositoryStore } from '@/store/repositoryStore';
import { toast } from '@/hooks/useToast';

const MAX_ITERATIONS = 50;
const LOADING_CHECK_INTERVAL = 100;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function scrollToElement(listRef: RefObject<HTMLDivElement | null>, oid: string): void {
  requestAnimationFrame(() => {
    const row = listRef.current?.querySelector(`[data-oid="${oid}"]`);
    row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

export function useScrollToCommit(listRef: RefObject<HTMLDivElement | null>) {
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
      if (commits.some((c) => c.oid === oid)) {
        scrollToElement(listRef, oid);
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
        if (state.commits.some((c) => c.oid === oid)) {
          setIsSearching(false);
          scrollToElement(listRef, oid);
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
    [listRef, t]
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
