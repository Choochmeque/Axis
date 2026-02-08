# Stashing

Stash temporarily saves your uncommitted changes, allowing you to switch contexts without committing incomplete work.

## What is Stash?

Stash takes your modified tracked files and staged changes, saves them on a stack, and reverts your working directory to match HEAD.

```
Before stash:
Working directory has uncommitted changes

After stash:
Working directory is clean (matches HEAD)
Changes saved in stash stack
```

**Key points:**
- Saves both staged and unstaged changes
- Can include or exclude untracked files
- Works like a stack (last in, first out)
- Changes can be restored later

## Quick Reference

:::tabs
== Axis
**Stashes** panel in sidebar shows all stashes

== CLI
```bash
git stash list                  # List stashes
git stash push -m "message"     # Create stash
git stash pop                   # Apply and remove
git stash apply                 # Apply and keep
git stash drop stash@{0}        # Delete stash
```
:::

## When to Use Stash

### Quick Context Switch

Need to switch branches but have uncommitted work:

1. Stash your changes
2. Switch to the other branch
3. Do your work there
4. Switch back
5. Pop your stash

### Pulling with Local Changes

Your local changes conflict with incoming changes:

1. Stash your changes
2. Pull the latest
3. Pop your stash
4. Resolve any conflicts

### Experimenting

Want to try something different without losing current work:

1. Stash current changes
2. Experiment freely
3. If experiment fails, pop your stash
4. If experiment succeeds, drop the stash

### Moving Changes to Another Branch

Started work on the wrong branch:

1. Stash your changes
2. Checkout the correct branch
3. Pop your stash

## Stash Use Cases

| Scenario | Action |
|----------|--------|
| Need to switch branches quickly | Stash, switch, work, switch back, pop |
| Pull would conflict | Stash, pull, pop, resolve conflicts |
| Wrong branch | Stash, checkout correct branch, pop |
| Want to test something | Stash, experiment, pop or drop |
| Clean working directory needed | Stash, do clean operation, pop |

## Creating a Stash

### Basic Stash

:::tabs
== Axis
1. Click **Stash** in the toolbar (or use keyboard shortcut)
2. Enter an optional message to identify the stash
3. Click **Create Stash**

== CLI
```bash
git stash push -m "WIP: feature description"
```
:::

::: tip
Always add a descriptive message. "WIP" doesn't help when you have multiple stashes.
:::

### Stash Options

| Option | Description |
|--------|-------------|
| **Include untracked files** | Also stash new files not yet tracked by Git |
| **Keep staged changes** | Only stash unstaged changes, leave staged alone |
| **Include ignored files** | Also stash files matching .gitignore |

:::tabs
== Axis
Select options in the **Stash** dialog before creating

== CLI
```bash
git stash push -u -m "message"        # Include untracked
git stash push --keep-index           # Keep staged changes
git stash push -a -m "message"        # Include ignored files
```
:::

### Stash Specific Files

:::tabs
== Axis
1. Stage only the files you want to stash
2. Create stash with **Keep staged changes** disabled
3. Or right-click specific files and select **Stash**

== CLI
```bash
git stash push -m "message" -- path/to/file.txt
git stash push -m "message" -- file1.txt file2.txt
```
:::

## Viewing Stashes

:::tabs
== Axis
Click **Stashes** in the sidebar to see all stashes
Click a stash to preview its contents before applying

== CLI
```bash
git stash list                    # List all stashes
git stash show stash@{0}          # Show files changed
git stash show -p stash@{0}       # Show full diff
```
:::

Each stash shows:

- **Message** - Your description (or auto-generated)
- **Branch** - Where the stash was created
- **Date** - When it was stashed
- **Changes** - Files modified

## Applying Stashes

### Apply

Restores the stashed changes but **keeps the stash** for future use.

:::tabs
== Axis
1. Select the stash in the **Stashes** panel
2. Click **Apply**
3. Changes are restored to working directory

== CLI
```bash
git stash apply stash@{0}
```
:::

Use when you might need the same changes again.

### Pop

Restores the stashed changes and **deletes the stash**.

:::tabs
== Axis
1. Select the stash
2. Click **Pop**
3. Changes restored, stash removed

== CLI
```bash
git stash pop stash@{0}
# Or pop the most recent:
git stash pop
```
:::

Use when you're done with the stash.

### Apply to Different Branch

Stashes aren't tied to branches:

:::tabs
== Axis
1. Checkout any branch
2. **Apply** or **Pop** the stash
3. Changes appear in current branch

== CLI
```bash
git checkout other-branch
git stash pop
```
:::

::: warning Conflicts
If stashed changes conflict with current state, you'll need to resolve conflicts manually.
:::

## Managing Stashes

### Renaming

:::tabs
== Axis
Right-click a stash and select **Rename** to update its message

== CLI
```bash
# Git doesn't support renaming directly
# Drop and recreate with new message
```
:::

### Creating Branch from Stash

If stashed changes are significant:

:::tabs
== Axis
1. Right-click the stash
2. Select **Create Branch**
3. Enter branch name
4. Stash is applied to new branch

== CLI
```bash
git stash branch new-branch-name stash@{0}
```
:::

### Dropping a Stash

To delete a stash without applying:

:::tabs
== Axis
1. Right-click the stash
2. Select **Drop**
3. Confirm deletion

== CLI
```bash
git stash drop stash@{0}
```
:::

::: danger Cannot Undo
Dropped stashes cannot be easily recovered. The changes are lost unless you can find them in reflog.
:::

### Clear All Stashes

:::tabs
== Axis
1. Click the menu in stash panel
2. Select **Clear All**
3. Confirm deletion

== CLI
```bash
git stash clear
```
:::

## Stash Conflicts

When applying a stash conflicts with current changes:

1. Conflicting files are marked
2. Open conflict resolver
3. Choose which changes to keep
4. Mark as resolved
5. Stash remains (wasn't popped due to conflict)

After resolving, manually drop the stash if no longer needed.

## Best Practices

### Use Descriptive Messages

```
Bad:  "WIP"
Good: "WIP: user authentication - login form validation"
```

### Don't Hoard Stashes

Review and clean up stashes regularly. Old stashes become confusing and may no longer apply cleanly.

### Consider Commits Instead

For longer interruptions, consider committing with a "WIP" message instead:

- Commits are more permanent
- Easier to track in history
- Can be amended or squashed later

### Stash Before Risky Operations

Before rebasing, resetting, or other potentially destructive operations:

1. Stash any uncommitted changes
2. Perform the operation
3. Pop your stash

## Comparison: Stash vs Commit

| Aspect | Stash | Commit |
|--------|-------|--------|
| Permanence | Temporary | Permanent |
| History | Not in branch history | Part of history |
| Visibility | Local only | Can be pushed |
| Use case | Quick context switch | Checkpoint or milestone |
| Recovery | Can be lost | Always recoverable |
