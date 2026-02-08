# Submodules

Manage nested Git repositories.

## What are Submodules?

Submodules allow you to include other Git repositories within your repository, keeping them as separate projects with their own history.

## Adding a Submodule

1. Go to **Repository > Submodules**
2. Click **Add Submodule**
3. Enter the repository URL
4. Choose the local path
5. Click **Add**

## Updating Submodules

### Update All
- Click **Update All** to fetch latest commits for all submodules

### Update Individual
- Right-click a submodule
- Select **Update**

## Viewing Submodule Status

The submodule panel shows:
- Current commit
- Whether updates are available
- Modified files within submodules

## Removing a Submodule

1. Right-click the submodule
2. Select **Remove**
3. Confirm deletion

::: warning
This will remove the submodule reference and optionally delete the files.
:::
