# Merging & Rebasing

## Merging

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
1. Conflicting files appear in the staging area
2. Click a file to open the conflict resolver
3. Choose changes from either side or edit manually
4. Mark as resolved and commit

## Rebasing

### Interactive Rebase
1. Right-click on a commit
2. Select **Interactive Rebase**
3. Reorder, squash, edit, or drop commits
4. Click **Start Rebase**

### Rebase Options
- **Pick** - Keep the commit as-is
- **Reword** - Change the commit message
- **Squash** - Combine with previous commit
- **Drop** - Remove the commit

### Abort Rebase
If something goes wrong:
- Click **Abort Rebase** to return to the original state
