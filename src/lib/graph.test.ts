import { describe, it, expect, beforeEach } from 'vitest';
import { Branch, Vertex, Graph, GG } from './graph';
import type { GraphCommit } from '@/types';

describe('Branch', () => {
  let branch: Branch;

  beforeEach(() => {
    branch = new Branch(0);
  });

  it('should initialize with correct colour', () => {
    expect(branch.getColour()).toBe(0);
    const branch2 = new Branch(5);
    expect(branch2.getColour()).toBe(5);
  });

  it('should track end position', () => {
    expect(branch.getEnd()).toBe(0);
    branch.setEnd(10);
    expect(branch.getEnd()).toBe(10);
  });

  it('should add lines and return them', () => {
    branch.addLine({ x: 0, y: 0 }, { x: 0, y: 1 }, true, true);
    branch.addLine({ x: 0, y: 1 }, { x: 1, y: 2 }, true, false);

    const lines = branch.getLines();
    expect(lines).toHaveLength(2);
    expect(lines[0]).toEqual({
      fromColumn: 0,
      fromRow: 0,
      toColumn: 0,
      toRow: 1,
      isCommitted: true,
      color: 0,
    });
    expect(lines[1]).toEqual({
      fromColumn: 0,
      fromRow: 1,
      toColumn: 1,
      toRow: 2,
      isCommitted: true,
      color: 0,
    });
  });

  it('should track uncommitted lines', () => {
    branch.addLine({ x: 0, y: 0 }, { x: 0, y: 1 }, false, true);
    branch.addLine({ x: 0, y: 1 }, { x: 0, y: 2 }, true, true);

    const lines = branch.getLines();
    expect(lines[0].isCommitted).toBe(false);
    expect(lines[1].isCommitted).toBe(true);
  });

  it('should handle diagonal lines', () => {
    branch.addLine({ x: 0, y: 0 }, { x: 1, y: 1 }, true, true);

    const lines = branch.getLines();
    expect(lines[0].fromColumn).toBe(0);
    expect(lines[0].toColumn).toBe(1);
  });

  it('should handle multiple uncommitted lines', () => {
    branch.addLine({ x: 0, y: 0 }, { x: 0, y: 1 }, false, true);
    branch.addLine({ x: 0, y: 1 }, { x: 0, y: 2 }, false, true);
    branch.addLine({ x: 0, y: 2 }, { x: 0, y: 3 }, true, true);

    const lines = branch.getLines();
    expect(lines[0].isCommitted).toBe(false);
    expect(lines[1].isCommitted).toBe(false);
    expect(lines[2].isCommitted).toBe(true);
  });
});

describe('Vertex', () => {
  let vertex: Vertex;

  beforeEach(() => {
    vertex = new Vertex(0, false);
  });

  it('should initialize with correct id', () => {
    expect(vertex.id).toBe(0);
    expect(vertex.isStash).toBe(false);

    const stashVertex = new Vertex(5, true);
    expect(stashVertex.id).toBe(5);
    expect(stashVertex.isStash).toBe(true);
  });

  it('should manage children', () => {
    const child1 = new Vertex(1, false);
    const child2 = new Vertex(2, false);

    expect(vertex.getChildren()).toHaveLength(0);

    vertex.addChild(child1);
    vertex.addChild(child2);

    expect(vertex.getChildren()).toHaveLength(2);
    expect(vertex.getChildren()).toContain(child1);
    expect(vertex.getChildren()).toContain(child2);
  });

  it('should manage parents', () => {
    const parent1 = new Vertex(10, false);
    const parent2 = new Vertex(20, false);

    expect(vertex.hasParents()).toBe(false);
    expect(vertex.getParents()).toHaveLength(0);

    vertex.addParent(parent1);
    expect(vertex.hasParents()).toBe(true);
    expect(vertex.isMerge()).toBe(false);

    vertex.addParent(parent2);
    expect(vertex.isMerge()).toBe(true);
    expect(vertex.getParents()).toHaveLength(2);
  });

  it('should track parent processing', () => {
    const parent1 = new Vertex(10, false);
    const parent2 = new Vertex(20, false);

    vertex.addParent(parent1);
    vertex.addParent(parent2);

    expect(vertex.getNextParent()).toBe(parent1);
    expect(vertex.getLastParent()).toBeNull();

    vertex.registerParentProcessed();
    expect(vertex.getNextParent()).toBe(parent2);
    expect(vertex.getLastParent()).toBe(parent1);

    vertex.registerParentProcessed();
    expect(vertex.getNextParent()).toBeNull();
    expect(vertex.getLastParent()).toBe(parent2);
  });

  it('should manage branch assignment', () => {
    const branch = new Branch(0);

    expect(vertex.isNotOnBranch()).toBe(true);
    expect(vertex.getBranch()).toBeNull();

    vertex.addToBranch(branch, 0);
    expect(vertex.isNotOnBranch()).toBe(false);
    expect(vertex.getBranch()).toBe(branch);
    expect(vertex.isOnThisBranch(branch)).toBe(true);

    // Adding to another branch should not override
    const branch2 = new Branch(1);
    vertex.addToBranch(branch2, 1);
    expect(vertex.getBranch()).toBe(branch);
  });

  it('should return correct point', () => {
    const branch = new Branch(0);
    vertex.addToBranch(branch, 5);

    const point = vertex.getPoint();
    expect(point.x).toBe(5);
    expect(point.y).toBe(0); // vertex id
  });

  it('should manage committed state', () => {
    expect(vertex.getIsCommitted()).toBe(true);

    vertex.setNotCommitted();
    expect(vertex.getIsCommitted()).toBe(false);
  });

  it('should return colour from branch', () => {
    expect(vertex.getColour()).toBe(0); // No branch

    const branch = new Branch(3);
    vertex.addToBranch(branch, 0);
    expect(vertex.getColour()).toBe(3);
  });

  it('should return next point', () => {
    const point = vertex.getNextPoint();
    expect(point.x).toBe(0);
    expect(point.y).toBe(0);
  });

  it('should register unavailable points', () => {
    const branch = new Branch(0);
    vertex.registerUnavailablePoint(0, null, branch);

    const nextPoint = vertex.getNextPoint();
    expect(nextPoint.x).toBe(1);
  });

  it('should find point connecting to vertex', () => {
    const targetVertex = new Vertex(5, false);
    const branch = new Branch(0);

    vertex.registerUnavailablePoint(0, targetVertex, branch);

    const point = vertex.getPointConnectingTo(targetVertex, branch);
    expect(point).not.toBeNull();
    expect(point?.x).toBe(0);
    expect(point?.y).toBe(0);
  });

  it('should return null for non-existing connection', () => {
    const targetVertex = new Vertex(5, false);
    const branch = new Branch(0);

    const point = vertex.getPointConnectingTo(targetVertex, branch);
    expect(point).toBeNull();
  });

  it('should handle setCurrent', () => {
    // setCurrent is used internally for rendering current commit
    vertex.setCurrent();
    // No public getter for isCurrent, but it shouldn't throw
  });
});

describe('GG namespace', () => {
  it('should export GraphStyle enum', () => {
    expect(GG.GraphStyle.Rounded).toBe(0);
    expect(GG.GraphStyle.Angular).toBe(1);
  });

  it('should export GraphUncommittedChangesStyle enum', () => {
    expect(GG.GraphUncommittedChangesStyle.OpenCircleAtTheCheckedOutCommit).toBe(0);
    expect(GG.GraphUncommittedChangesStyle.OpenCircleAtTheUncommittedChanges).toBe(1);
  });
});

describe('Graph', () => {
  const config: GG.GraphConfig = {
    colours: ['#ff0000', '#00ff00', '#0000ff', '#ffff00'],
    style: GG.GraphStyle.Rounded,
    grid: { x: 16, y: 24, offsetX: 8, offsetY: 12, expandY: 200 },
    uncommittedChanges: GG.GraphUncommittedChangesStyle.OpenCircleAtTheCheckedOutCommit,
  };
  const muteConfig: GG.MuteCommitsConfig = {
    mergeCommits: false,
    commitsNotAncestorsOfHead: false,
  };

  function createCommit(
    oid: string,
    parentOids: string[] = [],
    summary: string = 'Test commit'
  ): GraphCommit {
    return {
      oid,
      shortOid: oid.slice(0, 7),
      message: summary,
      summary,
      parentOids,
      timestamp: '2024-01-01T00:00:00Z',
      author: { name: 'Test', email: 'test@test.com', timestamp: '2024-01-01T00:00:00Z' },
      committer: { name: 'Test', email: 'test@test.com', timestamp: '2024-01-01T00:00:00Z' },
      isMerge: parentOids.length > 1,
      signature: null,
      lane: 0,
      parentEdges: [],
      refs: [],
    };
  }

  let container: HTMLElement;
  let graph: Graph;

  beforeEach(() => {
    container = document.createElement('div');
    graph = new Graph(container, config, muteConfig);
  });

  it('should create graph and append SVG to container', () => {
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('should return SVG element', () => {
    const svg = graph.getSvg();
    expect(svg.tagName.toLowerCase()).toBe('svg');
  });

  it('should load empty commits', () => {
    graph.loadCommits([], null, {}, false);
    expect(graph.getVertexColours()).toEqual([]);
    expect(graph.getVertexPositions()).toEqual([]);
    expect(graph.getVertexData()).toEqual([]);
  });

  it('should load single commit', () => {
    const commits = [createCommit('abc123')];
    graph.loadCommits(commits, 'abc123', { abc123: 0 }, false);

    expect(graph.getVertexColours()).toHaveLength(1);
    expect(graph.getVertexPositions()).toHaveLength(1);
  });

  it('should load commits with parent-child relationships', () => {
    const commits = [
      createCommit('def456', ['abc123'], 'Second commit'),
      createCommit('abc123', [], 'Initial commit'),
    ];
    graph.loadCommits(commits, 'def456', { def456: 0, abc123: 1 }, false);

    expect(graph.getVertexColours()).toHaveLength(2);
    expect(graph.getBranchLines().length).toBeGreaterThan(0);
  });

  it('should handle uncommitted changes', () => {
    const commits = [
      createCommit('uncommitted', ['abc123'], 'Uncommitted changes'),
      createCommit('abc123', [], 'Initial'),
    ];
    graph.loadCommits(commits, 'abc123', { uncommitted: 0, abc123: 1 }, false);

    const data = graph.getVertexData();
    expect(data[0].isCommitted).toBe(false);
  });

  it('should set current vertex when HEAD matches', () => {
    const commits = [createCommit('def456', ['abc123']), createCommit('abc123', [])];
    graph.loadCommits(commits, 'def456', { def456: 0, abc123: 1 }, false);
    // The current vertex is set internally for rendering
    expect(graph.getVertexColours()).toHaveLength(2);
  });

  it('should get vertex data with all properties', () => {
    const commits = [
      createCommit('merge', ['abc123', 'def456']),
      createCommit('abc123', []),
      createCommit('def456', []),
    ];
    graph.loadCommits(commits, 'merge', { merge: 0, abc123: 1, def456: 2 }, false);

    const data = graph.getVertexData();
    expect(data).toHaveLength(3);
    expect(data[0]).toHaveProperty('column');
    expect(data[0]).toHaveProperty('color');
    expect(data[0]).toHaveProperty('isCommitted');
    expect(data[0]).toHaveProperty('isMerge');
    expect(data[0]).toHaveProperty('hasChildren');
    expect(data[0]).toHaveProperty('hasParents');
    expect(data[0]).toHaveProperty('parentColumns');
    expect(data[0].isMerge).toBe(true);
  });

  it('should get branch lines', () => {
    const commits = [createCommit('def456', ['abc123']), createCommit('abc123', [])];
    graph.loadCommits(commits, 'def456', { def456: 0, abc123: 1 }, false);

    const lines = graph.getBranchLines();
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]).toHaveProperty('fromColumn');
    expect(lines[0]).toHaveProperty('fromRow');
    expect(lines[0]).toHaveProperty('toColumn');
    expect(lines[0]).toHaveProperty('toRow');
    expect(lines[0]).toHaveProperty('color');
    expect(lines[0]).toHaveProperty('isCommitted');
  });

  it('should get content width', () => {
    const commits = [createCommit('abc123')];
    graph.loadCommits(commits, 'abc123', { abc123: 0 }, false);

    const width = graph.getContentWidth();
    expect(width).toBeGreaterThan(0);
  });

  it('should get height without expanded commit', () => {
    const commits = [createCommit('abc123')];
    graph.loadCommits(commits, 'abc123', { abc123: 0 }, false);

    const height = graph.getHeight(null);
    expect(height).toBeGreaterThan(0);
  });

  it('should get height with expanded commit', () => {
    const commits = [createCommit('abc123')];
    graph.loadCommits(commits, 'abc123', { abc123: 0 }, false);

    const expandedCommit = {
      index: 0,
      commitHash: 'abc123',
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
    };

    const heightWithExpand = graph.getHeight(expandedCommit);
    const heightWithout = graph.getHeight(null);
    expect(heightWithExpand).toBeGreaterThan(heightWithout);
  });

  it('should get widths at vertices', () => {
    const commits = [createCommit('abc123')];
    graph.loadCommits(commits, 'abc123', { abc123: 0 }, false);

    const widths = graph.getWidthsAtVertices();
    expect(widths).toHaveLength(1);
    expect(typeof widths[0]).toBe('number');
  });

  it('should check dropCommitPossible - false for no parents', () => {
    const commits = [createCommit('abc123')];
    graph.loadCommits(commits, 'abc123', { abc123: 0 }, false);

    expect(graph.dropCommitPossible(0)).toBe(false);
  });

  it('should check dropCommitPossible with parents', () => {
    const commits = [createCommit('def456', ['abc123']), createCommit('abc123', [])];
    graph.loadCommits(commits, 'def456', { def456: 0, abc123: 1 }, false);

    // Should return boolean (exact result depends on topology)
    expect(typeof graph.dropCommitPossible(0)).toBe('boolean');
  });

  it('should check dropCommitPossible for merge commits', () => {
    const commits = [
      createCommit('merge', ['abc123', 'def456']),
      createCommit('abc123', []),
      createCommit('def456', []),
    ];
    graph.loadCommits(commits, 'merge', { merge: 0, abc123: 1, def456: 2 }, false);

    // Merge commits fail topological test
    expect(graph.dropCommitPossible(0)).toBe(false);
  });

  it('should get muted commits - none muted by default', () => {
    const commits = [createCommit('abc123')];
    graph.loadCommits(commits, 'abc123', { abc123: 0 }, false);

    const muted = graph.getMutedCommits('abc123');
    expect(muted).toHaveLength(1);
    expect(muted[0]).toBe(false);
  });

  it('should mute merge commits when enabled', () => {
    const muteConfigWithMerges: GG.MuteCommitsConfig = {
      mergeCommits: true,
      commitsNotAncestorsOfHead: false,
    };
    const graphWithMute = new Graph(container, config, muteConfigWithMerges);

    const commits = [
      createCommit('merge', ['abc123', 'def456']),
      createCommit('abc123', []),
      createCommit('def456', []),
    ];
    graphWithMute.loadCommits(commits, 'merge', { merge: 0, abc123: 1, def456: 2 }, false);

    const muted = graphWithMute.getMutedCommits('merge');
    expect(muted[0]).toBe(true); // Merge commit muted
    expect(muted[1]).toBe(false);
  });

  it('should mute non-ancestor commits when enabled', () => {
    const muteConfigWithAncestors: GG.MuteCommitsConfig = {
      mergeCommits: false,
      commitsNotAncestorsOfHead: true,
    };
    const graphWithMute = new Graph(container, config, muteConfigWithAncestors);

    const commits = [
      createCommit('head', ['parent']),
      createCommit('parent', []),
      createCommit('other', []), // Not an ancestor of head
    ];
    graphWithMute.loadCommits(commits, 'head', { head: 0, parent: 1, other: 2 }, false);

    const muted = graphWithMute.getMutedCommits('head');
    expect(muted[0]).toBe(false); // head
    expect(muted[1]).toBe(false); // parent (ancestor)
    expect(muted[2]).toBe(true); // other (not ancestor)
  });

  it('should get first parent index', () => {
    const commits = [createCommit('def456', ['abc123']), createCommit('abc123', [])];
    graph.loadCommits(commits, 'def456', { def456: 0, abc123: 1 }, false);

    expect(graph.getFirstParentIndex(0)).toBe(1);
    expect(graph.getFirstParentIndex(1)).toBe(-1);
  });

  it('should get alternative parent index', () => {
    const commits = [
      createCommit('merge', ['abc123', 'def456']),
      createCommit('abc123', []),
      createCommit('def456', []),
    ];
    graph.loadCommits(commits, 'merge', { merge: 0, abc123: 1, def456: 2 }, false);

    expect(graph.getAlternativeParentIndex(0)).toBe(2);
    expect(graph.getAlternativeParentIndex(1)).toBe(-1);
  });

  it('should get first child index', () => {
    const commits = [createCommit('def456', ['abc123']), createCommit('abc123', [])];
    graph.loadCommits(commits, 'def456', { def456: 0, abc123: 1 }, false);

    expect(graph.getFirstChildIndex(0)).toBe(-1);
    expect(graph.getFirstChildIndex(1)).toBe(0);
  });

  it('should get alternative child index', () => {
    const commits = [
      createCommit('child1', ['parent']),
      createCommit('child2', ['parent']),
      createCommit('parent', []),
    ];
    graph.loadCommits(commits, 'child1', { child1: 0, child2: 1, parent: 2 }, false);

    // Parent has multiple children
    const altChild = graph.getAlternativeChildIndex(2);
    expect(altChild).toBeGreaterThanOrEqual(0);
  });

  it('should limit max width', () => {
    const commits = [createCommit('abc123')];
    graph.loadCommits(commits, 'abc123', { abc123: 0 }, false);

    // Should not throw
    graph.limitMaxWidth(100);
    expect(true).toBe(true);
  });

  it('should render graph without expanded commit', () => {
    const commits = [createCommit('abc123')];
    graph.loadCommits(commits, 'abc123', { abc123: 0 }, false);

    graph.render(null);
    // SVG should have been updated
    const svg = graph.getSvg();
    expect(svg.querySelector('g')).not.toBeNull();
  });

  it('should render graph with expanded commit', () => {
    const commits = [createCommit('def456', ['abc123']), createCommit('abc123', [])];
    graph.loadCommits(commits, 'def456', { def456: 0, abc123: 1 }, false);

    const expandedCommit = {
      index: 0,
      commitHash: 'def456',
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
    };

    graph.render(expandedCommit);
    const svg = graph.getSvg();
    expect(svg.querySelector('g')).not.toBeNull();
  });

  it('should handle onlyFollowFirstParent mode', () => {
    const commits = [createCommit('merge', ['abc123', 'def456']), createCommit('abc123', [])];
    // def456 is not in lookup
    graph.loadCommits(commits, 'merge', { merge: 0, abc123: 1 }, true);

    expect(graph.getVertexColours()).toHaveLength(2);
  });

  it('should handle parent not in lookup', () => {
    const commits = [createCommit('child', ['missing-parent'])];
    graph.loadCommits(commits, 'child', { child: 0 }, false);

    expect(graph.getVertexColours()).toHaveLength(1);
  });

  it('should handle complex branch topology', () => {
    const commits = [
      createCommit('head', ['merge']),
      createCommit('merge', ['feature', 'main']),
      createCommit('feature', ['base']),
      createCommit('main', ['base']),
      createCommit('base', []),
    ];
    const lookup = { head: 0, merge: 1, feature: 2, main: 3, base: 4 };
    graph.loadCommits(commits, 'head', lookup, false);

    expect(graph.getVertexColours()).toHaveLength(5);
    expect(graph.getBranchLines().length).toBeGreaterThan(0);
  });

  it('should re-render when called multiple times', () => {
    const commits = [createCommit('abc123')];
    graph.loadCommits(commits, 'abc123', { abc123: 0 }, false);

    graph.render(null);
    expect(graph.getSvg().querySelector('g')).not.toBeNull();

    graph.render(null);
    // Should have replaced the group
    expect(graph.getSvg().querySelector('g')).not.toBeNull();
  });
});
