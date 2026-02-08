# Branches

Branches let you work on different features or fixes in isolation. Each branch is an independent line of development.

## Viewing Branches

The branches panel shows:
- **Local branches** - Branches on your machine
- **Remote branches** - Branches on remote repositories
- **Current branch** - Highlighted with a checkmark

:::tabs
== Axis
Open the **Branches** panel in the sidebar to see all branches

== CLI
```bash
git branch        # Local branches
git branch -r     # Remote branches
git branch -a     # All branches
```
:::

## Creating a Branch

:::tabs
== Axis
1. Click **New Branch** or right-click on a commit
2. Enter the branch name
3. Choose the starting point (current HEAD, commit, or another branch)
4. Click **Create**

== CLI
```bash
git branch feature-name              # Create from HEAD
git branch feature-name abc123       # Create from commit
git checkout -b feature-name         # Create and switch
```
:::

## Switching Branches

:::tabs
== Axis
Double-click a branch to switch to it
Or right-click and select **Checkout**

== CLI
```bash
git checkout branch-name
# Or with newer Git:
git switch branch-name
```
:::

::: warning
You may need to commit or stash changes before switching branches.
:::

## Renaming a Branch

:::tabs
== Axis
1. Right-click the branch
2. Select **Rename**
3. Enter the new name

== CLI
```bash
git branch -m old-name new-name
# Rename current branch:
git branch -m new-name
```
:::

## Deleting a Branch

:::tabs
== Axis
1. Right-click the branch
2. Select **Delete**
3. Confirm deletion

== CLI
```bash
git branch -d branch-name     # Safe delete (merged only)
git branch -D branch-name     # Force delete
```
:::

::: tip
Use **Force Delete** for branches not fully merged.
:::

## Pushing a Branch

:::tabs
== Axis
1. Right-click the local branch
2. Select **Push**
3. Choose the remote (usually origin)

== CLI
```bash
git push -u origin branch-name
```
:::

## Comparing Branches

:::tabs
== Axis
1. Select two branches (`Cmd/Ctrl + click`)
2. Right-click and select **Compare**
3. View the diff between branches

== CLI
```bash
git diff branch1..branch2
git log branch1..branch2
```
:::

## Tracking Remote Branches

:::tabs
== Axis
1. Find the remote branch in the **Branches** panel
2. Double-click or right-click and select **Checkout**
3. Axis creates a local tracking branch automatically

== CLI
```bash
git checkout --track origin/branch-name
# Or with newer Git:
git switch -c branch-name origin/branch-name
```
:::
