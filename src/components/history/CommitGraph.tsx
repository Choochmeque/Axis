import { useEffect } from 'react';
import { Graph, GG } from '@/lib/graph';
import type { GraphCommit } from '@/types';

export const defaultGraphConfig: GG.GraphConfig = {
  colours: [
    'var(--git-graph-color0)',
    'var(--git-graph-color1)',
    'var(--git-graph-color2)',
    'var(--git-graph-color3)',
    'var(--git-graph-color4)',
    'var(--git-graph-color5)',
    'var(--git-graph-color6)',
    'var(--git-graph-color7)',
  ],
  style: GG.GraphStyle.Rounded,
  grid: { x: 16, y: 24, offsetX: 16, offsetY: 12, expandY: 250 },
  uncommittedChanges: GG.GraphUncommittedChangesStyle.OpenCircleAtTheCheckedOutCommit,
};

export const defaultMuteConfig: GG.MuteCommitsConfig = {
  mergeCommits: false,
  commitsNotAncestorsOfHead: false,
};

// Build commit lookup map from commits array
export function buildCommitLookup(commits: GraphCommit[]): { [hash: string]: number } {
  const lookup: { [hash: string]: number } = {};
  commits.forEach((c, i) => {
    lookup[c.oid] = i;
  });
  return lookup;
}

// Create and load a Graph instance (for computing colors/widths and rendering)
export function createGraph(
  elem: HTMLElement,
  viewElem: HTMLElement,
  commits: GraphCommit[],
  commitHead: string | null,
  commitLookup: { [hash: string]: number },
  config: GG.GraphConfig,
  muteConfig: GG.MuteCommitsConfig
): Graph {
  const graph = new Graph(elem, viewElem, config, muteConfig);
  graph.loadCommits(commits, commitHead, commitLookup, false);
  return graph;
}

interface CommitGraphProps {
  graph: Graph;
  expandedCommitIndex: number | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  tableHeaderRef: React.RefObject<HTMLTableRowElement | null>;
}

export function CommitGraph({
  graph,
  expandedCommitIndex,
  containerRef,
  tableHeaderRef,
}: CommitGraphProps) {
  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous content
    containerRef.current.innerHTML = '';

    // Position graph below table header
    if (tableHeaderRef.current) {
      containerRef.current.style.top = tableHeaderRef.current.offsetHeight + 'px';
    }

    // Move the SVG from graph to our container
    const svg = (graph as unknown as { svg: SVGElement }).svg;
    if (svg) {
      containerRef.current.appendChild(svg);
    }

    // Render the graph
    graph.render(
      expandedCommitIndex !== null
        ? {
            index: expandedCommitIndex,
            commitHash: '',
            commitElem: null,
            compareWithHash: null,
            compareWithElem: null,
            commitDetails: null,
            fileChanges: null,
            fileTree: null,
            avatar: null,
            codeReview: null,
            lastViewedFile: null,
            loading: false,
            fileChangesScrollTop: 0,
          }
        : null
    );
  }, [graph, expandedCommitIndex, containerRef, tableHeaderRef]);

  return null; // Rendering handled via ref
}
