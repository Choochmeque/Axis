# Contributing to Axis

Thank you for your interest in contributing to Axis! This guide will help you get started.

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) 20 or higher
- [pnpm](https://pnpm.io/) 10 or higher (required - npm/yarn not supported)
- [Rust](https://www.rust-lang.org/) (stable toolchain)
- [Tauri CLI](https://tauri.app/)

### Platform-Specific Requirements

**Linux:**
```bash
sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf cmake
```

**macOS:**
```bash
xcode-select --install
```

**Windows:**
- Visual Studio Build Tools with C++ workload

## Development Setup

```bash
# Clone the repository
git clone https://github.com/Choochmeque/Axis.git
cd Axis

# Install dependencies
pnpm install

# Start development server
pnpm tauri dev
```

### Project Structure

```
Axis/
├── src/                    # React/TypeScript frontend
│   ├── components/         # UI components
│   ├── store/              # Zustand state management
│   ├── services/           # Tauri command wrappers
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions
│   ├── i18n/               # Internationalization
│   └── types/              # TypeScript types
│
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── commands/       # Tauri command handlers
│   │   ├── services/       # Git and integration services
│   │   ├── models/         # Data structures
│   │   └── storage/        # Database layer
│   └── Cargo.toml
│
└── e2e/                    # End-to-end tests
```

## Code Quality Requirements

### Test Coverage

Both TypeScript and Rust code require **97%+ test coverage**. PRs that decrease coverage will not be merged.

```bash
# Frontend tests with coverage
pnpm test:coverage

# Rust tests with coverage
cargo llvm-cov --workspace --manifest-path src-tauri/Cargo.toml
```

### Linting and Formatting

All code must pass linting and formatting checks before merging.

**Frontend:**
```bash
pnpm lint          # ESLint
pnpm typecheck     # TypeScript
pnpm format        # Prettier (fix)
pnpm format:check  # Prettier (check only)
```

**Rust:**
```bash
cargo fmt --manifest-path src-tauri/Cargo.toml          # Format
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check  # Check only
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
```

## Coding Standards

### Rust

- **No `unwrap()`** in production code. Use proper error handling with `?` or `expect()` with meaningful messages
- **Use `expect()` only in tests** with descriptive messages
- **Declare imports at the top** of the file, never inline within functions
- **Use `git2-rs`** for Git operations whenever possible
- **PascalCase for enums** with `#[serde(rename_all = "PascalCase")]` and strum derives
- **Use strum** for enum utilities where applicable
- **Format strings**: Use `"foo: {bar}"` not `"foo: {}", bar`

### TypeScript

- **Use `@` path alias** for imports (e.g., `@/components/Button`)
- **Declare imports at the top** of the file
- **Avoid inline styles** - use Tailwind CSS classes or `index.css`
- **Import types from `@/types`** instead of `bindings/`

### General

- **Never fail silently** - always log errors or show a toast notification
- **Virtualize long lists** - use virtualization for performance
- **Cache aggressively** - invalidate on file system changes
- **Follow existing patterns** - consistency is critical

## Generating TypeScript Bindings

After modifying Rust types or commands, regenerate TypeScript bindings:

```bash
cargo test export_typescript_bindings --manifest-path src-tauri/Cargo.toml
```

## Commit Guidelines

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
type(scope): description

feat(staging): add hunk-level staging support
fix(branches): resolve checkout conflict detection
docs(readme): update installation instructions
refactor(services): simplify git2 error handling
test(commands): add coverage for stash operations
```

### Before Committing

Run all checks:

```bash
# Frontend
pnpm lint && pnpm typecheck && pnpm format && pnpm test

# Rust
cargo fmt --manifest-path src-tauri/Cargo.toml && \
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings && \
cargo test --manifest-path src-tauri/Cargo.toml
```

## Pull Request Process

1. **Fork** the repository and create a feature branch from `main`
2. **Write tests** for new functionality
3. **Ensure all checks pass** (tests, linting, formatting, coverage)
4. **Submit a PR** with a clear description of changes
5. **Address review feedback** promptly

### PR Requirements

- All CI checks must pass
- Test coverage must remain at 97%+
- Code must follow project coding standards
- Changes must be documented if they affect user-facing features

## Cross-Platform Considerations

Axis supports Linux, macOS, and Windows. When contributing:

- Test on multiple platforms when possible
- Use platform-agnostic paths (`std::path::PathBuf`)
- Handle platform-specific behavior in dedicated modules
- Consider SSH backend differences (WinCNG on Windows)

## Questions?

If you have questions or need help, feel free to open an issue or start a discussion on GitHub.
