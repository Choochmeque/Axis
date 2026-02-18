---
description: Cherry-pick specific commits from one branch to another in Axis without merging entire branches.
---

# Cherry Pick

Cherry-pick applies the changes from specific commits onto your current branch, without merging entire branches.

## What is Cherry Pick?

Cherry-pick copies a commit from one branch and applies it to another. Unlike merge, it doesn't bring the entire branch history - just the specific commit(s) you select.

```
Before cherry-pick:
main:    A---B---C
              \
feature:       D---E---F

After cherry-picking E to main:
main:    A---B---C---E'
              \
feature:       D---E---F
```

**Key points:**
- Creates a new commit (E') with the same changes but different hash
- Only applies selected commit(s), not the whole branch
- Original commit remains unchanged on its branch
- Useful for selective integration

## When to Use Cherry Pick

### Hotfix to Multiple Branches

A bug fix on `develop` needs to go to `main` immediately:

1. Fix the bug on `develop`
2. Cherry-pick the fix commit to `main`
3. Both branches have the fix

### Undo a Specific Feature

Need to include one feature from a branch but not others:

1. Identify the commit(s) for that feature
2. Cherry-pick only those commits
3. Other changes stay on the original branch

### Recover Lost Work

Accidentally reset or deleted a branch:

1. Find the commit in reflog
2. Cherry-pick it to recover the changes

### Backport to Release Branch

A feature on `main` should also go to `release-1.0`:

1. Cherry-pick the feature commits to `release-1.0`
2. Both versions have the feature

## Cherry Pick Use Cases

| Scenario | Action |
|----------|--------|
| Hotfix needed on multiple branches | Cherry-pick fix to each branch |
| One commit from feature branch | Cherry-pick just that commit |
| Recover from accidental reset | Find in reflog, cherry-pick |
| Backport feature to old release | Cherry-pick to release branch |
| Wrong branch, already committed | Cherry-pick to correct branch, reset original |

## Cherry Picking in Axis

### Single Commit

:::tabs
== Axis
1. Navigate to **History** view
2. Find the commit you want to cherry-pick
3. Right-click the commit
4. Select **Cherry Pick**
5. Choose options (see below)
6. Click **Cherry Pick**

== CLI
```bash
git cherry-pick abc123
```
:::

### Multiple Commits

:::tabs
== Axis
1. Select multiple commits in history (`Ctrl/Cmd + click`)
2. Right-click the selection
3. Select **Cherry Pick**
4. Commits are applied in chronological order

== CLI
```bash
git cherry-pick abc123 def456 ghi789
# Or a range:
git cherry-pick abc123..ghi789
```
:::

::: tip Order Matters
When cherry-picking multiple commits, they're applied in order. If commits depend on each other, select them in the correct sequence.
:::

## Cherry Pick Options

| Option | Description |
|--------|-------------|
| **Create commit** | Immediately create a new commit (default) |
| **Stage changes only** | Apply changes but don't commit (--no-commit) |

### Stage Changes Only

Use this when you want to:

- Combine multiple cherry-picks into one commit
- Modify the changes before committing
- Add additional changes with the cherry-picked content

:::tabs
== Axis
1. Start **Cherry Pick**
2. Select **Stage changes only** option
3. Changes are staged but not committed

== CLI
```bash
git cherry-pick --no-commit abc123
# Or multiple:
git cherry-pick --no-commit abc123 def456
```
:::

## Handling Conflicts

If the cherry-picked changes conflict with your current branch:

1. Conflicting files are shown in staging area
2. Open the conflict resolver
3. For each conflict:
   - **Accept Current** - Keep your branch's version
   - **Accept Incoming** - Take the cherry-picked version
   - **Accept Both** - Include both changes
   - Edit manually for custom resolution
4. Mark conflicts as resolved
5. Continue or commit the cherry-pick

### During Multi-Commit Cherry Pick

When cherry-picking multiple commits:

1. Conflict may occur at any commit
2. Resolve conflicts for that commit
3. Click **Continue** to proceed to next commit
4. Repeat until all commits are applied

### Abort Cherry Pick

If cherry-pick goes wrong:

:::tabs
== Axis
Click **Abort** to cancel
Working directory returns to previous state
No commits are created

== CLI
```bash
git cherry-pick --abort
```
:::

### Skip a Commit

During multi-commit cherry-pick, if one commit can't be applied:

:::tabs
== Axis
Click **Skip** to skip that commit
Continue with remaining commits

== CLI
```bash
git cherry-pick --skip
```
:::

### Continue Cherry Pick

After resolving conflicts:

:::tabs
== Axis
1. Resolve conflicts in the staging area
2. Click **Continue** to proceed

== CLI
```bash
git add .                        # Stage resolved files
git cherry-pick --continue
```
:::

## Best Practices

### Don't Cherry Pick Public Commits

If others are working on the original branch, cherry-picking creates duplicate commits with different hashes. This can cause confusion when branches are eventually merged.

### Keep Track of Cherry Picks

Note which commits were cherry-picked and where. Without tracking, the same changes might be merged again later, causing conflicts.

### Prefer Merge When Possible

Cherry-pick is for exceptional cases. For regular integration:

- **Merge** - When you want all changes from a branch
- **Cherry-pick** - When you need only specific commits

### Test After Cherry Pick

The commit worked in its original context. Test that it also works in the new context, especially if:

- Code has diverged between branches
- Dependencies might differ
- Configuration varies between branches

## Cherry Pick vs Other Operations

| Operation | Use Case |
|-----------|----------|
| **Merge** | Integrate entire branch |
| **Rebase** | Move commits to new base, rewrite history |
| **Cherry Pick** | Copy specific commits to another branch |
| **Revert** | Undo a commit by creating inverse changes |

## Common Issues

### "Nothing to Commit"

The changes from the cherry-picked commit already exist in your branch. This can happen if:

- The commit was already merged another way
- Changes were manually duplicated

### Repeated Conflicts on Merge

If you cherry-pick and later merge the same branch, Git may show conflicts for already-applied changes. Options:

- Resolve conflicts by accepting current changes
- Use `git merge -X ours` to prefer your version
- Consider if cherry-pick was the right choice

### Lost Original Context

Cherry-picked commits lose their original branch context. The commit message might reference things that don't make sense in the new location. Consider updating the message.
