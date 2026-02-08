<p align="center">
  <img src="app-icon.png" alt="Axis" width="128" height="128">
</p>

<h1 align="center">Axis</h1>

<p align="center">A modern, cross-platform Git GUI built with Tauri.</p>

[![Unit Tests](https://github.com/Choochmeque/Axis/actions/workflows/tests.yml/badge.svg)](https://github.com/Choochmeque/Axis/actions/workflows/tests.yml)
[![E2E Tests](https://github.com/Choochmeque/Axis/actions/workflows/e2e.yml/badge.svg)](https://github.com/Choochmeque/Axis/actions/workflows/e2e.yml)
[![Checks](https://github.com/Choochmeque/Axis/actions/workflows/checks.yml/badge.svg)](https://github.com/Choochmeque/Axis/actions/workflows/checks.yml)
[![Coverage](https://codecov.io/gh/Choochmeque/Axis/graph/badge.svg)](https://codecov.io/gh/Choochmeque/Axis)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platforms](https://img.shields.io/badge/platforms-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)](https://github.com/Choochmeque/Axis/releases)

---

## About

Axis is a powerful Git client designed to make version control intuitive and efficient. Built with Tauri, React, and Rust, it combines a modern interface with native performance across all major desktop platforms.

## Screenshots

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/public/screenshot-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="docs/public/screenshot-light.png">
  <img alt="Axis - Main Window" src="docs/public/screenshot-light.png">
</picture>

<details>
<summary><strong>Staging Area</strong></summary>

![Axis - Staging Area](docs/public/screenshot-staging.png)

</details>

<details>
<summary><strong>Diff View</strong></summary>

![Axis - Diff View](docs/public/screenshot-diff.png)

</details>

<details>
<summary><strong>Branch Management</strong></summary>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/public/screenshot-branches-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="docs/public/screenshot-branches-light.png">
  <img alt="Axis - Branch Management" src="docs/public/screenshot-branches-light.png">
</picture>

</details>

<details>
<summary><strong>Merge Conflict Resolution</strong></summary>

![Axis - Merge Conflict Resolution](docs/public/screenshot-merge.png)

</details>

<details>
<summary><strong>GitHub Integration</strong></summary>

![Axis - GitHub Integration](docs/public/screenshot-github.png)

</details>

---

## Features

### Core Git Operations

- Clone, init, and manage repositories
- Stage and unstage files with hunk-level precision
- Commit with message templates and amend support
- Branch creation, renaming, deletion, and comparison
- Merge and rebase with interactive conflict resolution
- Stash management with diff preview
- Tag creation and management
- Remote management (fetch, pull, push)
- Reflog navigation

### Advanced Features

- **GitHub Integration** - Pull requests, issues, CI status, notifications
- **AI-Assisted Commits** - Generate commit messages using Claude, OpenAI, or Ollama
- **Git LFS** - Large File Storage support
- **Worktrees** - Create and manage multiple working trees
- **Submodules** - Add and manage submodules
- **GitFlow** - Built-in GitFlow workflow support
- **Bisect** - Binary search for commits that introduced bugs
- **Patches** - Create and apply patches

### Developer Experience

- Visual commit graph with branch visualization
- Interactive rebase with preview diagrams
- Blame view with syntax highlighting
- Content search across repository history
- SSH and GPG key management for signing
- Custom actions and keyboard shortcuts
- Background fetch with notifications
- Multi-language support (i18n)

---

## Installation

### Download

Download the latest release for your platform from [GitHub Releases](https://github.com/Choochmeque/Axis/releases):

| Platform | Download |
|----------|----------|
| macOS    | `.dmg`   |
| Windows  | `.exe` (NSIS installer) |
| Linux    | `.AppImage` |

### Nightly Builds

Nightly builds are available with the latest features and fixes. Check the [Releases](https://github.com/Choochmeque/Axis/releases) page for builds tagged with `-nightly`.

---

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 10+ (required)
- [Rust](https://www.rust-lang.org/) (stable)
- [Tauri CLI](https://tauri.app/)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/Choochmeque/Axis.git
cd Axis

# Install dependencies
pnpm install

# Start development server
pnpm tauri dev
```

### Running Tests

```bash
# Frontend tests with coverage
pnpm test:coverage

# Rust tests with coverage
cargo llvm-cov --workspace --manifest-path src-tauri/Cargo.toml

# Generate TypeScript bindings
cargo test export_typescript_bindings --manifest-path src-tauri/Cargo.toml
```

---

## Building from Source

```bash
# Build for current platform
pnpm tauri build
```

### Code Quality Checks

```bash
# Frontend
pnpm lint
pnpm typecheck
pnpm format:check

# Rust
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
```

---

## Roadmap

**Short-term**
- Performance optimizations
- Bug fixes
- UI/UX improvements
- More language translations

**Medium-term**
- Advanced search & filtering
- GitLab, Bitbucket, and other platform integrations

**Long-term**
- Full native Git implementation (eliminate CLI dependency)

---

## Contributing

Contributions are welcome! Here's how you can help:

- **Fix Bugs / Add Features** - Check [open issues](https://github.com/Choochmeque/Axis/issues) or propose new ideas
- **Write Tests** - Help us maintain 97%+ coverage
- **Test the App** - Try it on different platforms and report bugs
- **Sponsor** - Support development via [GitHub Sponsors](https://github.com/sponsors/Choochmeque)

Please read our [Contributing Guide](CONTRIBUTING.md) before submitting a pull request.

---

## FAQ

<details>
<summary><strong>Is Axis free?</strong></summary>

Yes, Axis is free and open source under the MIT license.

</details>

<details>
<summary><strong>Does Axis require Git to be installed?</strong></summary>

Currently yes, but we're working toward a fully native implementation using git2-rs.

</details>

<details>
<summary><strong>Why Axis over other Git clients?</strong></summary>

Axis is built with modern tech (Tauri + Rust) for native performance without Electron overhead. It's open source, cross-platform and free.

</details>

<details>
<summary><strong>How do I report a bug?</strong></summary>

Open an issue on [GitHub Issues](https://github.com/Choochmeque/Axis/issues) with steps to reproduce.

</details>

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
