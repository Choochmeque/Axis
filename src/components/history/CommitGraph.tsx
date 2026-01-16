import { useEffect, useRef } from 'react';
import { Graph, GG } from '@/lib/graph';
import type { GraphCommit } from '@/types';
import { RefType } from '@/types';

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

		// Transform commits to GG format
		const gitCommits: GG.GitCommit[] = commits.map((c) => ({
			hash: c.oid,
			parents: c.parentOids,
			author: c.author.name,
			email: c.author.email,
			date: new Date(c.timestamp).getTime(),
			message: c.summary,
			heads: c.refs?.filter((r) => r.refType === RefType.LocalBranch).map((r) => r.name) ?? [],
			tags: c.refs?.filter((r) => r.refType === RefType.Tag).map((r) => ({ name: r.name, annotated: false })) ?? [],
			remotes: c.refs?.filter((r) => r.refType === RefType.RemoteBranch).map((r) => ({ name: r.name, remote: null })) ?? [],
			stash: null,
		}));

		const commitLookup: { [hash: string]: number } = {};
		gitCommits.forEach((c, i) => {
			commitLookup[c.hash] = i;
		});

		// Create graph - pass element directly
		const graph = new Graph(graphContainer, containerRef.current, config, muteConfig);
		graph.loadCommits(gitCommits, commitHead, commitLookup, false);
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
