# Staging & Commits

The staging area (index) lets you prepare changes before committing. You can stage entire files, specific hunks, or even individual lines.

## Staging Changes

### Stage Individual Files

:::tabs
== Axis
Click the **+** button next to a file to stage it
Or select multiple files and click **Stage Selected**

== CLI
```bash
git add path/to/file.txt
git add file1.txt file2.txt
```
:::

### Stage Hunks

Stage specific parts of a file instead of the entire file.

:::tabs
== Axis
1. Click on a file to view its diff
2. Click **Stage Hunk** to stage individual hunks
3. Or click line numbers to stage specific lines

== CLI
```bash
git add -p path/to/file.txt
# Then use y/n/s to stage hunks interactively
```
:::

### Stage All

:::tabs
== Axis
Click **Stage All** in the staging panel toolbar

== CLI
```bash
git add -A
```
:::

## Unstaging

### Unstage Files

:::tabs
== Axis
Click the **-** button next to a staged file
Or click **Unstage All** to unstage everything

== CLI
```bash
git restore --staged path/to/file.txt
git restore --staged .  # Unstage all
```
:::

## Creating Commits

### Basic Commit

:::tabs
== Axis
1. Stage your changes
2. Enter a commit message in the text field
3. Click **Commit** or press `Cmd/Ctrl + Enter`

== CLI
```bash
git commit -m "Your commit message"
```
:::

### Commit Message Tips

- First line: Brief summary (50 chars or less)
- Leave a blank line
- Additional details if needed

```
Add user authentication

Implements JWT-based auth with refresh tokens.
Includes login, logout, and password reset endpoints.
```

### Amend Last Commit

Modify the previous commit - useful for fixing typos or adding forgotten files.

:::tabs
== Axis
1. Stage any additional changes
2. Check **Amend** before committing
3. Edit the commit message if needed
4. Click **Commit**

== CLI
```bash
git commit --amend -m "Updated message"
# Or to keep the same message:
git commit --amend --no-edit
```
:::

::: warning
Only amend commits that haven't been pushed. Amending shared commits rewrites history and causes problems for collaborators.
:::
