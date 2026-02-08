# Submodules

Manage nested Git repositories within your project.

## What are Submodules?

Submodules allow you to include other Git repositories within your repository, keeping them as separate projects with their own history.

Common uses:
- Shared libraries or components
- Third-party dependencies
- Separating large projects into modules

## Adding a Submodule

:::tabs
== Axis
1. Go to **Repository > Submodules**
2. Click **Add Submodule**
3. Enter the repository URL
4. Choose the local path
5. Click **Add**

== CLI
```bash
git submodule add https://github.com/user/repo.git path/to/submodule
git commit -m "Add submodule"
```
:::

## Cloning with Submodules

When cloning a repository that contains submodules:

:::tabs
== Axis
1. Clone the repository normally
2. Go to **Repository > Submodules**
3. Click **Initialize** to download submodule contents

== CLI
```bash
# Clone and init submodules in one command:
git clone --recurse-submodules https://github.com/user/repo.git

# Or initialize after cloning:
git submodule update --init --recursive
```
:::

## Updating Submodules

### Update All

:::tabs
== Axis
Click **Update All** to fetch latest commits for all submodules

== CLI
```bash
git submodule update --remote --merge
```
:::

### Update Individual

:::tabs
== Axis
1. Right-click a submodule
2. Select **Update**

== CLI
```bash
git submodule update --remote path/to/submodule
```
:::

## Viewing Submodule Status

:::tabs
== Axis
The **Submodules** panel shows:
- Current commit
- Whether updates are available
- Modified files within submodules

== CLI
```bash
git submodule status
```
:::

## Making Changes in Submodules

:::tabs
== Axis
1. Open the submodule as a separate repository
2. Make changes and commit
3. Push changes to submodule's remote
4. Return to parent repo and commit the submodule update

== CLI
```bash
cd path/to/submodule
# Make changes...
git add . && git commit -m "Changes"
git push

cd ../..
git add path/to/submodule
git commit -m "Update submodule"
```
:::

## Removing a Submodule

:::tabs
== Axis
1. Right-click the submodule
2. Select **Remove**
3. Confirm deletion

== CLI
```bash
git submodule deinit path/to/submodule
git rm path/to/submodule
git commit -m "Remove submodule"
```
:::

::: warning
This will remove the submodule reference and optionally delete the files.
:::

## Common Issues

### Submodule Not Initialized

If submodule folders are empty:

:::tabs
== Axis
Go to **Repository > Submodules > Initialize**

== CLI
```bash
git submodule update --init --recursive
```
:::

### Detached HEAD in Submodule

Submodules checkout specific commits, not branches. To work on a branch:

```bash
cd path/to/submodule
git checkout main
```
