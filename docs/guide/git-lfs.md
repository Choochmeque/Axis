# Git LFS

Manage large files with Git Large File Storage.

## What is Git LFS?

Git LFS replaces large files with text pointers, storing the actual file contents on a remote server. This keeps your repository fast.

## Requirements

Install Git LFS: https://git-lfs.github.io

## Setup

1. Go to **Repository > LFS**
2. Click **Initialize LFS** (if not already set up)

## Tracking Files

### Track by Extension
```
*.psd
*.zip
*.mp4
```

### Track Specific Files
1. Right-click a large file
2. Select **Track with LFS**

## Viewing LFS Files

The LFS panel shows:
- Tracked file patterns
- LFS files in your repository
- Download status

## Fetching LFS Files

- LFS files are downloaded on demand
- Click **Fetch LFS** to download all LFS files
- Or download individual files as needed
