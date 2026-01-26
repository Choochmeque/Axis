import { describe, it, expect, beforeEach } from 'vitest';
import { Branch, Vertex, GG } from './graph';

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
