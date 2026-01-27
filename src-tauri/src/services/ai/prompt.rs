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

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== build_prompt Tests ====================

    #[test]
    fn test_build_prompt_standard() {
        let diff = "+ fn new_function() {}";
        let (system, user) = build_prompt(diff, false);

        assert!(system.contains("imperative mood"));
        assert!(system.contains("72 characters"));
        assert!(!system.contains("Conventional Commits"));
        assert!(user.contains("```diff"));
        assert!(user.contains("+ fn new_function() {}"));
    }

    #[test]
    fn test_build_prompt_conventional_commits() {
        let diff = "- old_line\n+ new_line";
        let (system, user) = build_prompt(diff, true);

        assert!(system.contains("Conventional Commits"));
        assert!(system.contains("feat:"));
        assert!(system.contains("fix:"));
        assert!(system.contains("docs:"));
        assert!(system.contains("refactor:"));
        assert!(user.contains("- old_line"));
        assert!(user.contains("+ new_line"));
    }

    #[test]
    fn test_build_prompt_empty_diff() {
        let (system, user) = build_prompt("", false);

        assert!(!system.is_empty());
        assert!(user.contains("```diff\n\n```"));
    }

    #[test]
    fn test_build_prompt_multiline_diff() {
        let diff = r#"diff --git a/file.rs b/file.rs
--- a/file.rs
+++ b/file.rs
@@ -1,3 +1,4 @@
 fn main() {
+    println!("Hello");
 }"#;

        let (system, user) = build_prompt(diff, false);

        assert!(user.contains("diff --git"));
        assert!(user.contains("println!"));
        assert!(!system.is_empty());
    }

    #[test]
    fn test_build_prompt_standard_contains_guidelines() {
        let (system, _) = build_prompt("test", false);

        assert!(system.contains("Add, Fix, Update, Remove, Refactor"));
        assert!(system.contains("WHAT changed and WHY"));
        assert!(system.contains("Return ONLY the commit message"));
    }

    #[test]
    fn test_build_prompt_conventional_contains_all_types() {
        let (system, _) = build_prompt("test", true);

        assert!(system.contains("feat:"));
        assert!(system.contains("fix:"));
        assert!(system.contains("docs:"));
        assert!(system.contains("style:"));
        assert!(system.contains("refactor:"));
        assert!(system.contains("perf:"));
        assert!(system.contains("test:"));
        assert!(system.contains("build:"));
        assert!(system.contains("ci:"));
        assert!(system.contains("chore:"));
        assert!(system.contains("revert:"));
    }

    #[test]
    fn test_build_prompt_conventional_breaking_change() {
        let (system, _) = build_prompt("test", true);

        assert!(system.contains("breaking change"));
        assert!(system.contains("!"));
    }

    #[test]
    fn test_build_prompt_user_prompt_format() {
        let diff = "test diff content";
        let (_, user) = build_prompt(diff, false);

        assert!(user.starts_with("Generate a commit message"));
        assert!(user.contains("```diff"));
        assert!(user.ends_with("```"));
    }

    #[test]
    fn test_build_prompt_special_characters() {
        let diff = r#"+ let s = "hello \"world\"";
+ let regex = r"\d+";
+ let path = "C:\\Users\\test";"#;

        let (_, user) = build_prompt(diff, false);

        assert!(user.contains(r#"\"world\""#));
        assert!(user.contains(r"\d+"));
    }
}
