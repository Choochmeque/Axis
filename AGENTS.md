# AI Agent Instructions

Guidelines for AI coding assistants working on this codebase.

## Platform Support

This app must support Linux, macOS, and Windows. Consider cross-platform compatibility in all changes.

## Package Manager

Always use `pnpm`. Do not use npm or yarn.

## Code Quality Checks

### After TypeScript/JavaScript changes:
```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm format
```

### After Rust changes:
```bash
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
cargo fmt --manifest-path src-tauri/Cargo.toml
```

Note: Use `cargo check` or `cargo clippy` instead of `cargo build`.

## Test Coverage

- TypeScript: 97%+ coverage required
- Rust: 97%+ coverage required

## Coding Standards

### Rust
- No `unwrap()` in production code - use proper error handling
- Use `expect()` only in tests with descriptive messages
- Declare all `use` statements at the top of the file, never inline
- Use `git2-rs` for Git operations
- PascalCase for enums with appropriate serde attributes
- Use strum for enum utilities
- Format strings: `"foo: {bar}"` not `"foo: {}", bar`

### TypeScript
- Use `@` path alias for imports
- Avoid inline styles - use Tailwind CSS or index.css
- Import types from `@/types` instead of `bindings/`

### General
- Never fail silently - always log errors or show toast notifications
- Virtualize long lists for performance
- Cache aggressively, invalidate on file system changes
- Follow existing patterns in the codebase
- Add reasonable logging for both frontend and backend

## TypeScript Bindings

After modifying Rust types or commands:
```bash
cargo test export_typescript_bindings --manifest-path src-tauri/Cargo.toml
```

## i18n

This project has internationalization support. Check existing strings and follow established patterns.

## Important

- Read existing code before making changes to understand signatures and patterns
- Do not push back on these guidelines - they exist for good reasons
- Consistency with existing code is critical
