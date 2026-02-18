---
description: Find bugs with Git bisect in Axis. Binary search through commits to locate when a bug was introduced.
---

# Git Bisect

Git bisect uses binary search to find the commit that introduced a bug. Instead of checking every commit, it efficiently narrows down the problematic commit.

## How Bisect Works

1. You specify a "good" commit (where the bug didn't exist)
2. You specify a "bad" commit (where the bug exists)
3. Git checks out a commit in the middle
4. You test and mark it as good or bad
5. Git narrows the search and repeats
6. Eventually, Git finds the first bad commit

With binary search, finding a bug among 1000 commits takes only ~10 tests.

## Starting a Bisect

### From Commit History

:::tabs
== Axis
1. Find a commit you know was working (good)
2. Right-click the commit
3. Select **Bisect from here (good)...**
4. Enter the bad commit (or leave empty for HEAD)
5. Click **Start Bisect**

== CLI
```bash
git bisect start
git bisect bad HEAD               # Current is broken
git bisect good abc123            # This commit was working
```
:::

### From the Dialog

:::tabs
== Axis
1. Open the bisect dialog from **Repository** menu
2. Enter the good (old) commit hash
3. Enter the bad (new) commit hash (optional, defaults to HEAD)
4. Click **Start Bisect**

== CLI
```bash
git bisect start HEAD abc123      # bad good in one command
```
:::

## Testing Commits

Once bisect starts, Axis shows a banner indicating:

- The current commit being tested
- Approximate steps remaining

For each commit:

:::tabs
== Axis
1. Test if the bug exists
2. Click one of:
   - **Mark as good** - Bug not present
   - **Mark as bad** - Bug is present
   - **Skip commit** - Can't test this commit (e.g., won't build)

== CLI
```bash
# After testing the current commit:
git bisect good                   # Bug not present
git bisect bad                    # Bug is present
git bisect skip                   # Can't test this commit
```
:::

## Finding the Result

When bisect completes, Axis shows the first bad commit - the one that introduced the bug.

The result includes:

- Commit hash
- Author
- Commit message
- Changed files

## Ending Bisect

:::tabs
== Axis
Click **End Bisect** to stop the bisect session
Returns to your original branch

== CLI
```bash
git bisect reset
```
:::

::: tip
Always end bisect when done. Leaving a bisect session active can cause confusion.
:::

## Tips

### Automate Testing

If you have automated tests, you can quickly determine good/bad status:

1. Run your test suite
2. Mark based on test results

### Skip When Necessary

Use **Skip** when a commit:

- Won't compile
- Has unrelated issues
- Can't be tested for other reasons

Git will work around skipped commits.

### Take Notes

Note which commits you've tested and why. This helps if you need to restart or explain findings later.

### Start Wide

Choose commits far apart for good/bad. This gives bisect more room to narrow down efficiently.

## Example Workflow

1. Notice a bug in the current version
2. Find a release tag from when the bug didn't exist
3. Right-click that tag's commit → **Bisect from here (good)**
4. Bisect starts with HEAD as bad
5. Test each commit Axis checks out
6. After ~7 steps (for 100 commits), find the culprit
7. Review the bad commit to understand what caused the bug
8. End bisect and create a fix
