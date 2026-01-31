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

const PR_SYSTEM_PROMPT: &str = r#"You are a helpful assistant that generates concise pull request titles and descriptions.

Given a list of commits and an optional summary of changed files, generate:
1. A short, descriptive PR title (under 72 characters, imperative mood)
2. A PR body in markdown with:
   - A summary of what the PR does (1-3 sentences)
   - A bullet list of key changes

Format your response EXACTLY as:
TITLE: <your title here>
BODY:
<your body here>

Be specific but concise. Focus on the user-facing impact of changes.
Return ONLY the formatted response, nothing else."#;

pub fn build_pr_prompt(
    commits: &[(String, String)],
    diff_summary: Option<&str>,
) -> (String, String) {
    let mut user_prompt =
        String::from("Generate a PR title and description for these commits:\n\n");

    for (short_oid, summary) in commits {
        user_prompt.push_str(&format!("- {short_oid}: {summary}\n"));
    }

    if let Some(summary) = diff_summary {
        user_prompt.push_str(&format!("\nChanged files:\n{summary}\n"));
    }

    (PR_SYSTEM_PROMPT.to_string(), user_prompt)
}

pub fn parse_pr_response(response: &str) -> (String, String) {
    let response = response.trim();

    // Try to parse TITLE: ... BODY: ... format
    if let Some(title_start) = response.find("TITLE:") {
        let after_title = &response[title_start + 6..];
        if let Some(body_marker) = after_title.find("BODY:") {
            let title = after_title[..body_marker].trim().to_string();
            let body = after_title[body_marker + 5..].trim().to_string();
            return (title, body);
        }
        // TITLE found but no BODY marker - title is first line, rest is body
        let title = after_title.lines().next().unwrap_or("").trim().to_string();
        let body = after_title
            .lines()
            .skip(1)
            .collect::<Vec<_>>()
            .join("\n")
            .trim()
            .to_string();
        return (title, body);
    }

    // Fallback: first line is title, rest is body
    let mut lines = response.lines();
    let title = lines.next().unwrap_or("Pull Request").trim().to_string();
    let body = lines.collect::<Vec<_>>().join("\n").trim().to_string();
    (title, body)
}

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

    // ==================== build_pr_prompt Tests ====================

    #[test]
    fn test_build_pr_prompt_with_commits() {
        let commits = vec![
            ("abc123".to_string(), "Add login page".to_string()),
            ("def456".to_string(), "Fix validation".to_string()),
        ];
        let (system, user) = build_pr_prompt(&commits, None);

        assert!(system.contains("pull request"));
        assert!(system.contains("TITLE:"));
        assert!(system.contains("BODY:"));
        assert!(user.contains("abc123: Add login page"));
        assert!(user.contains("def456: Fix validation"));
    }

    #[test]
    fn test_build_pr_prompt_with_diff_summary() {
        let commits = vec![("abc123".to_string(), "Update auth".to_string())];
        let summary = "- Modified: src/auth.rs\n- Added: src/login.rs";
        let (_, user) = build_pr_prompt(&commits, Some(summary));

        assert!(user.contains("Changed files:"));
        assert!(user.contains("src/auth.rs"));
        assert!(user.contains("src/login.rs"));
    }

    #[test]
    fn test_build_pr_prompt_empty_commits() {
        let commits: Vec<(String, String)> = vec![];
        let (system, user) = build_pr_prompt(&commits, None);

        assert!(!system.is_empty());
        assert!(user.contains("Generate a PR title"));
    }

    #[test]
    fn test_build_pr_prompt_no_diff_summary() {
        let commits = vec![("abc".to_string(), "Test".to_string())];
        let (_, user) = build_pr_prompt(&commits, None);

        assert!(!user.contains("Changed files:"));
    }

    // ==================== parse_pr_response Tests ====================

    #[test]
    fn test_parse_pr_response_standard_format() {
        let response = "TITLE: Add user authentication\nBODY:\n## Summary\nAdds OAuth2 login flow";
        let (title, body) = parse_pr_response(response);

        assert_eq!(title, "Add user authentication");
        assert!(body.contains("Summary"));
        assert!(body.contains("OAuth2"));
    }

    #[test]
    fn test_parse_pr_response_multiline_body() {
        let response = "TITLE: Fix bug\nBODY:\n- Fixed null check\n- Added tests\n- Updated docs";
        let (title, body) = parse_pr_response(response);

        assert_eq!(title, "Fix bug");
        assert!(body.contains("Fixed null check"));
        assert!(body.contains("Added tests"));
        assert!(body.contains("Updated docs"));
    }

    #[test]
    fn test_parse_pr_response_fallback_no_markers() {
        let response = "Add new feature\nThis is the description\nWith multiple lines";
        let (title, body) = parse_pr_response(response);

        assert_eq!(title, "Add new feature");
        assert!(body.contains("This is the description"));
    }

    #[test]
    fn test_parse_pr_response_title_only() {
        let response = "TITLE: Simple change";
        let (title, body) = parse_pr_response(response);

        assert_eq!(title, "Simple change");
        assert!(body.is_empty());
    }

    #[test]
    fn test_parse_pr_response_empty_input() {
        let response = "";
        let (title, body) = parse_pr_response(response);

        assert_eq!(title, "Pull Request");
        assert!(body.is_empty());
    }

    #[test]
    fn test_parse_pr_response_trims_whitespace() {
        let response = "  TITLE:   Add feature  \n  BODY:  \n  Some description  ";
        let (title, body) = parse_pr_response(response);

        assert_eq!(title, "Add feature");
        assert_eq!(body, "Some description");
    }
}
