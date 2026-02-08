# Merging & Rebasing

Two ways to integrate changes from one branch into another. Understanding when to use each is essential for effective Git workflows.

## What is Merge?

Merge combines two branches by creating a new "merge commit" that has two parents. It preserves the complete history of both branches.

```
Before merge:
main:    A---B---C
              \
feature:       D---E

After merge:
main:    A---B---C-------M
              \         /
feature:       D---E---/
```

**Key points:**
- Creates a merge commit (M) with two parents
- Preserves all history exactly as it happened
- Non-destructive - doesn't change existing commits
- Shows when branches diverged and merged

## What is Rebase?

Rebase moves your branch's commits to start from a different point, rewriting history to appear linear.

```
Before rebase:
main:    A---B---C
              \
feature:       D---E

After rebase:
main:    A---B---C
                  \
feature:           D'---E'
```

**Key points:**
- Creates new commits (D', E') with different hashes
- Results in linear history
- Destructive - rewrites commit history
- Appears as if work happened sequentially

## When to Use Merge

### Preserving History

Use merge when you want to keep the exact history of how work progressed:

- **Merging feature branches to main** - Shows when features were integrated
- **Collaborative branches** - Multiple people worked on the branch
- **Public branches** - History should never be rewritten

### Merge Strategies

| Strategy | Use Case |
|----------|----------|
| **Merge commit** | Always shows the integration point |
| **Fast-forward** | Target hasn't changed, clean linear history |
| **Squash** | Combine feature into single commit |

## When to Use Rebase

### Cleaning Up History

Use rebase to maintain a clean, linear history:

- **Updating feature branch** - Get latest changes from main before merging
- **Cleaning commits** - Squash, reword, or reorder before sharing
- **Personal branches** - Before pushing or creating a PR

### Rebase Use Cases

| Scenario | Action |
|----------|--------|
| Feature branch behind main | Rebase onto main |
| Too many small commits | Interactive rebase to squash |
| Typo in commit message | Interactive rebase to reword |
| Wrong commit order | Interactive rebase to reorder |

::: danger Never Rebase Public History
Don't rebase commits that others have based work on. This rewrites history and causes problems for collaborators.
:::

## Merging in Axis

### Basic Merge

1. Checkout the target branch (e.g., `main`)
2. Right-click the branch to merge (e.g., `feature`)
3. Select **Merge into current branch**

### Merge Options

- **Create merge commit** - Always create a merge commit
- **Fast-forward if possible** - Skip merge commit when possible
- **Squash** - Combine all commits into one

## Handling Merge Conflicts

When conflicts occur:

1. Conflicting files appear in the staging area marked with conflict icon
2. Click a file to open the conflict resolver
3. For each conflict, choose:
   - **Accept Current** - Keep your changes
   - **Accept Incoming** - Take their changes
   - **Accept Both** - Include both versions
   - Edit manually for custom resolution
4. Mark as resolved
5. Commit the merge

## Rebasing in Axis

### Simple Rebase

To update your branch with latest changes from main:

1. Checkout your feature branch
2. Right-click `main` (or target branch)
3. Select **Rebase onto this branch**

### Interactive Rebase

1. Right-click on a commit in history
2. Select **Interactive Rebase**
3. For each commit, choose an action:
   - **Pick** - Keep the commit as-is
   - **Reword** - Change the commit message
   - **Squash** - Combine with previous commit
   - **Fixup** - Squash without keeping message
   - **Drop** - Remove the commit
4. Reorder commits by dragging if needed
5. Click **Start Rebase**

### Handling Rebase Conflicts

During rebase, conflicts may occur at each commit:

1. Resolve conflicts as with merge
2. Click **Continue Rebase** to proceed
3. Repeat for each conflicting commit

### Abort Rebase

If something goes wrong:

- Click **Abort Rebase** to return to the original state
- All changes will be undone, branch restored

## Best Practices

### Golden Rule

**Never rebase commits that exist outside your local repository.**

If you've pushed commits, others may have based work on them. Rebasing rewrites those commits, causing history conflicts.

### Recommended Workflow

1. Create feature branch from `main`
2. Work on feature, making commits
3. Before merging back:
   - **Option A**: Rebase onto latest `main`, then merge (fast-forward)
   - **Option B**: Merge `main` into feature, then merge to `main`
4. Delete feature branch

### Commit Hygiene

Use interactive rebase before sharing to:

- Squash "WIP" and "fix typo" commits
- Write clear, meaningful messages
- Group related changes logically

## Comparison

| Aspect | Merge | Rebase |
|--------|-------|--------|
| History | Non-linear, preserves branches | Linear, appears sequential |
| Commits | Adds merge commit | Rewrites commits |
| Safety | Safe for shared branches | Only for local branches |
| Conflicts | Resolve once | May resolve per commit |
| Traceability | Shows integration points | Cleaner but loses context |
