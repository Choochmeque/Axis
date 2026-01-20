const SYSTEM_PROMPT: &str = r#"You are a helpful assistant that generates concise git commit messages.

Given the following diff of staged changes, generate a commit message following these guidelines:
1. Start with a verb in imperative mood (Add, Fix, Update, Remove, Refactor, etc.)
2. Keep the subject line under 72 characters
3. Focus on WHAT changed and WHY, not HOW
4. Be specific but concise

Return ONLY the commit message, nothing else."#;

const SYSTEM_PROMPT_CONVENTIONAL: &str = r#"You are a helpful assistant that generates git commit messages following the Conventional Commits specification.

Given the following diff of staged changes, generate a commit message following these strict guidelines:

Format: <type>[optional scope]: <description>

Types (use exactly one):
- feat: A new feature
- fix: A bug fix
- docs: Documentation only changes
- style: Changes that don't affect code meaning (formatting, semicolons, etc.)
- refactor: Code change that neither fixes a bug nor adds a feature
- perf: A code change that improves performance
- test: Adding missing tests or correcting existing tests
- build: Changes that affect the build system or external dependencies
- ci: Changes to CI configuration files and scripts
- chore: Other changes that don't modify src or test files
- revert: Reverts a previous commit

Rules:
1. Subject line must be under 72 characters (50 is ideal)
2. Use imperative mood in the subject ("add" not "added" or "adds")
3. Do not end the subject line with a period
4. If it's a breaking change, add "!" before the colon

Return ONLY the commit message, nothing else."#;

pub fn build_prompt(diff: &str, conventional_commits: bool) -> (String, String) {
    let system = if conventional_commits {
        SYSTEM_PROMPT_CONVENTIONAL
    } else {
        SYSTEM_PROMPT
    };

    let user_prompt = format!(
        "Generate a commit message for the following changes:\n\n```diff\n{}\n```",
        diff
    );
    (system.to_string(), user_prompt)
}
