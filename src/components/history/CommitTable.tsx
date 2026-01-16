// Extracted from vscode-git-graph main.ts renderTable()
import { useRef, useCallback, useLayoutEffect } from 'react';
import type { GraphCommit } from '@/types';
import { RefType } from '@/types';

const UNCOMMITTED = 'uncommitted';
const COLUMN_MIN_WIDTH = 40;
const COLUMN_LEFT_RIGHT_PADDING = 24;
const COLUMN_AUTO = -101;

const SVG_ICONS = {
	branch: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24"><path fill="currentColor" d="M15 4c0-1.11-.89-2-2-2s-2 .89-2 2c0 1.11.89 2 2 2s2-.89 2-2zm-6.5 2a2 2 0 0 0-2 2 2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0-2-2zm6.5 18h-2v-7.5l-3.5-1-1.5 1V24h-2V15l1.5-1-1.5-1V8a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v5l-1.5 1 1.5 1v9z"/></svg>',
	tag: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24"><path fill="currentColor" d="M5.5 7A1.5 1.5 0 0 1 4 5.5 1.5 1.5 0 0 1 5.5 4 1.5 1.5 0 0 1 7 5.5 1.5 1.5 0 0 1 5.5 7m15.91 4.58-9-9C12.05 2.22 11.55 2 11 2H4c-1.11 0-2 .89-2 2v7c0 .55.22 1.05.59 1.41l9 9c.36.36.86.59 1.41.59.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42z"/></svg>',
	stash: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24"><path fill="currentColor" d="M5 21h14a2 2 0 0 0 2-2v-1H3v1a2 2 0 0 0 2 2m14-15H5a2 2 0 0 0-2 2v1h18V8a2 2 0 0 0-2-2m0 4H5v6h14v-6z"/></svg>',
};

function escapeHtml(str: string): string {
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function abbrevCommit(hash: string): string {
	return hash.substring(0, 7);
}

function formatShortDate(timestamp: string): { formatted: string; title: string } {
	const date = new Date(timestamp);
	return {
		formatted: date.toLocaleDateString(),
		title: date.toLocaleString()
	};
}

function getBranchLabels(heads: string[], remotes: { name: string; remote: string | null }[]): {
	heads: { name: string; remotes: string[] }[];
	remotes: { name: string; remote: string | null }[];
} {
	return {
		heads: heads.map(h => ({ name: h, remotes: [] })),
		remotes: remotes
	};
}

interface CommitTableProps {
	commits: GraphCommit[];
	vertexColours: number[];
	widthsAtVertices: number[];
	mutedCommits: boolean[];
	commitHead: string | null;
	onCommitClick: (index: number, commit: GraphCommit) => void;
}

export function CommitTable({
	commits,
	vertexColours,
	widthsAtVertices,
	mutedCommits,
	commitHead,
	onCommitClick,
}: CommitTableProps) {
	const tableRef = useRef<HTMLTableElement>(null);
	const columnWidthsRef = useRef<number[]>([COLUMN_AUTO, COLUMN_AUTO, COLUMN_AUTO, COLUMN_AUTO, COLUMN_AUTO]);
	const resizeStateRef = useRef<{
		col: number;
		colIndex: number;
		mouseX: number;
		overlay: HTMLElement | null;
	}>({ col: -1, colIndex: -1, mouseX: -1, overlay: null });

	const getColHeaders = useCallback(() => {
		if (!tableRef.current) return [];
		return Array.from(tableRef.current.querySelectorAll('.tableColHeader')) as HTMLElement[];
	}, []);

	const makeTableFixedLayout = useCallback(() => {
		const cols = getColHeaders();
		if (!tableRef.current || cols.length === 0) return;

		const columnWidths = columnWidthsRef.current;
		cols[0].style.width = columnWidths[0] + 'px';
		cols[0].style.padding = '';
		for (let i = 2; i < cols.length; i++) {
			const colNum = parseInt(cols[i].dataset.col ?? '0');
			cols[i].style.width = columnWidths[colNum] + 'px';
		}
		tableRef.current.className = 'fixedLayout';
	}, [getColHeaders]);

	const handleResizeMove = useCallback((e: MouseEvent) => {
		const state = resizeStateRef.current;
		const columnWidths = columnWidthsRef.current;
		const cols = getColHeaders();

		if (state.col > -1 && cols.length > 0) {
			let mouseDeltaX = e.clientX - state.mouseX;

			if (state.col === 0) {
				if (columnWidths[0] + mouseDeltaX < COLUMN_MIN_WIDTH) {
					mouseDeltaX = -columnWidths[0] + COLUMN_MIN_WIDTH;
				}
				if (cols[1].clientWidth - COLUMN_LEFT_RIGHT_PADDING - mouseDeltaX < COLUMN_MIN_WIDTH) {
					mouseDeltaX = cols[1].clientWidth - COLUMN_LEFT_RIGHT_PADDING - COLUMN_MIN_WIDTH;
				}
				columnWidths[0] += mouseDeltaX;
				cols[0].style.width = columnWidths[0] + 'px';

				// Sync graph width with column
				const graphElem = document.getElementById('commitGraph');
				if (graphElem) {
					graphElem.style.width = columnWidths[0] + 'px';
				}
			} else {
				const colWidth = state.col !== 1
					? columnWidths[state.col]
					: cols[1].clientWidth - COLUMN_LEFT_RIGHT_PADDING;
				let nextCol = state.col + 1;
				while (nextCol < columnWidths.length && columnWidths[nextCol] < 0) nextCol++;

				if (colWidth + mouseDeltaX < COLUMN_MIN_WIDTH) {
					mouseDeltaX = -colWidth + COLUMN_MIN_WIDTH;
				}
				if (columnWidths[nextCol] - mouseDeltaX < COLUMN_MIN_WIDTH) {
					mouseDeltaX = columnWidths[nextCol] - COLUMN_MIN_WIDTH;
				}
				if (state.col !== 1) {
					columnWidths[state.col] += mouseDeltaX;
					cols[state.colIndex].style.width = columnWidths[state.col] + 'px';
				}
				columnWidths[nextCol] -= mouseDeltaX;
				cols[state.colIndex + 1].style.width = columnWidths[nextCol] + 'px';
			}
			state.mouseX = e.clientX;
		}
	}, [getColHeaders]);

	const handleResizeEnd = useCallback(() => {
		const state = resizeStateRef.current;
		if (state.col > -1) {
			state.col = -1;
			state.colIndex = -1;
			state.mouseX = -1;
			if (state.overlay) {
				state.overlay.remove();
				state.overlay = null;
			}
		}
	}, []);

	const handleResizeStart = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
		const target = e.target as HTMLElement;
		if (!target.classList.contains('resizeCol')) return;

		const col = parseInt(target.dataset.col ?? '-1');
		if (col < 0) return;

		const cols = getColHeaders();
		const columnWidths = columnWidthsRef.current;
		const state = resizeStateRef.current;

		state.col = col;
		state.mouseX = e.clientX;

		const isAuto = columnWidths[0] === COLUMN_AUTO;
		for (let j = 0; j < cols.length; j++) {
			const curCol = parseInt(cols[j].dataset.col ?? '0');
			if (isAuto && curCol !== 1) {
				columnWidths[curCol] = cols[j].clientWidth - COLUMN_LEFT_RIGHT_PADDING;
			}
			if (curCol === col) {
				state.colIndex = j;
			}
		}
		if (isAuto) makeTableFixedLayout();

		// Create overlay for capturing mouse events
		const overlay = document.createElement('div');
		overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;cursor:col-resize;';
		overlay.addEventListener('mousemove', handleResizeMove);
		overlay.addEventListener('mouseup', handleResizeEnd);
		overlay.addEventListener('mouseleave', handleResizeEnd);
		document.body.appendChild(overlay);
		state.overlay = overlay;
	}, [getColHeaders, makeTableFixedLayout, handleResizeMove, handleResizeEnd]);

	// Set auto layout on mount
	useLayoutEffect(() => {
		if (tableRef.current && commits.length > 0) {
			tableRef.current.className = 'autoLayout';
		}
	}, [commits.length]);

	// Cleanup on unmount
	useLayoutEffect(() => {
		return () => {
			const state = resizeStateRef.current;
			if (state.overlay) {
				state.overlay.remove();
				state.overlay = null;
			}
		};
	}, []);

	const currentHash = commits.length > 0 && commits[0].oid === UNCOMMITTED ? UNCOMMITTED : commitHead;

	const handleClick = (e: React.MouseEvent) => {
		// Don't handle clicks on resize handles
		if ((e.target as HTMLElement).classList.contains('resizeCol')) return;

		const row = (e.target as HTMLElement).closest('tr.commit');
		if (row) {
			const index = parseInt(row.getAttribute('data-id') ?? '-1');
			if (index >= 0 && index < commits.length) {
				onCommitClick(index, commits[index]);
			}
		}
	};

	// Build table HTML
	let rowsHtml = '';
	for (let i = 0; i < commits.length; i++) {
		const commit = commits[i];
		const message = '<span class="text">' + escapeHtml(commit.summary) + '</span>';
		const date = formatShortDate(commit.timestamp);

		// Get refs
		const heads = commit.refs?.filter(r => r.refType === RefType.LocalBranch).map(r => r.name) ?? [];
		const remotes = commit.refs?.filter(r => r.refType === RefType.RemoteBranch).map(r => ({ name: r.name, remote: null })) ?? [];
		const tags = commit.refs?.filter(r => r.refType === RefType.Tag) ?? [];

		const branchLabels = getBranchLabels(heads, remotes);
		let refBranches = '', refTags = '';
		let branchCheckedOutAtCommit: string | null = null;

		for (let j = 0; j < branchLabels.heads.length; j++) {
			const refName = escapeHtml(branchLabels.heads[j].name);
			const headRef = commit.refs?.find(r => r.refType === RefType.LocalBranch && r.name === branchLabels.heads[j].name);
			const refActive = headRef?.isHead ?? false;
			let refHtml = '<span class="gitRef head' + (refActive ? ' active' : '') + '" data-name="' + refName + '" style="background-color:var(--git-graph-color' + (vertexColours[i] % 8) + ')">' + SVG_ICONS.branch + '<span class="gitRefName" data-fullref="' + refName + '">' + refName + '</span>';
			for (let k = 0; k < branchLabels.heads[j].remotes.length; k++) {
				const remoteName = escapeHtml(branchLabels.heads[j].remotes[k]);
				refHtml += '<span class="gitRefHeadRemote" data-remote="' + remoteName + '" data-fullref="' + escapeHtml(branchLabels.heads[j].remotes[k] + '/' + branchLabels.heads[j].name) + '">' + remoteName + '</span>';
			}
			refHtml += '</span>';
			refBranches = refActive ? refHtml + refBranches : refBranches + refHtml;
			if (refActive) branchCheckedOutAtCommit = branchLabels.heads[j].name;
		}

		for (let j = 0; j < branchLabels.remotes.length; j++) {
			const refName = escapeHtml(branchLabels.remotes[j].name);
			refBranches += '<span class="gitRef remote" data-name="' + refName + '" data-remote="' + (branchLabels.remotes[j].remote !== null ? escapeHtml(branchLabels.remotes[j].remote!) : '') + '" style="background-color:var(--git-graph-color' + (vertexColours[i] % 8) + ')">' + SVG_ICONS.branch + '<span class="gitRefName" data-fullref="' + refName + '">' + refName + '</span></span>';
		}

		for (let j = 0; j < tags.length; j++) {
			const refName = escapeHtml(tags[j].name);
			refTags += '<span class="gitRef tag" data-name="' + refName + '" style="background-color:#6e6e6e">' + SVG_ICONS.tag + '<span class="gitRefName" data-fullref="' + refName + '">' + refName + '</span></span>';
		}

		const commitDot = commit.oid === commitHead
			? '<span class="commitHeadDot" title="' + (branchCheckedOutAtCommit !== null
				? 'The branch ' + escapeHtml('"' + branchCheckedOutAtCommit + '"') + ' is currently checked out at this commit'
				: 'This commit is currently checked out'
			) + '."></span>'
			: '';

		const isUncommitted = commit.oid === UNCOMMITTED;
		const authorDisplay = isUncommitted ? '*' : escapeHtml(commit.author.name);
		const authorTitle = isUncommitted ? 'Uncommitted changes' : escapeHtml(commit.author.name + ' <' + commit.author.email + '>');
		const commitDisplay = isUncommitted ? '*' : abbrevCommit(commit.oid);
		const commitTitle = isUncommitted ? 'Uncommitted changes' : escapeHtml(commit.oid);

		rowsHtml += '<tr class="commit' + (commit.oid === currentHash ? ' current' : '') + (mutedCommits[i] ? ' mute' : '') + '"' + (isUncommitted ? ' id="uncommittedChanges"' : '') + ' data-id="' + i + '" data-oid="' + commit.oid + '" data-color="' + vertexColours[i] + '">' +
			'<td style="min-width:' + widthsAtVertices[i] + 'px"></td><td><span class="description">' + commitDot + refBranches + refTags + message + '</span></td>' +
			'<td class="dateCol text" title="' + date.title + '">' + date.formatted + '</td>' +
			'<td class="authorCol text" title="' + authorTitle + '">' + authorDisplay + '</td>' +
			'<td class="text" title="' + commitTitle + '">' + commitDisplay + '</td>' +
			'</tr>';
	}

	return (
		<div id="commitTable" onClick={handleClick}>
			<table ref={tableRef}>
				<thead>
					<tr id="tableColHeaders" onMouseDown={handleResizeStart}>
						<th id="tableHeaderGraphCol" className="tableColHeader" data-col="0">
							Graph
							<span className="resizeCol right" data-col="0" />
						</th>
						<th className="tableColHeader" data-col="1">
							<span className="resizeCol left" data-col="0" />
							Description
							<span className="resizeCol right" data-col="1" />
						</th>
						<th className="tableColHeader dateCol" data-col="2">
							<span className="resizeCol left" data-col="1" />
							Date
							<span className="resizeCol right" data-col="2" />
						</th>
						<th className="tableColHeader authorCol" data-col="3">
							<span className="resizeCol left" data-col="2" />
							Author
							<span className="resizeCol right" data-col="3" />
						</th>
						<th className="tableColHeader" data-col="4">
							<span className="resizeCol left" data-col="3" />
							Commit
						</th>
					</tr>
				</thead>
				<tbody dangerouslySetInnerHTML={{ __html: rowsHtml }} />
			</table>
		</div>
	);
}
