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
2. A PR body in GitHub-flavored markdown with:
   - A summary section (## Summary) explaining what the PR does (1-3 sentences)
   - A changes section (## Changes) with a bullet list of key changes
   - Use proper markdown: headings, bold, code spans, lists
3. If available labels are provided, suggest the most relevant ones (0-3 labels)

Format your response EXACTLY as:
TITLE: <your title here>
BODY:
<your markdown body here>
LABELS: <comma-separated label names, or empty if none>

Be specific but concise. Focus on the user-facing impact of changes.
Return ONLY the formatted response, nothing else."#;

pub fn build_pr_prompt(
    commits: &[(String, String)],
    diff_summary: Option<&str>,
    available_labels: Option<&[String]>,
) -> (String, String) {
    let mut user_prompt =
        String::from("Generate a PR title and description for these commits:\n\n");

    for (short_oid, summary) in commits {
        user_prompt.push_str(&format!("- {short_oid}: {summary}\n"));
    }

    if let Some(summary) = diff_summary {
        user_prompt.push_str(&format!("\nChanged files:\n{summary}\n"));
    }

    if let Some(labels) = available_labels {
        if !labels.is_empty() {
            user_prompt.push_str(&format!("\nAvailable labels: {}\n", labels.join(", ")));
        }
    }

    (PR_SYSTEM_PROMPT.to_string(), user_prompt)
}

pub fn parse_pr_response(response: &str) -> (String, String, Vec<String>) {
    let response = response.trim();

    // Try to parse TITLE: ... BODY: ... LABELS: ... format
    if let Some(title_start) = response.find("TITLE:") {
        let after_title = &response[title_start + 6..];
        if let Some(body_marker) = after_title.find("BODY:") {
            let title = after_title[..body_marker].trim().to_string();
            let after_body = &after_title[body_marker + 5..];

            // Check for LABELS: section
            if let Some(labels_marker) = after_body.find("LABELS:") {
                let body = after_body[..labels_marker].trim().to_string();
                let labels_str = after_body[labels_marker + 7..].trim();
                let labels = parse_labels(labels_str);
                return (title, body, labels);
            }

            let body = after_body.trim().to_string();
            return (title, body, vec![]);
        }
        // TITLE found but no BODY marker - title is first line, rest is body
        let title = after_title.lines().next().unwrap_or("").trim().to_string();
        let rest = after_title.lines().skip(1).collect::<Vec<_>>().join("\n");

        // Check for LABELS: in the rest
        if let Some(labels_marker) = rest.find("LABELS:") {
            let body = rest[..labels_marker].trim().to_string();
            let labels_str = rest[labels_marker + 7..].trim();
            let labels = parse_labels(labels_str);
            return (title, body, labels);
        }

        let body = rest.trim().to_string();
        return (title, body, vec![]);
    }

    // Fallback: first line is title, rest is body
    let mut lines = response.lines();
    let title = lines.next().unwrap_or("Pull Request").trim().to_string();
    let rest = lines.collect::<Vec<_>>().join("\n");

    if let Some(labels_marker) = rest.find("LABELS:") {
        let body = rest[..labels_marker].trim().to_string();
        let labels_str = rest[labels_marker + 7..].trim();
        let labels = parse_labels(labels_str);
        return (title, body, labels);
    }

    let body = rest.trim().to_string();
    (title, body, vec![])
}

fn parse_labels(labels_str: &str) -> Vec<String> {
    labels_str
        .split(',')
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty())
        .collect()
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
        let (system, user) = build_pr_prompt(&commits, None, None);

        assert!(system.contains("pull request"));
        assert!(system.contains("TITLE:"));
        assert!(system.contains("BODY:"));
        assert!(system.contains("LABELS:"));
        assert!(user.contains("abc123: Add login page"));
        assert!(user.contains("def456: Fix validation"));
    }

    #[test]
    fn test_build_pr_prompt_with_diff_summary() {
        let commits = vec![("abc123".to_string(), "Update auth".to_string())];
        let summary = "- Modified: src/auth.rs\n- Added: src/login.rs";
        let (_, user) = build_pr_prompt(&commits, Some(summary), None);

        assert!(user.contains("Changed files:"));
        assert!(user.contains("src/auth.rs"));
        assert!(user.contains("src/login.rs"));
    }

    #[test]
    fn test_build_pr_prompt_empty_commits() {
        let commits: Vec<(String, String)> = vec![];
        let (system, user) = build_pr_prompt(&commits, None, None);

        assert!(!system.is_empty());
        assert!(user.contains("Generate a PR title"));
    }

    #[test]
    fn test_build_pr_prompt_no_diff_summary() {
        let commits = vec![("abc".to_string(), "Test".to_string())];
        let (_, user) = build_pr_prompt(&commits, None, None);

        assert!(!user.contains("Changed files:"));
    }

    #[test]
    fn test_build_pr_prompt_with_available_labels() {
        let commits = vec![("abc".to_string(), "Fix bug".to_string())];
        let labels = vec![
            "bug".to_string(),
            "enhancement".to_string(),
            "docs".to_string(),
        ];
        let (_, user) = build_pr_prompt(&commits, None, Some(&labels));

        assert!(user.contains("Available labels: bug, enhancement, docs"));
    }

    #[test]
    fn test_build_pr_prompt_with_empty_labels() {
        let commits = vec![("abc".to_string(), "Test".to_string())];
        let labels: Vec<String> = vec![];
        let (_, user) = build_pr_prompt(&commits, None, Some(&labels));

        assert!(!user.contains("Available labels:"));
    }

    #[test]
    fn test_build_pr_prompt_without_labels() {
        let commits = vec![("abc".to_string(), "Test".to_string())];
        let (_, user) = build_pr_prompt(&commits, None, None);

        assert!(!user.contains("Available labels:"));
    }

    #[test]
    fn test_build_pr_prompt_system_prompt_mentions_markdown() {
        let commits = vec![("abc".to_string(), "Test".to_string())];
        let (system, _) = build_pr_prompt(&commits, None, None);

        assert!(system.contains("GitHub-flavored markdown"));
    }

    // ==================== parse_pr_response Tests ====================

    #[test]
    fn test_parse_pr_response_standard_format() {
        let response = "TITLE: Add user authentication\nBODY:\n## Summary\nAdds OAuth2 login flow";
        let (title, body, labels) = parse_pr_response(response);

        assert_eq!(title, "Add user authentication");
        assert!(body.contains("Summary"));
        assert!(body.contains("OAuth2"));
        assert!(labels.is_empty());
    }

    #[test]
    fn test_parse_pr_response_with_labels() {
        let response = "TITLE: Fix login bug\nBODY:\n## Summary\nFixes the login bug\nLABELS: bug, priority:high";
        let (title, body, labels) = parse_pr_response(response);

        assert_eq!(title, "Fix login bug");
        assert!(body.contains("Summary"));
        assert_eq!(labels, vec!["bug", "priority:high"]);
    }

    #[test]
    fn test_parse_pr_response_with_empty_labels() {
        let response = "TITLE: Simple fix\nBODY:\nSome changes\nLABELS:";
        let (title, body, labels) = parse_pr_response(response);

        assert_eq!(title, "Simple fix");
        assert!(body.contains("Some changes"));
        assert!(labels.is_empty());
    }

    #[test]
    fn test_parse_pr_response_multiline_body() {
        let response = "TITLE: Fix bug\nBODY:\n- Fixed null check\n- Added tests\n- Updated docs";
        let (title, body, labels) = parse_pr_response(response);

        assert_eq!(title, "Fix bug");
        assert!(body.contains("Fixed null check"));
        assert!(body.contains("Added tests"));
        assert!(body.contains("Updated docs"));
        assert!(labels.is_empty());
    }

    #[test]
    fn test_parse_pr_response_fallback_no_markers() {
        let response = "Add new feature\nThis is the description\nWith multiple lines";
        let (title, body, labels) = parse_pr_response(response);

        assert_eq!(title, "Add new feature");
        assert!(body.contains("This is the description"));
        assert!(labels.is_empty());
    }

    #[test]
    fn test_parse_pr_response_title_only() {
        let response = "TITLE: Simple change";
        let (title, body, labels) = parse_pr_response(response);

        assert_eq!(title, "Simple change");
        assert!(body.is_empty());
        assert!(labels.is_empty());
    }

    #[test]
    fn test_parse_pr_response_empty_input() {
        let response = "";
        let (title, body, labels) = parse_pr_response(response);

        assert_eq!(title, "Pull Request");
        assert!(body.is_empty());
        assert!(labels.is_empty());
    }

    #[test]
    fn test_parse_pr_response_trims_whitespace() {
        let response = "  TITLE:   Add feature  \n  BODY:  \n  Some description  ";
        let (title, body, labels) = parse_pr_response(response);

        assert_eq!(title, "Add feature");
        assert_eq!(body, "Some description");
        assert!(labels.is_empty());
    }

    #[test]
    fn test_parse_pr_response_labels_with_whitespace() {
        let response = "TITLE: Test\nBODY:\nBody\nLABELS:  bug ,  enhancement , docs  ";
        let (_, _, labels) = parse_pr_response(response);

        assert_eq!(labels, vec!["bug", "enhancement", "docs"]);
    }

    #[test]
    fn test_parse_pr_response_fallback_with_labels() {
        let response = "Add feature\nSome description\nLABELS: enhancement";
        let (title, body, labels) = parse_pr_response(response);

        assert_eq!(title, "Add feature");
        assert!(body.contains("Some description"));
        assert_eq!(labels, vec!["enhancement"]);
    }

    // ==================== parse_labels Tests ====================

    #[test]
    fn test_parse_labels_empty() {
        assert!(parse_labels("").is_empty());
    }

    #[test]
    fn test_parse_labels_single() {
        assert_eq!(parse_labels("bug"), vec!["bug"]);
    }

    #[test]
    fn test_parse_labels_multiple() {
        assert_eq!(
            parse_labels("bug, enhancement, docs"),
            vec!["bug", "enhancement", "docs"]
        );
    }

    #[test]
    fn test_parse_labels_whitespace() {
        assert_eq!(parse_labels("  bug  ,  fix  "), vec!["bug", "fix"]);
    }
}
