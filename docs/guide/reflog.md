---
description: Use Git reflog in Axis to recover lost commits and undo mistakes. Your safety net for Git operations.
---

# Reflog

The reflog (reference log) records when branch tips and other references were updated. It's your safety net for recovering lost commits.

## What is Reflog?

Git's reflog tracks every change to HEAD and branch references:

- Commits
- Checkouts
- Merges
- Rebases
- Resets
- Stash operations

Even when commits seem "lost" (e.g., after a hard reset), they remain in the reflog for recovery.

## Accessing Reflog

:::tabs
== Axis
Click **Reflog** in the sidebar to open the reflog view

== CLI
```bash
git reflog                    # HEAD reflog
git reflog show branch-name   # Specific branch
```
:::

## Understanding Entries

Each reflog entry shows:

| Field | Description |
|-------|-------------|
| **Action** | What operation was performed (commit, checkout, merge, etc.) |
| **Commit** | The commit hash at that point |
| **Message** | Description of the change |
| **Time** | When the action occurred |

### Common Actions

- **commit** - New commit created
- **checkout** - Switched branches or commits
- **merge** - Branch merged
- **rebase** - Commits rebased
- **reset** - Branch pointer moved
- **pull** - Fetched and merged remote changes
- **stash** - Changes stashed or applied

## Recovering Lost Commits

### After Accidental Reset

If you ran `git reset --hard` and lost commits:

:::tabs
== Axis
1. Open **Reflog** in the sidebar
2. Find the entry before the reset
3. Right-click the commit
4. Select **Create branch here** or **Reset to this commit**

== CLI
```bash
git reflog                        # Find the commit
git reset --hard HEAD@{2}         # Reset to reflog entry
# Or create a branch:
git branch recovery-branch HEAD@{2}
```
:::

### After Failed Rebase

If a rebase went wrong:

:::tabs
== Axis
1. Open **Reflog**
2. Find the entry labeled "rebase (start)" or the commit before rebase
3. Reset to that commit to restore the original state

== CLI
```bash
git reflog                        # Find pre-rebase state
git reset --hard HEAD@{5}         # Restore to that point
```
:::

### After Dropped Stash

Stash entries also appear in reflog:

:::tabs
== Axis
1. Find the stash entry in **Reflog**
2. Note the commit hash
3. Use **Cherry-pick** to recover the changes

== CLI
```bash
git reflog stash                  # Find stash entries
git stash apply abc123            # Apply by hash
# Or cherry-pick:
git cherry-pick -n abc123
```
:::

## Actions Available

Right-click on any reflog entry to:

- **Copy commit hash** - Copy SHA to clipboard
- **Create branch** - Create a new branch at this point
- **Reset to commit** - Move current branch to this commit
- **Cherry-pick** - Apply this commit's changes

## Reflog Expiration

By default, reflog entries expire after:

- **90 days** for reachable commits
- **30 days** for unreachable commits

::: warning
Don't rely on reflog for long-term backup. Entries eventually expire.
:::

## Tips

### Check Before Destructive Operations

Before running reset, rebase, or other history-changing commands, note your current HEAD in reflog. This makes recovery easier if something goes wrong.

### Reflog is Local

Reflog only exists on your local machine. It's not pushed to remotes, so it can't help recover commits that were never on your machine.

### Use Branches for Safety

Instead of relying on reflog, create a backup branch before risky operations. This is more reliable than depending on reflog entries.
