# Custom Actions

Custom actions allow you to define and run shell commands directly from Axis. Create shortcuts for your frequent Git operations, build scripts, or any command-line task.

## Creating Actions

### Global Actions

Global actions are available in all repositories:

1. Open **Settings** > **Actions** > **Global Actions**
2. Click **Add Action**
3. Configure your action:
   - **Name**: Display name for the action
   - **Command**: Shell command to execute
   - **Shortcut**: Optional keyboard shortcut
   - **Show output**: Display command output in a dialog
   - **Confirm before run**: Show confirmation dialog

### Repository Actions

Repository-specific actions only appear for that repository:

1. Open **Settings** > **Actions** > **Repository Actions**
2. Click **Add Action**
3. Configure as above

## Action Variables

Use variables in your commands to insert dynamic values:

| Variable | Description |
|----------|-------------|
| `{branch}` | Current branch name |
| `{commit}` | Selected commit hash |
| `{file}` | Selected file path |
| `{repo}` | Repository root path |
| `{remote}` | Default remote name |

### Example

```bash
# Deploy current branch
./deploy.sh --branch {branch} --env staging

# Open file in editor
code {file}

# Create GitHub PR for current branch
gh pr create --base main --head {branch}
```

## Context Menus

Actions can appear in context menus based on their configuration:

- **Commit actions**: Right-click on commits in history
- **Branch actions**: Right-click on branches
- **File actions**: Right-click on files in staging area
- **Tag actions**: Right-click on tags
- **Stash actions**: Right-click on stash entries

## Keyboard Shortcuts

Assign keyboard shortcuts to frequently used actions:

1. Edit the action
2. Click the **Shortcut** field
3. Press your desired key combination
4. Save the action

::: tip
Use modifier keys (Cmd/Ctrl, Alt, Shift) with letters or numbers for shortcuts.
:::

## Examples

### Run Tests

```bash
# Name: Run Tests
# Shortcut: Ctrl+T (Cmd+T on macOS)
npm test
```

### Open in GitHub

```bash
# Name: Open in GitHub
# Context: Commit
gh browse {commit}
```

### Rebase onto Main

```bash
# Name: Rebase onto Main
# Confirm: Yes
git fetch origin && git rebase origin/main
```

### Format Code

```bash
# Name: Format Code
# Shortcut: Ctrl+Shift+F (Cmd+Shift+F on macOS)
npm run format
```

### Open in VS Code

```bash
# Name: Open in VS Code
code {repo}
```

## Output Handling

When **Show output** is enabled:

- Command output appears in a dialog after execution
- Both stdout and stderr are captured
- Exit code is displayed
- Output can be copied to clipboard

## Working Directory

Actions run in the repository root directory by default. Use `cd` to change directories:

```bash
cd packages/frontend && npm test
```
