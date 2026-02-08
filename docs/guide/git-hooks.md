# Git Hooks

Git hooks are scripts that run automatically before or after Git events like commits, pushes, and merges. Axis provides a visual interface to manage and monitor hooks.

## Understanding Hooks

Git hooks are stored in the `.git/hooks` directory of your repository. Common hooks include:

| Hook | Trigger | Use Case |
|------|---------|----------|
| `pre-commit` | Before commit is created | Lint code, run tests |
| `commit-msg` | After commit message is entered | Validate commit message format |
| `pre-push` | Before push to remote | Run tests, check branch policies |
| `post-merge` | After merge completes | Install dependencies, rebuild |
| `post-checkout` | After checkout completes | Update dependencies |

## Hook Status

When committing in Axis, hook execution is displayed in real-time:

1. **Running** - Hook is currently executing
2. **Passed** - Hook completed successfully
3. **Failed** - Hook returned a non-zero exit code

::: warning
If a hook fails, the Git operation is aborted. Fix the issues reported by the hook and try again.
:::

## Bypassing Hooks

In some cases, you may need to skip hook execution:

1. Open the commit dialog
2. Enable **Skip hooks** option
3. Proceed with your commit

::: danger
Only bypass hooks when absolutely necessary. Hooks exist to maintain code quality and consistency.
:::

## Common Hook Tools

Axis works seamlessly with popular hook managers:

### Husky

[Husky](https://typicode.github.io/husky/) is a popular tool for managing Git hooks in JavaScript projects.

```bash
# Install husky
npm install husky --save-dev

# Initialize
npx husky init
```

### pre-commit

[pre-commit](https://pre-commit.com/) is a framework for managing multi-language pre-commit hooks.

```bash
# Install pre-commit
pip install pre-commit

# Install hooks
pre-commit install
```

### lefthook

[Lefthook](https://github.com/evilmartians/lefthook) is a fast and powerful Git hooks manager.

:::tabs
== macOS
```bash
brew install lefthook
lefthook install
```

== Linux
```bash
curl -1sLf 'https://dl.cloudsmith.io/public/evilmartians/lefthook/setup.deb.sh' | sudo -E bash
sudo apt install lefthook
lefthook install
```

== Windows
```powershell
winget install evilmartians.lefthook
lefthook install
```
:::

## Troubleshooting

### Hook Not Running

1. **macOS/Linux**: Ensure the hook file is executable: `chmod +x .git/hooks/pre-commit`
2. **Windows**: Ensure Git can find the interpreter (bash, node, python, etc.)
3. Check the shebang line at the top of the hook script (e.g., `#!/bin/sh`)
4. Verify the hook is not disabled in Git config

### Hook Timeout

Long-running hooks may appear to hang. Check:

1. The hook script for infinite loops
2. Network operations that may be slow
3. Large file operations

### Hook Output

Axis displays hook output in the commit dialog. For detailed debugging, run the hook manually:

:::tabs
== macOS/Linux
```bash
.git/hooks/pre-commit
```

== Windows
```powershell
bash .git/hooks/pre-commit
# or if using a Node.js hook:
node .git/hooks/pre-commit
```
:::
