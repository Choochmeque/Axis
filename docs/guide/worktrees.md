# Worktrees

Work on multiple branches simultaneously without switching.

## What are Worktrees?

Worktrees let you have multiple working directories linked to a single repository. Each worktree can have a different branch checked out.

```
Main repo (main branch)
├── .git/
└── src/

Worktree 1 (feature-a branch)
└── src/

Worktree 2 (hotfix branch)
└── src/
```

All worktrees share the same Git history and objects, saving disk space.

## Creating a Worktree

:::tabs
== Axis
1. Go to **Repository > Worktrees**
2. Click **Add Worktree**
3. Choose a branch or create a new one
4. Select the folder location
5. Click **Create**

== CLI
```bash
# Create worktree for existing branch
git worktree add ../hotfix hotfix-branch

# Create worktree with new branch
git worktree add -b feature-x ../feature-x main
```
:::

## Managing Worktrees

### List Worktrees

:::tabs
== Axis
View all worktrees in the **Worktrees** panel
See which branch each worktree has checked out

== CLI
```bash
git worktree list
```
:::

### Open in New Window

:::tabs
== Axis
Double-click a worktree to open it
Or right-click and select **Open**

== CLI
```bash
cd ../worktree-path
# Then open in your editor
```
:::

### Remove Worktree

:::tabs
== Axis
1. Right-click the worktree
2. Select **Remove**
3. Choose whether to keep or delete the folder

== CLI
```bash
git worktree remove ../worktree-path
# Or force remove:
git worktree remove --force ../worktree-path
```
:::

### Prune Stale Worktrees

Clean up references to manually deleted worktrees:

:::tabs
== Axis
Go to **Repository > Worktrees > Prune**

== CLI
```bash
git worktree prune
```
:::

## Use Cases

- **Hotfixes** - Work on a fix while keeping feature work intact
- **Code Review** - Check out a PR branch without losing your work
- **Parallel Development** - Work on multiple features simultaneously
- **Testing** - Run tests on one branch while coding on another
- **Comparisons** - Have two versions side by side

## Best Practices

1. **Keep worktrees organized** - Use a consistent folder structure
2. **Clean up when done** - Remove worktrees you no longer need
3. **Don't checkout same branch** - Each branch can only be checked out in one worktree
