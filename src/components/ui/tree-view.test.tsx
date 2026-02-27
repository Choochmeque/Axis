import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SelectionKey } from '@/hooks';
import { buildTreeFromPaths, type TreeNode, TreeView } from './tree-view';

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

describe('TreeView', () => {
  const mockData: TreeNode<string>[] = [
    {
      id: 'folder1',
      name: 'Folder 1',
      children: [
        { id: 'file1', name: 'file1.ts', data: 'file1.ts' },
        { id: 'file2', name: 'file2.ts', data: 'file2.ts' },
      ],
    },
    {
      id: 'folder2',
      name: 'Folder 2',
      children: [{ id: 'file3', name: 'file3.ts', data: 'file3.ts' }],
    },
    { id: 'root-file', name: 'root.ts', data: 'root.ts' },
  ];

  it('should render tree nodes', () => {
    render(<TreeView data={mockData} />);

    expect(screen.getByText('Folder 1')).toBeInTheDocument();
    expect(screen.getByText('Folder 2')).toBeInTheDocument();
    expect(screen.getByText('root.ts')).toBeInTheDocument();
  });

  it('should render children when expanded by default', () => {
    render(<TreeView data={mockData} defaultExpandAll={true} />);

    expect(screen.getByText('file1.ts')).toBeInTheDocument();
    expect(screen.getByText('file2.ts')).toBeInTheDocument();
    expect(screen.getByText('file3.ts')).toBeInTheDocument();
  });

  it('should collapse folder on click', () => {
    render(<TreeView data={mockData} defaultExpandAll={true} />);

    // Click to collapse Folder 1
    fireEvent.click(screen.getByText('Folder 1'));

    // Children should be hidden
    expect(screen.queryByText('file1.ts')).not.toBeInTheDocument();
    expect(screen.queryByText('file2.ts')).not.toBeInTheDocument();
  });

  it('should expand folder on click', () => {
    render(<TreeView data={mockData} defaultExpandAll={false} />);

    // Children should not be visible initially
    expect(screen.queryByText('file1.ts')).not.toBeInTheDocument();

    // Click to expand Folder 1
    fireEvent.click(screen.getByText('Folder 1'));

    // Children should be visible
    expect(screen.getByText('file1.ts')).toBeInTheDocument();
  });

  it('should call onSelectionChange when clicking leaf node', () => {
    const onSelectionChange = vi.fn();
    render(
      <TreeView
        data={mockData}
        selectionMode="single"
        selectedKeys={new Set<SelectionKey>()}
        onSelectionChange={onSelectionChange}
      />
    );

    fireEvent.click(screen.getByText('root.ts'));

    expect(onSelectionChange).toHaveBeenCalledWith(new Set(['root-file']));
  });

  it('should highlight selected node via selectedKeys', () => {
    render(
      <TreeView
        data={mockData}
        selectionMode="single"
        selectedKeys={new Set<SelectionKey>(['root-file'])}
        onSelectionChange={vi.fn()}
      />
    );

    const selectedNode = screen.getByText('root.ts').parentElement;
    expect(selectedNode?.className).toContain('bg-(--bg-active)');
  });

  it('should deselect when clicking selected leaf in single mode', () => {
    const onSelectionChange = vi.fn();
    render(
      <TreeView
        data={mockData}
        selectionMode="single"
        selectedKeys={new Set<SelectionKey>(['root-file'])}
        onSelectionChange={onSelectionChange}
      />
    );

    fireEvent.click(screen.getByText('root.ts'));

    expect(onSelectionChange).toHaveBeenCalledWith(new Set());
  });

  it('should not fire onSelectionChange when selectionMode is not set', () => {
    const onSelectionChange = vi.fn();
    render(<TreeView data={mockData} onSelectionChange={onSelectionChange} />);

    fireEvent.click(screen.getByText('root.ts'));

    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it('should support custom renderItem with select callback', () => {
    const onSelectionChange = vi.fn();
    const renderItem = vi.fn(({ node, select }) => (
      <div data-testid={`custom-${node.id}`} onClick={select}>
        {node.name}
      </div>
    ));

    render(
      <TreeView
        data={mockData}
        renderItem={renderItem}
        selectionMode="single"
        selectedKeys={new Set<SelectionKey>()}
        onSelectionChange={onSelectionChange}
      />
    );

    expect(screen.getByTestId('custom-folder1')).toBeInTheDocument();
    expect(renderItem).toHaveBeenCalled();

    // Click a leaf via the select callback
    fireEvent.click(screen.getByTestId('custom-root-file'));

    expect(onSelectionChange).toHaveBeenCalledWith(new Set(['root-file']));
  });

  it('should support controlled expanded state', () => {
    const expandedIds = new Set(['folder1']);
    const onExpandedChange = vi.fn();

    render(
      <TreeView data={mockData} expandedIds={expandedIds} onExpandedChange={onExpandedChange} />
    );

    // Folder 1 should be expanded
    expect(screen.getByText('file1.ts')).toBeInTheDocument();

    // Click to toggle
    fireEvent.click(screen.getByText('Folder 1'));

    expect(onExpandedChange).toHaveBeenCalled();
  });

  it('should support defaultExpandedIds', () => {
    const defaultExpandedIds = new Set(['folder2']);

    render(<TreeView data={mockData} defaultExpandedIds={defaultExpandedIds} />);

    // Only Folder 2 should be expanded
    expect(screen.queryByText('file1.ts')).not.toBeInTheDocument();
    expect(screen.getByText('file3.ts')).toBeInTheDocument();
  });

  it('should apply className prop', () => {
    const { container } = render(<TreeView data={mockData} className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('buildTreeFromPaths', () => {
  it('should build tree from flat paths', () => {
    const items = [
      { path: 'src/components/Button.tsx', id: '1' },
      { path: 'src/components/Input.tsx', id: '2' },
      { path: 'src/utils/helpers.ts', id: '3' },
      { path: 'README.md', id: '4' },
    ];

    const tree = buildTreeFromPaths(
      items,
      (item) => item.path,
      (item) => item.id
    );

    // Should have two root items: src folder and README.md
    expect(tree.length).toBe(2);

    // First should be folder (folders come first after sorting)
    expect(tree[0].name).toBe('src');
    expect(tree[0].children?.length).toBe(2);
  });

  it('should sort folders before files', () => {
    const items = [{ path: 'file.ts' }, { path: 'folder/nested.ts' }];

    const tree = buildTreeFromPaths(items, (item) => item.path);

    // Folder should come first
    expect(tree[0].name).toBe('folder');
    expect(tree[1].name).toBe('file.ts');
  });

  it('should sort alphabetically within same type', () => {
    const items = [{ path: 'z.ts' }, { path: 'a.ts' }, { path: 'm.ts' }];

    const tree = buildTreeFromPaths(items, (item) => item.path);

    expect(tree[0].name).toBe('a.ts');
    expect(tree[1].name).toBe('m.ts');
    expect(tree[2].name).toBe('z.ts');
  });

  it('should handle deeply nested paths', () => {
    const items = [{ path: 'a/b/c/d/file.ts' }];

    const tree = buildTreeFromPaths(items, (item) => item.path);

    expect(tree[0].name).toBe('a');
    expect(tree[0].children?.[0].name).toBe('b');
    expect(tree[0].children?.[0].children?.[0].name).toBe('c');
    expect(tree[0].children?.[0].children?.[0].children?.[0].name).toBe('d');
    expect(tree[0].children?.[0].children?.[0].children?.[0].children?.[0].name).toBe('file.ts');
  });

  it('should attach data to leaf nodes', () => {
    const items = [{ path: 'test.ts', value: 123 }];

    const tree = buildTreeFromPaths(items, (item) => item.path);

    expect(tree[0].data).toEqual({ path: 'test.ts', value: 123 });
  });

  it('should handle empty input', () => {
    const tree = buildTreeFromPaths([], (item: { path: string }) => item.path);

    expect(tree).toEqual([]);
  });

  it('should use custom getId function', () => {
    const items = [{ path: 'file.ts', customId: 'my-id' }];

    const tree = buildTreeFromPaths(
      items,
      (item) => item.path,
      (item) => item.customId
    );

    expect(tree[0].id).toBe('my-id');
  });
});
