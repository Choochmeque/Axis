import { useEffect, useRef } from 'react';
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

interface CommitGraphProps {
	commits: GraphCommit[];
	commitHead: string | null;
	expandedCommitIndex: number | null;
	config: GG.GraphConfig;
	muteConfig: GG.MuteCommitsConfig;
	onVertexHover?: (index: number | null) => void;
	findCommitElem?: (index: number) => HTMLElement | null;
}

export function CommitGraph({
	commits,
	commitHead,
	expandedCommitIndex,
	config,
	muteConfig,
}: CommitGraphProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const graphRef = useRef<Graph | null>(null);

	useEffect(() => {
		if (!containerRef.current || commits.length === 0) return;

		// Clear previous
		containerRef.current.innerHTML = '';

		// Create container div for Graph
		const graphContainer = document.createElement('div');
		graphContainer.id = 'commitGraph';
		containerRef.current.appendChild(graphContainer);

		// Position graph below table header (dynamically calculated)
		const headerRow = document.getElementById('tableColHeaders');
		if (headerRow) {
			graphContainer.style.top = headerRow.offsetHeight + 'px';
		}

		// Build commit lookup by oid
		const commitLookup: { [hash: string]: number } = {};
		commits.forEach((c, i) => {
			commitLookup[c.oid] = i;
		});

		// Create graph - pass GraphCommit[] directly
		const graph = new Graph(graphContainer, containerRef.current, config, muteConfig);
		graph.loadCommits(commits, commitHead, commitLookup, false);
		graph.render(expandedCommitIndex !== null ? {
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
			fileChangesScrollTop: 0
		} : null);
		graphRef.current = graph;
	}, [commits, commitHead, expandedCommitIndex, config, muteConfig]);

	return <div ref={containerRef} />;
}
