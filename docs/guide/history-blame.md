---
description: View commit history, explore the commit graph, and use git blame to track changes in Axis.
---

# History & Blame

View the complete history of your project and track who changed what and when.

## Commit History

The history view shows:
- Commit graph visualization
- Commit messages and authors
- Branch and tag labels
- Date and time

:::tabs
== Axis
Click **History** in the sidebar to view the commit graph

== CLI
```bash
git log --oneline --graph --all
```
:::

### Filtering History

:::tabs
== Axis
Use the search bar and filters in the **History** view:
- Search by message, author, or file
- Filter by branch or date range
- Show/hide merge commits

== CLI
```bash
git log --author="name"              # By author
git log --grep="search term"         # By message
git log --since="2024-01-01"         # By date
git log -- path/to/file.txt          # By file
git log --no-merges                  # Hide merges
```
:::

### Commit Details

:::tabs
== Axis
Click a commit to see:
- Full commit message
- Changed files
- Diff for each file

== CLI
```bash
git show abc123                      # Show commit
git show abc123 --stat               # Files changed
git diff abc123~1..abc123            # Commit diff
```
:::

## Blame View

See who changed each line of a file and when.

### Opening Blame

:::tabs
== Axis
1. Right-click a file in the file explorer
2. Select **Blame**
   Or open a file and click the **Blame** toggle

== CLI
```bash
git blame path/to/file.txt
git blame -L 10,20 file.txt          # Lines 10-20 only
```
:::

### Blame Information

Each line shows:
- Author
- Commit hash
- Date
- Click to see the full commit

### Navigate History

:::tabs
== Axis
- Click a blame annotation to jump to that commit
- Use **Previous/Next** to navigate through file history

== CLI
```bash
git log --follow -- path/to/file.txt
```
:::

## File History

View all commits that affected a specific file.

:::tabs
== Axis
1. Right-click a file
2. Select **Show History**
3. See all commits that modified this file

== CLI
```bash
git log --follow -p -- path/to/file.txt
```
:::

## Diff Between Commits

:::tabs
== Axis
1. Select two commits in **History** (`Cmd/Ctrl + click`)
2. Right-click and select **Compare**
3. View the diff between them

== CLI
```bash
git diff abc123..def456
git diff abc123..def456 -- file.txt  # Specific file
```
:::
