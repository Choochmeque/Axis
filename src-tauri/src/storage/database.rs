use crate::error::{AxisError, Result};
use crate::models::AppSettings;
use chrono::Utc;
use std::path::{Path, PathBuf};
use tokio::sync::Mutex;
use turso::{Builder, Connection};

/// Raw database row for a recent repository (before enrichment)
#[derive(Debug, Clone)]
pub struct RecentRepositoryRow {
    pub path: PathBuf,
    pub name: String,
    pub last_opened: chrono::DateTime<Utc>,
    pub is_pinned: bool,
}

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub async fn new(app_data_dir: &Path) -> Result<Self> {
        std::fs::create_dir_all(app_data_dir)?;
        let db_path = app_data_dir.join("axis.db");
        let conn = Builder::new_local(&db_path.to_string_lossy())
            .build()
            .await?
            .connect()?;

        let database = Self {
            conn: Mutex::new(conn),
        };
        database.init_schema().await?;

        Ok(database)
    }

    async fn init_schema(&self) -> Result<()> {
        let conn = self.conn.lock().await;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS recent_repositories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                last_opened TEXT NOT NULL
            )",
            (),
        )
        .await?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )",
            (),
        )
        .await?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS secrets (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )",
            (),
        )
        .await?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS remote_ssh_keys (
                repo_path TEXT NOT NULL,
                remote_name TEXT NOT NULL,
                ssh_key_path TEXT NOT NULL,
                PRIMARY KEY (repo_path, remote_name)
            )",
            (),
        )
        .await?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS pinned_repositories (
                path TEXT PRIMARY KEY
            )",
            (),
        )
        .await?;

        // Clean up duplicate paths (with/without trailing slash)
        // Keep the one with the most recent last_opened
        conn.execute(
            "DELETE FROM recent_repositories
             WHERE id NOT IN (
                SELECT MIN(id) FROM recent_repositories
                GROUP BY TRIM(path, '/')
             )",
            (),
        )
        .await?;

        // Normalize existing paths (remove trailing slashes)
        conn.execute(
            "UPDATE recent_repositories SET path = RTRIM(path, '/') WHERE path LIKE '%/'",
            (),
        )
        .await?;

        drop(conn);

        Ok(())
    }

    pub async fn get_settings(&self) -> Result<AppSettings> {
        let mut rows = self
            .conn
            .lock()
            .await
            .query("SELECT value FROM settings WHERE key = 'app_settings'", ())
            .await?;

        match rows.next().await? {
            Some(row) => {
                let json: String = row.get(0)?;
                let settings: AppSettings = serde_json::from_str(&json).unwrap_or_default();
                Ok(settings)
            }
            None => Ok(AppSettings::default()),
        }
    }

    pub async fn save_settings(&self, settings: &AppSettings) -> Result<()> {
        let json = serde_json::to_string(settings)?;

        self.conn
            .lock()
            .await
            .execute(
                "INSERT INTO settings (key, value) VALUES ('app_settings', ?1)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                [json],
            )
            .await?;

        Ok(())
    }

    pub async fn add_recent_repository(&self, path: &Path, name: &str) -> Result<()> {
        let now = Utc::now().to_rfc3339();
        // Normalize path: remove trailing slash to avoid duplicates
        let path_str = path.to_string_lossy().trim_end_matches('/').to_string();

        self.conn
            .lock()
            .await
            .execute(
                "INSERT INTO recent_repositories (path, name, last_opened)
             VALUES (?1, ?2, ?3)
             ON CONFLICT(path) DO UPDATE SET
                name = excluded.name,
                last_opened = excluded.last_opened",
                [path_str, name.to_string(), now],
            )
            .await?;

        Ok(())
    }

    pub async fn get_recent_repositories(&self) -> Result<Vec<RecentRepositoryRow>> {
        let mut rows = self
            .conn
            .lock()
            .await
            .query(
                "SELECT r.path, r.name, r.last_opened, (p.path IS NOT NULL) AS is_pinned
             FROM recent_repositories r
             LEFT JOIN pinned_repositories p ON r.path = p.path
             ORDER BY last_opened DESC",
                (),
            )
            .await?;

        let mut repos = Vec::new();
        while let Some(row) = rows.next().await? {
            let path: String = row.get(0)?;
            let name: String = row.get(1)?;
            let last_opened: String = row.get(2)?;
            let is_pinned: i64 = row.get(3)?;

            repos.push(RecentRepositoryRow {
                path: PathBuf::from(path),
                name,
                last_opened: chrono::DateTime::parse_from_rfc3339(&last_opened)
                    .map_or_else(|_| Utc::now(), |dt| dt.with_timezone(&Utc)),
                is_pinned: is_pinned != 0,
            });
        }

        Ok(repos)
    }

    pub async fn remove_recent_repository(&self, path: &Path) -> Result<()> {
        // Normalize path: remove trailing slash
        let path_str = path.to_string_lossy().trim_end_matches('/').to_string();
        self.conn
            .lock()
            .await
            .execute(
                "DELETE FROM recent_repositories WHERE path = ?1",
                [path_str],
            )
            .await?;
        Ok(())
    }

    pub async fn pin_repository(&self, path: &Path) -> Result<()> {
        let path_str = path.to_string_lossy().trim_end_matches('/').to_string();
        self.conn
            .lock()
            .await
            .execute(
                "INSERT OR IGNORE INTO pinned_repositories (path) VALUES (?1)",
                [path_str],
            )
            .await?;
        Ok(())
    }

    pub async fn unpin_repository(&self, path: &Path) -> Result<()> {
        let path_str = path.to_string_lossy().trim_end_matches('/').to_string();
        self.conn
            .lock()
            .await
            .execute(
                "DELETE FROM pinned_repositories WHERE path = ?1",
                [path_str],
            )
            .await?;
        Ok(())
    }

    pub async fn set_secret(&self, key: &str, value: &str) -> Result<()> {
        use base64::{engine::general_purpose::STANDARD, Engine};

        let encoded = STANDARD.encode(value);
        self.conn
            .lock()
            .await
            .execute(
                "INSERT INTO secrets (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                [key.to_string(), encoded],
            )
            .await?;

        Ok(())
    }

    pub async fn get_secret(&self, key: &str) -> Result<Option<String>> {
        use base64::{engine::general_purpose::STANDARD, Engine};

        let mut rows = self
            .conn
            .lock()
            .await
            .query("SELECT value FROM secrets WHERE key = ?1", [key])
            .await?;

        match rows.next().await? {
            Some(row) => {
                let encoded: String = row.get(0)?;
                let decoded = STANDARD
                    .decode(&encoded)
                    .map_err(|e| AxisError::Other(format!("Failed to decode secret: {e}")))?;
                let value = String::from_utf8(decoded)
                    .map_err(|e| AxisError::Other(format!("Invalid UTF-8 in secret: {e}")))?;
                Ok(Some(value))
            }
            None => Ok(None),
        }
    }

    pub async fn has_secret(&self, key: &str) -> Result<bool> {
        let mut rows = self
            .conn
            .lock()
            .await
            .query("SELECT 1 FROM secrets WHERE key = ?1", [key])
            .await?;

        Ok(rows.next().await?.is_some())
    }

    pub async fn delete_secret(&self, key: &str) -> Result<()> {
        self.conn
            .lock()
            .await
            .execute("DELETE FROM secrets WHERE key = ?1", [key])
            .await?;

        Ok(())
    }

    pub async fn get_remote_ssh_key(
        &self,
        repo_path: &str,
        remote_name: &str,
    ) -> Result<Option<String>> {
        let mut rows = self.conn.lock().await
            .query(
                "SELECT ssh_key_path FROM remote_ssh_keys WHERE repo_path = ?1 AND remote_name = ?2",
                [repo_path, remote_name],
            )
            .await?;

        match rows.next().await? {
            Some(row) => {
                let path: String = row.get(0)?;
                Ok(Some(path))
            }
            None => Ok(None),
        }
    }

    pub async fn set_remote_ssh_key(
        &self,
        repo_path: &str,
        remote_name: &str,
        ssh_key_path: &str,
    ) -> Result<()> {
        self.conn.lock().await.execute(
            "INSERT INTO remote_ssh_keys (repo_path, remote_name, ssh_key_path)
             VALUES (?1, ?2, ?3)
             ON CONFLICT(repo_path, remote_name) DO UPDATE SET ssh_key_path = excluded.ssh_key_path",
            [repo_path, remote_name, ssh_key_path],
        )
        .await?;

        Ok(())
    }

    pub async fn delete_remote_ssh_key(&self, repo_path: &str, remote_name: &str) -> Result<()> {
        self.conn
            .lock()
            .await
            .execute(
                "DELETE FROM remote_ssh_keys WHERE repo_path = ?1 AND remote_name = ?2",
                [repo_path, remote_name],
            )
            .await?;

        Ok(())
    }

    pub async fn list_remote_ssh_keys(&self, repo_path: &str) -> Result<Vec<(String, String)>> {
        let mut rows = self
            .conn
            .lock()
            .await
            .query(
                "SELECT remote_name, ssh_key_path FROM remote_ssh_keys WHERE repo_path = ?1",
                [repo_path],
            )
            .await?;

        let mut mappings = Vec::new();
        while let Some(row) = rows.next().await? {
            let remote_name: String = row.get(0)?;
            let ssh_key_path: String = row.get(1)?;
            mappings.push((remote_name, ssh_key_path));
        }

        Ok(mappings)
    }

    /// Create an in-memory database for testing
    #[cfg(test)]
    pub async fn open_in_memory() -> Result<Self> {
        let conn = Builder::new_local(":memory:").build().await?.connect()?;
        let database = Self {
            conn: Mutex::new(conn),
        };
        database.init_schema().await?;
        Ok(database)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_add_and_get_recent_repositories() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path())
            .await
            .expect("should create database");

        let repo_path = PathBuf::from("/test/repo");
        db.add_recent_repository(&repo_path, "test-repo")
            .await
            .expect("should add recent repository");

        let repos = db
            .get_recent_repositories()
            .await
            .expect("should get recent repositories");
        assert_eq!(repos.len(), 1);
        assert_eq!(repos[0].name, "test-repo");
        assert_eq!(repos[0].path, repo_path);
        assert!(!repos[0].is_pinned);
    }

    #[tokio::test]
    async fn test_update_recent_repository() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path())
            .await
            .expect("should create database");

        let repo_path = PathBuf::from("/test/repo");
        db.add_recent_repository(&repo_path, "old-name")
            .await
            .expect("should add with old name");
        db.add_recent_repository(&repo_path, "new-name")
            .await
            .expect("should update with new name");

        let repos = db
            .get_recent_repositories()
            .await
            .expect("should get recent repositories");
        assert_eq!(repos.len(), 1);
        assert_eq!(repos[0].name, "new-name");
    }

    #[tokio::test]
    async fn test_remove_recent_repository() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path())
            .await
            .expect("should create database");

        let repo_path = PathBuf::from("/test/repo");
        db.add_recent_repository(&repo_path, "test-repo")
            .await
            .expect("should add recent repository");
        db.remove_recent_repository(&repo_path)
            .await
            .expect("should remove recent repository");

        let repos = db
            .get_recent_repositories()
            .await
            .expect("should get recent repositories");
        assert!(repos.is_empty());
    }

    #[tokio::test]
    async fn test_no_repo_limit() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path())
            .await
            .expect("should create database");

        for i in 0..30 {
            let path = PathBuf::from(format!("/test/repo{i}"));
            db.add_recent_repository(&path, &format!("repo-{i}"))
                .await
                .expect("should add recent repository");
        }

        let repos = db
            .get_recent_repositories()
            .await
            .expect("should get recent repositories");
        assert_eq!(repos.len(), 30);
    }

    // ==================== Pin Repository Tests ====================

    #[tokio::test]
    async fn test_pin_repository() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path())
            .await
            .expect("should create database");

        let repo_path = PathBuf::from("/test/repo");
        db.add_recent_repository(&repo_path, "test-repo")
            .await
            .expect("should add recent repository");
        db.pin_repository(&repo_path)
            .await
            .expect("should pin repository");

        let repos = db
            .get_recent_repositories()
            .await
            .expect("should get recent repositories");
        assert_eq!(repos.len(), 1);
        assert!(repos[0].is_pinned);
    }

    #[tokio::test]
    async fn test_unpin_repository() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path())
            .await
            .expect("should create database");

        let repo_path = PathBuf::from("/test/repo");
        db.add_recent_repository(&repo_path, "test-repo")
            .await
            .expect("should add recent repository");
        db.pin_repository(&repo_path)
            .await
            .expect("should pin repository");
        db.unpin_repository(&repo_path)
            .await
            .expect("should unpin repository");

        let repos = db
            .get_recent_repositories()
            .await
            .expect("should get recent repositories");
        assert_eq!(repos.len(), 1);
        assert!(!repos[0].is_pinned);
    }

    #[tokio::test]
    async fn test_pin_idempotent() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path())
            .await
            .expect("should create database");

        let repo_path = PathBuf::from("/test/repo");
        db.add_recent_repository(&repo_path, "test-repo")
            .await
            .expect("should add recent repository");
        db.pin_repository(&repo_path)
            .await
            .expect("should pin first time");
        db.pin_repository(&repo_path)
            .await
            .expect("should pin second time without error");

        let repos = db
            .get_recent_repositories()
            .await
            .expect("should get recent repositories");
        assert!(repos[0].is_pinned);
    }

    #[tokio::test]
    async fn test_unpin_nonexistent() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path())
            .await
            .expect("should create database");

        let repo_path = PathBuf::from("/test/repo");
        db.unpin_repository(&repo_path)
            .await
            .expect("should not error when unpinning nonexistent");
    }

    #[tokio::test]
    async fn test_pin_multiple_repos() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path())
            .await
            .expect("should create database");

        let path1 = PathBuf::from("/test/repo1");
        let path2 = PathBuf::from("/test/repo2");
        let path3 = PathBuf::from("/test/repo3");
        db.add_recent_repository(&path1, "repo1")
            .await
            .expect("should add");
        db.add_recent_repository(&path2, "repo2")
            .await
            .expect("should add");
        db.add_recent_repository(&path3, "repo3")
            .await
            .expect("should add");

        db.pin_repository(&path1).await.expect("should pin");
        db.pin_repository(&path3).await.expect("should pin");

        let repos = db
            .get_recent_repositories()
            .await
            .expect("should get recent repositories");
        assert_eq!(repos.len(), 3);

        let pinned: Vec<_> = repos.iter().filter(|r| r.is_pinned).collect();
        assert_eq!(pinned.len(), 2);

        let pinned_names: Vec<&str> = pinned.iter().map(|r| r.name.as_str()).collect();
        assert!(pinned_names.contains(&"repo1"));
        assert!(pinned_names.contains(&"repo3"));
    }

    #[tokio::test]
    async fn test_remove_recent_also_cleans_pin() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path())
            .await
            .expect("should create database");

        let repo_path = PathBuf::from("/test/repo");
        db.add_recent_repository(&repo_path, "test-repo")
            .await
            .expect("should add");
        db.pin_repository(&repo_path).await.expect("should pin");
        db.remove_recent_repository(&repo_path)
            .await
            .expect("should remove");

        let repos = db
            .get_recent_repositories()
            .await
            .expect("should get recent repositories");
        assert!(repos.is_empty());
    }

    #[tokio::test]
    async fn test_get_default_settings() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path())
            .await
            .expect("should create database");

        let settings = db.get_settings().await.expect("should get settings");
        assert_eq!(settings.font_size, 13);
        assert!(settings.confirm_before_discard);
    }

    #[tokio::test]
    async fn test_save_and_get_settings() {
        use crate::models::Theme;

        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path())
            .await
            .expect("should create database");

        let settings = AppSettings {
            theme: Theme::Dark,
            font_size: 16,
            ..Default::default()
        };

        db.save_settings(&settings)
            .await
            .expect("should save settings");

        let loaded = db.get_settings().await.expect("should load settings");
        assert_eq!(loaded.theme, Theme::Dark);
        assert_eq!(loaded.font_size, 16);
    }

    // ==================== Remote SSH Key Tests ====================

    #[tokio::test]
    async fn test_get_remote_ssh_key_none() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path())
            .await
            .expect("should create database");

        let key = db
            .get_remote_ssh_key("/repo", "origin")
            .await
            .expect("should query");
        assert!(key.is_none());
    }

    #[tokio::test]
    async fn test_set_and_get_remote_ssh_key() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path())
            .await
            .expect("should create database");

        db.set_remote_ssh_key("/repo", "origin", "~/.ssh/id_ed25519")
            .await
            .expect("should set");

        let key = db
            .get_remote_ssh_key("/repo", "origin")
            .await
            .expect("should get");
        assert_eq!(key, Some("~/.ssh/id_ed25519".to_string()));
    }

    #[tokio::test]
    async fn test_set_remote_ssh_key_upsert() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path())
            .await
            .expect("should create database");

        db.set_remote_ssh_key("/repo", "origin", "~/.ssh/old_key")
            .await
            .expect("should set");
        db.set_remote_ssh_key("/repo", "origin", "~/.ssh/new_key")
            .await
            .expect("should upsert");

        let key = db
            .get_remote_ssh_key("/repo", "origin")
            .await
            .expect("should get");
        assert_eq!(key, Some("~/.ssh/new_key".to_string()));
    }

    #[tokio::test]
    async fn test_delete_remote_ssh_key() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path())
            .await
            .expect("should create database");

        db.set_remote_ssh_key("/repo", "origin", "~/.ssh/key")
            .await
            .expect("should set");
        db.delete_remote_ssh_key("/repo", "origin")
            .await
            .expect("should delete");

        let key = db
            .get_remote_ssh_key("/repo", "origin")
            .await
            .expect("should get");
        assert!(key.is_none());
    }

    #[tokio::test]
    async fn test_delete_remote_ssh_key_nonexistent() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path())
            .await
            .expect("should create database");

        // Should not error when deleting nonexistent key
        db.delete_remote_ssh_key("/repo", "origin")
            .await
            .expect("should not error");
    }

    #[tokio::test]
    async fn test_list_remote_ssh_keys_empty() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path())
            .await
            .expect("should create database");

        let keys = db.list_remote_ssh_keys("/repo").await.expect("should list");
        assert!(keys.is_empty());
    }

    #[tokio::test]
    async fn test_list_remote_ssh_keys_multiple() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path())
            .await
            .expect("should create database");

        db.set_remote_ssh_key("/repo", "origin", "~/.ssh/key1")
            .await
            .expect("should set");
        db.set_remote_ssh_key("/repo", "upstream", "~/.ssh/key2")
            .await
            .expect("should set");

        let keys = db.list_remote_ssh_keys("/repo").await.expect("should list");
        assert_eq!(keys.len(), 2);

        let names: Vec<&str> = keys.iter().map(|(n, _)| n.as_str()).collect();
        assert!(names.contains(&"origin"));
        assert!(names.contains(&"upstream"));
    }

    #[tokio::test]
    async fn test_list_remote_ssh_keys_different_repos() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path())
            .await
            .expect("should create database");

        db.set_remote_ssh_key("/repo1", "origin", "~/.ssh/key1")
            .await
            .expect("should set");
        db.set_remote_ssh_key("/repo2", "origin", "~/.ssh/key2")
            .await
            .expect("should set");

        let keys1 = db
            .list_remote_ssh_keys("/repo1")
            .await
            .expect("should list");
        assert_eq!(keys1.len(), 1);
        assert_eq!(keys1[0].1, "~/.ssh/key1");

        let keys2 = db
            .list_remote_ssh_keys("/repo2")
            .await
            .expect("should list");
        assert_eq!(keys2.len(), 1);
        assert_eq!(keys2[0].1, "~/.ssh/key2");
    }

    #[tokio::test]
    async fn test_remote_ssh_keys_in_memory() {
        let db = Database::open_in_memory()
            .await
            .expect("should create in-memory database");

        db.set_remote_ssh_key("/repo", "origin", "~/.ssh/key")
            .await
            .expect("should set");

        let key = db
            .get_remote_ssh_key("/repo", "origin")
            .await
            .expect("should get");
        assert_eq!(key, Some("~/.ssh/key".to_string()));
    }
}
