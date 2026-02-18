---
description: Configure Git Large File Storage in Axis. Store large binary files efficiently without bloating your repo.
---

# Git LFS

Git Large File Storage (LFS) replaces large files with lightweight pointers, storing actual file contents on a remote server. This keeps your repository fast and manageable.

## What is Git LFS?

Git wasn't designed for large binary files. Every clone downloads the entire history, including all versions of every file. With large files, this becomes slow and wasteful.

```
Without LFS:
Repository contains full file history
Clone downloads ALL versions of large files
Size grows with every change

With LFS:
Repository contains small pointer files
Clone downloads only current versions
Large files stored separately on LFS server
```

**Key points:**
- Pointer files are tiny text files (~130 bytes)
- Actual content stored on LFS server
- Only needed versions are downloaded
- Works transparently after setup

## When to Use Git LFS

### Good Candidates for LFS

| File Type | Examples |
|-----------|----------|
| **Images** | PSD, AI, PNG, JPG (large) |
| **Audio** | WAV, MP3, FLAC |
| **Video** | MP4, MOV, AVI |
| **Archives** | ZIP, TAR, 7z |
| **Binaries** | EXE, DLL, compiled assets |
| **Data files** | Large CSV, JSON, databases |
| **Game assets** | 3D models, textures, levels |

### When NOT to Use LFS

- **Small files** - Overhead not worth it under ~100KB
- **Text files** - Git handles these efficiently
- **Frequently diffed files** - LFS doesn't show meaningful diffs
- **Files that compress well** - Git's compression may be enough

## Requirements

### Install Git LFS

:::tabs
== macOS
```bash
brew install git-lfs
git lfs install
```

== Linux
```bash
# Ubuntu/Debian
sudo apt install git-lfs
git lfs install

# Or download from https://git-lfs.github.io
```

== Windows
```powershell
# With Git for Windows (often included)
git lfs install

# Or download installer from https://git-lfs.github.io
```
:::

### Server Support

Most Git hosts support LFS:
- **GitHub** - Included, with storage limits
- **GitLab** - Included, configurable limits
- **Bitbucket** - Included with paid plans
- **Azure DevOps** - Included

Check your host's LFS storage limits and pricing.

## Setup in Axis

### Initialize LFS

:::tabs
== Axis
1. Open your repository
2. Go to **Repository** menu
3. Select **LFS**
4. Click **Initialize LFS** (if not already set up)

== CLI
```bash
git lfs install
```
:::

This creates the `.gitattributes` file for tracking patterns.

### Track File Types

:::tabs
== Axis
1. Open the **LFS** panel
2. Click **Add Pattern**
3. Enter a pattern (e.g., `*.psd`)
4. Click **Add**

== CLI
```bash
git lfs track "*.psd"
git lfs track "*.mp4"
git add .gitattributes
```
:::

Common patterns:
```
*.psd
*.ai
*.mp4
*.mov
*.zip
*.tar.gz
*.exe
*.dll
```

### Track Specific Files

:::tabs
== Axis
1. Right-click a large file in staging
2. Select **Track with LFS**
3. File is added to `.gitattributes`

== CLI
```bash
git lfs track "path/to/large-file.bin"
git add .gitattributes path/to/large-file.bin
```
:::

## Understanding .gitattributes

LFS tracking is configured in `.gitattributes`:

```
*.psd filter=lfs diff=lfs merge=lfs -text
*.mp4 filter=lfs diff=lfs merge=lfs -text
assets/large/** filter=lfs diff=lfs merge=lfs -text
```

- `filter=lfs` - Use LFS for storage
- `diff=lfs` - Use LFS for diffs
- `merge=lfs` - Use LFS for merges
- `-text` - Treat as binary

## Working with LFS Files

### Viewing LFS Files

:::tabs
== Axis
The **LFS** panel shows:
- **Tracked patterns** - What file types use LFS
- **LFS files** - Files managed by LFS in your repo
- **Download status** - Which files are downloaded locally

== CLI
```bash
git lfs ls-files                  # List tracked files
git lfs status                    # Show status
git lfs track                     # List tracked patterns
```
:::

### Fetching LFS Files

LFS files are downloaded on demand:

:::tabs
== Axis
- **Automatic** - Files download when checked out
- **Manual fetch** - Click **Fetch LFS** to download all
- **Individual** - Right-click a file to download it

== CLI
```bash
git lfs pull                      # Download all LFS files
git lfs pull --include="*.psd"    # Download specific pattern
git lfs fetch                     # Fetch without checkout
```
:::

### Checking File Status

In the LFS panel, files show:

| Status | Meaning |
|--------|---------|
| **Downloaded** | File content available locally |
| **Pointer only** | Only pointer file, content on server |
| **Modified** | Local changes not yet committed |

## Migrating Existing Files

### Convert Files to LFS

If you have large files already in your repo:

1. Track the pattern: `git lfs track "*.psd"`
2. The existing files are automatically converted on next commit
3. Previous history still contains full files

### Rewrite History (Advanced)

To remove large files from entire history:

```bash
git lfs migrate import --include="*.psd" --everything
```

::: warning
This rewrites history. Only do this on repositories where you can force push and coordinate with all collaborators.
:::

## LFS and Cloning

### Clone with LFS

Cloning an LFS repository:

1. Clone downloads repository with pointer files
2. LFS files download based on checkout
3. Use `git lfs pull` to ensure all files downloaded

### Shallow Clone

For faster clones:

```bash
git clone --depth 1 <url>
```

This gets only latest versions, minimal LFS downloads.

### Skip LFS on Clone

If you don't need LFS files:

```bash
GIT_LFS_SKIP_SMUDGE=1 git clone <url>
```

Files remain as pointers until manually fetched.

## Best Practices

### Track Early

Set up LFS tracking before adding large files. Retroactive conversion is more complex.

### Use Patterns

Track by extension rather than individual files:
```
# Good
*.psd

# Avoid (unless necessary)
assets/logo.psd
```

### Document LFS Usage

Add to your README:
```markdown
## Large Files

This repository uses Git LFS for large assets.
Install Git LFS before cloning: https://git-lfs.github.io
```

### Monitor Storage

Track your LFS storage usage on your Git host. Large files add up quickly.

### Clean Up Unused Files

LFS files count against storage even after deletion. Use `git lfs prune` to clean up:

```bash
# Remove old LFS files not in recent commits
git lfs prune
```

## Troubleshooting

### "Smudge filter lfs failed"

LFS isn't installed or configured:

```bash
git lfs install
git lfs pull
```

### Large Clone Size

LFS files downloading during clone. For faster clone:

```bash
GIT_LFS_SKIP_SMUDGE=1 git clone <url>
cd repo
git lfs pull
```

### File Shows as Pointer

The LFS content wasn't downloaded:

```bash
git lfs pull
# Or for specific file:
git lfs pull --include="path/to/file"
```

### Storage Limit Reached

Your Git host's LFS storage is full:

1. Check storage usage on host
2. Delete unused LFS files
3. Run `git lfs prune`
4. Consider upgrading plan

## LFS vs Alternatives

| Solution | Best For |
|----------|----------|
| **Git LFS** | Large files that change occasionally |
| **Git submodules** | Separate repositories for assets |
| **External storage** | Very large files, CDN delivery |
| **git-annex** | Scientific data, flexible backends |
