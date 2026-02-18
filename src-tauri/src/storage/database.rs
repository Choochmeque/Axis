use crate::error::{AxisError, Result};
use crate::models::AppSettings;
use chrono::Utc;
use parking_lot::Mutex;
use rusqlite::{params, Connection};
use std::path::{Path, PathBuf};

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
    pub fn new(app_data_dir: &Path) -> Result<Self> {
        std::fs::create_dir_all(app_data_dir)?;
        let db_path = app_data_dir.join("axis.db");
        let conn = Connection::open(db_path)?;

        let db = Database {
            conn: Mutex::new(conn),
        };
        db.init_schema()?;

        Ok(db)
    }

    fn init_schema(&self) -> Result<()> {
        let conn = self.conn.lock();
        conn.execute(
            "CREATE TABLE IF NOT EXISTS recent_repositories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                last_opened TEXT NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS secrets (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS remote_ssh_keys (
                repo_path TEXT NOT NULL,
                remote_name TEXT NOT NULL,
                ssh_key_path TEXT NOT NULL,
                PRIMARY KEY (repo_path, remote_name)
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS pinned_repositories (
                path TEXT PRIMARY KEY
            )",
            [],
        )?;

        // Clean up duplicate paths (with/without trailing slash)
        // Keep the one with the most recent last_opened
        conn.execute(
            "DELETE FROM recent_repositories
             WHERE id NOT IN (
                SELECT MIN(id) FROM recent_repositories
                GROUP BY TRIM(path, '/')
             )",
            [],
        )?;

        // Normalize existing paths (remove trailing slashes)
        conn.execute(
            "UPDATE recent_repositories SET path = RTRIM(path, '/') WHERE path LIKE '%/'",
            [],
        )?;

        Ok(())
    }

    pub fn get_settings(&self) -> Result<AppSettings> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = 'app_settings'")?;

        let result: std::result::Result<String, _> = stmt.query_row([], |row| row.get(0));

        match result {
            Ok(json) => {
                let settings: AppSettings = serde_json::from_str(&json).unwrap_or_default();
                Ok(settings)
            }
            Err(_) => Ok(AppSettings::default()),
        }
    }

    pub fn save_settings(&self, settings: &AppSettings) -> Result<()> {
        let conn = self.conn.lock();
        let json = serde_json::to_string(settings)?;

        conn.execute(
            "INSERT INTO settings (key, value) VALUES ('app_settings', ?1)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![json],
        )?;

        Ok(())
    }

    pub fn add_recent_repository(&self, path: &Path, name: &str) -> Result<()> {
        let conn = self.conn.lock();
        let now = Utc::now().to_rfc3339();
        // Normalize path: remove trailing slash to avoid duplicates
        let path_str = path.to_string_lossy().trim_end_matches('/').to_string();

        conn.execute(
            "INSERT INTO recent_repositories (path, name, last_opened)
             VALUES (?1, ?2, ?3)
             ON CONFLICT(path) DO UPDATE SET
                name = excluded.name,
                last_opened = excluded.last_opened",
            params![path_str, name, now],
        )?;

        Ok(())
    }

    pub fn get_recent_repositories(&self) -> Result<Vec<RecentRepositoryRow>> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(
            "SELECT r.path, r.name, r.last_opened, (p.path IS NOT NULL) AS is_pinned
             FROM recent_repositories r
             LEFT JOIN pinned_repositories p ON r.path = p.path
             ORDER BY last_opened DESC",
        )?;

        let repos = stmt
            .query_map([], |row| {
                let path: String = row.get(0)?;
                let name: String = row.get(1)?;
                let last_opened: String = row.get(2)?;
                let is_pinned: bool = row.get(3)?;

                Ok(RecentRepositoryRow {
                    path: PathBuf::from(path),
                    name,
                    last_opened: chrono::DateTime::parse_from_rfc3339(&last_opened)
                        .map_or_else(|_| Utc::now(), |dt| dt.with_timezone(&Utc)),
                    is_pinned,
                })
            })?
            .filter_map(std::result::Result::ok)
            .collect();

        Ok(repos)
    }

    pub fn remove_recent_repository(&self, path: &Path) -> Result<()> {
        let conn = self.conn.lock();
        // Normalize path: remove trailing slash
        let path_str = path.to_string_lossy().trim_end_matches('/').to_string();
        conn.execute(
            "DELETE FROM recent_repositories WHERE path = ?1",
            params![path_str],
        )?;
        Ok(())
    }

    pub fn pin_repository(&self, path: &Path) -> Result<()> {
        let conn = self.conn.lock();
        let path_str = path.to_string_lossy().trim_end_matches('/').to_string();
        conn.execute(
            "INSERT OR IGNORE INTO pinned_repositories (path) VALUES (?1)",
            params![path_str],
        )?;
        Ok(())
    }

    pub fn unpin_repository(&self, path: &Path) -> Result<()> {
        let conn = self.conn.lock();
        let path_str = path.to_string_lossy().trim_end_matches('/').to_string();
        conn.execute(
            "DELETE FROM pinned_repositories WHERE path = ?1",
            params![path_str],
        )?;
        Ok(())
    }

    pub fn set_secret(&self, key: &str, value: &str) -> Result<()> {
        use base64::{engine::general_purpose::STANDARD, Engine};

        let conn = self.conn.lock();

        let encoded = STANDARD.encode(value);
        conn.execute(
            "INSERT INTO secrets (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![key, encoded],
        )?;

        Ok(())
    }

    pub fn get_secret(&self, key: &str) -> Result<Option<String>> {
        use base64::{engine::general_purpose::STANDARD, Engine};

        let conn = self.conn.lock();

        let mut stmt = conn.prepare("SELECT value FROM secrets WHERE key = ?1")?;
        let result: std::result::Result<String, _> = stmt.query_row(params![key], |row| row.get(0));

        match result {
            Ok(encoded) => {
                let decoded = STANDARD
                    .decode(&encoded)
                    .map_err(|e| AxisError::Other(format!("Failed to decode secret: {e}")))?;
                let value = String::from_utf8(decoded)
                    .map_err(|e| AxisError::Other(format!("Invalid UTF-8 in secret: {e}")))?;
                Ok(Some(value))
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    pub fn has_secret(&self, key: &str) -> Result<bool> {
        let conn = self.conn.lock();

        let mut stmt = conn.prepare("SELECT 1 FROM secrets WHERE key = ?1")?;
        let exists = stmt.exists(params![key])?;

        Ok(exists)
    }

    pub fn delete_secret(&self, key: &str) -> Result<()> {
        let conn = self.conn.lock();

        conn.execute("DELETE FROM secrets WHERE key = ?1", params![key])?;

        Ok(())
    }

    pub fn get_remote_ssh_key(&self, repo_path: &str, remote_name: &str) -> Result<Option<String>> {
        let conn = self.conn.lock();

        let mut stmt = conn.prepare(
            "SELECT ssh_key_path FROM remote_ssh_keys WHERE repo_path = ?1 AND remote_name = ?2",
        )?;

        let result: std::result::Result<String, _> =
            stmt.query_row(params![repo_path, remote_name], |row| row.get(0));

        match result {
            Ok(path) => Ok(Some(path)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    pub fn set_remote_ssh_key(
        &self,
        repo_path: &str,
        remote_name: &str,
        ssh_key_path: &str,
    ) -> Result<()> {
        let conn = self.conn.lock();

        conn.execute(
            "INSERT INTO remote_ssh_keys (repo_path, remote_name, ssh_key_path)
             VALUES (?1, ?2, ?3)
             ON CONFLICT(repo_path, remote_name) DO UPDATE SET ssh_key_path = excluded.ssh_key_path",
            params![repo_path, remote_name, ssh_key_path],
        )?;

        Ok(())
    }

    pub fn delete_remote_ssh_key(&self, repo_path: &str, remote_name: &str) -> Result<()> {
        let conn = self.conn.lock();

        conn.execute(
            "DELETE FROM remote_ssh_keys WHERE repo_path = ?1 AND remote_name = ?2",
            params![repo_path, remote_name],
        )?;

        Ok(())
    }

    pub fn list_remote_ssh_keys(&self, repo_path: &str) -> Result<Vec<(String, String)>> {
        let conn = self.conn.lock();

        let mut stmt = conn.prepare(
            "SELECT remote_name, ssh_key_path FROM remote_ssh_keys WHERE repo_path = ?1",
        )?;

        let mappings = stmt
            .query_map(params![repo_path], |row| {
                let remote_name: String = row.get(0)?;
                let ssh_key_path: String = row.get(1)?;
                Ok((remote_name, ssh_key_path))
            })?
            .filter_map(std::result::Result::ok)
            .collect();

        Ok(mappings)
    }

    /// Create an in-memory database for testing
    #[cfg(test)]
    pub fn open_in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        let db = Database {
            conn: Mutex::new(conn),
        };
        db.init_schema()?;
        Ok(db)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_add_and_get_recent_repositories() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path()).expect("should create database");

        let repo_path = PathBuf::from("/test/repo");
        db.add_recent_repository(&repo_path, "test-repo")
            .expect("should add recent repository");

        let repos = db
            .get_recent_repositories()
            .expect("should get recent repositories");
        assert_eq!(repos.len(), 1);
        assert_eq!(repos[0].name, "test-repo");
        assert_eq!(repos[0].path, repo_path);
        assert!(!repos[0].is_pinned);
    }

    #[test]
    fn test_update_recent_repository() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path()).expect("should create database");

        let repo_path = PathBuf::from("/test/repo");
        db.add_recent_repository(&repo_path, "old-name")
            .expect("should add with old name");
        db.add_recent_repository(&repo_path, "new-name")
            .expect("should update with new name");

        let repos = db
            .get_recent_repositories()
            .expect("should get recent repositories");
        assert_eq!(repos.len(), 1);
        assert_eq!(repos[0].name, "new-name");
    }

    #[test]
    fn test_remove_recent_repository() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path()).expect("should create database");

        let repo_path = PathBuf::from("/test/repo");
        db.add_recent_repository(&repo_path, "test-repo")
            .expect("should add recent repository");
        db.remove_recent_repository(&repo_path)
            .expect("should remove recent repository");

        let repos = db
            .get_recent_repositories()
            .expect("should get recent repositories");
        assert!(repos.is_empty());
    }

    #[test]
    fn test_no_repo_limit() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path()).expect("should create database");

        for i in 0..30 {
            let path = PathBuf::from(format!("/test/repo{i}"));
            db.add_recent_repository(&path, &format!("repo-{i}"))
                .expect("should add recent repository");
        }

        let repos = db
            .get_recent_repositories()
            .expect("should get recent repositories");
        assert_eq!(repos.len(), 30);
    }

    // ==================== Pin Repository Tests ====================

    #[test]
    fn test_pin_repository() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path()).expect("should create database");

        let repo_path = PathBuf::from("/test/repo");
        db.add_recent_repository(&repo_path, "test-repo")
            .expect("should add recent repository");
        db.pin_repository(&repo_path)
            .expect("should pin repository");

        let repos = db
            .get_recent_repositories()
            .expect("should get recent repositories");
        assert_eq!(repos.len(), 1);
        assert!(repos[0].is_pinned);
    }

    #[test]
    fn test_unpin_repository() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path()).expect("should create database");

        let repo_path = PathBuf::from("/test/repo");
        db.add_recent_repository(&repo_path, "test-repo")
            .expect("should add recent repository");
        db.pin_repository(&repo_path)
            .expect("should pin repository");
        db.unpin_repository(&repo_path)
            .expect("should unpin repository");

        let repos = db
            .get_recent_repositories()
            .expect("should get recent repositories");
        assert_eq!(repos.len(), 1);
        assert!(!repos[0].is_pinned);
    }

    #[test]
    fn test_pin_idempotent() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path()).expect("should create database");

        let repo_path = PathBuf::from("/test/repo");
        db.add_recent_repository(&repo_path, "test-repo")
            .expect("should add recent repository");
        db.pin_repository(&repo_path)
            .expect("should pin first time");
        db.pin_repository(&repo_path)
            .expect("should pin second time without error");

        let repos = db
            .get_recent_repositories()
            .expect("should get recent repositories");
        assert!(repos[0].is_pinned);
    }

    #[test]
    fn test_unpin_nonexistent() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path()).expect("should create database");

        let repo_path = PathBuf::from("/test/repo");
        db.unpin_repository(&repo_path)
            .expect("should not error when unpinning nonexistent");
    }

    #[test]
    fn test_pin_multiple_repos() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path()).expect("should create database");

        let path1 = PathBuf::from("/test/repo1");
        let path2 = PathBuf::from("/test/repo2");
        let path3 = PathBuf::from("/test/repo3");
        db.add_recent_repository(&path1, "repo1")
            .expect("should add");
        db.add_recent_repository(&path2, "repo2")
            .expect("should add");
        db.add_recent_repository(&path3, "repo3")
            .expect("should add");

        db.pin_repository(&path1).expect("should pin");
        db.pin_repository(&path3).expect("should pin");

        let repos = db
            .get_recent_repositories()
            .expect("should get recent repositories");
        assert_eq!(repos.len(), 3);

        let pinned: Vec<_> = repos.iter().filter(|r| r.is_pinned).collect();
        assert_eq!(pinned.len(), 2);

        let pinned_names: Vec<&str> = pinned.iter().map(|r| r.name.as_str()).collect();
        assert!(pinned_names.contains(&"repo1"));
        assert!(pinned_names.contains(&"repo3"));
    }

    #[test]
    fn test_remove_recent_also_cleans_pin() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path()).expect("should create database");

        let repo_path = PathBuf::from("/test/repo");
        db.add_recent_repository(&repo_path, "test-repo")
            .expect("should add");
        db.pin_repository(&repo_path).expect("should pin");
        db.remove_recent_repository(&repo_path)
            .expect("should remove");

        let repos = db
            .get_recent_repositories()
            .expect("should get recent repositories");
        assert!(repos.is_empty());
    }

    #[test]
    fn test_get_default_settings() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path()).expect("should create database");

        let settings = db.get_settings().expect("should get settings");
        assert_eq!(settings.font_size, 13);
        assert!(settings.confirm_before_discard);
    }

    #[test]
    fn test_save_and_get_settings() {
        use crate::models::Theme;

        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path()).expect("should create database");

        let settings = AppSettings {
            theme: Theme::Dark,
            font_size: 16,
            ..Default::default()
        };

        db.save_settings(&settings).expect("should save settings");

        let loaded = db.get_settings().expect("should load settings");
        assert_eq!(loaded.theme, Theme::Dark);
        assert_eq!(loaded.font_size, 16);
    }

    // ==================== Remote SSH Key Tests ====================

    #[test]
    fn test_get_remote_ssh_key_none() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path()).expect("should create database");

        let key = db
            .get_remote_ssh_key("/repo", "origin")
            .expect("should query");
        assert!(key.is_none());
    }

    #[test]
    fn test_set_and_get_remote_ssh_key() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path()).expect("should create database");

        db.set_remote_ssh_key("/repo", "origin", "~/.ssh/id_ed25519")
            .expect("should set");

        let key = db
            .get_remote_ssh_key("/repo", "origin")
            .expect("should get");
        assert_eq!(key, Some("~/.ssh/id_ed25519".to_string()));
    }

    #[test]
    fn test_set_remote_ssh_key_upsert() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path()).expect("should create database");

        db.set_remote_ssh_key("/repo", "origin", "~/.ssh/old_key")
            .expect("should set");
        db.set_remote_ssh_key("/repo", "origin", "~/.ssh/new_key")
            .expect("should upsert");

        let key = db
            .get_remote_ssh_key("/repo", "origin")
            .expect("should get");
        assert_eq!(key, Some("~/.ssh/new_key".to_string()));
    }

    #[test]
    fn test_delete_remote_ssh_key() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path()).expect("should create database");

        db.set_remote_ssh_key("/repo", "origin", "~/.ssh/key")
            .expect("should set");
        db.delete_remote_ssh_key("/repo", "origin")
            .expect("should delete");

        let key = db
            .get_remote_ssh_key("/repo", "origin")
            .expect("should get");
        assert!(key.is_none());
    }

    #[test]
    fn test_delete_remote_ssh_key_nonexistent() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path()).expect("should create database");

        // Should not error when deleting nonexistent key
        db.delete_remote_ssh_key("/repo", "origin")
            .expect("should not error");
    }

    #[test]
    fn test_list_remote_ssh_keys_empty() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path()).expect("should create database");

        let keys = db.list_remote_ssh_keys("/repo").expect("should list");
        assert!(keys.is_empty());
    }

    #[test]
    fn test_list_remote_ssh_keys_multiple() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path()).expect("should create database");

        db.set_remote_ssh_key("/repo", "origin", "~/.ssh/key1")
            .expect("should set");
        db.set_remote_ssh_key("/repo", "upstream", "~/.ssh/key2")
            .expect("should set");

        let keys = db.list_remote_ssh_keys("/repo").expect("should list");
        assert_eq!(keys.len(), 2);

        let names: Vec<&str> = keys.iter().map(|(n, _)| n.as_str()).collect();
        assert!(names.contains(&"origin"));
        assert!(names.contains(&"upstream"));
    }

    #[test]
    fn test_list_remote_ssh_keys_different_repos() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path()).expect("should create database");

        db.set_remote_ssh_key("/repo1", "origin", "~/.ssh/key1")
            .expect("should set");
        db.set_remote_ssh_key("/repo2", "origin", "~/.ssh/key2")
            .expect("should set");

        let keys1 = db.list_remote_ssh_keys("/repo1").expect("should list");
        assert_eq!(keys1.len(), 1);
        assert_eq!(keys1[0].1, "~/.ssh/key1");

        let keys2 = db.list_remote_ssh_keys("/repo2").expect("should list");
        assert_eq!(keys2.len(), 1);
        assert_eq!(keys2[0].1, "~/.ssh/key2");
    }

    #[test]
    fn test_remote_ssh_keys_in_memory() {
        let db = Database::open_in_memory().expect("should create in-memory database");

        db.set_remote_ssh_key("/repo", "origin", "~/.ssh/key")
            .expect("should set");

        let key = db
            .get_remote_ssh_key("/repo", "origin")
            .expect("should get");
        assert_eq!(key, Some("~/.ssh/key".to_string()));
    }
}
