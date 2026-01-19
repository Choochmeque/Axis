const SYSTEM_PROMPT: &str = r#"You are a helpful assistant that generates concise git commit messages.

Given the following diff of staged changes, generate a commit message following these guidelines:
1. Start with a verb in imperative mood (Add, Fix, Update, Remove, Refactor, etc.)
2. Keep the subject line under 72 characters
3. Focus on WHAT changed and WHY, not HOW
4. Be specific but concise

Format: <type>: <subject>

Types: feat, fix, docs, style, refactor, test, chore

Return ONLY the commit message, nothing else."#;

pub fn build_prompt(diff: &str) -> (String, String) {
    let user_prompt = format!(
        "Generate a commit message for the following changes:\n\n```diff\n{}\n```",
        diff
    );
    (SYSTEM_PROMPT.to_string(), user_prompt)
}
