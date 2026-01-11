use crate::error::{AxisError, Result};
use crate::models::{AppSettings, RecentRepository};
use chrono::Utc;
use rusqlite::{params, Connection};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

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
        let conn = self
            .conn
            .lock()
            .map_err(|e| AxisError::Other(e.to_string()))?;
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
        let conn = self
            .conn
            .lock()
            .map_err(|e| AxisError::Other(e.to_string()))?;
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
        let conn = self
            .conn
            .lock()
            .map_err(|e| AxisError::Other(e.to_string()))?;
        let json = serde_json::to_string(settings)?;

        conn.execute(
            "INSERT INTO settings (key, value) VALUES ('app_settings', ?1)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![json],
        )?;

        Ok(())
    }

    pub fn add_recent_repository(&self, path: &Path, name: &str) -> Result<()> {
        let conn = self
            .conn
            .lock()
            .map_err(|e| AxisError::Other(e.to_string()))?;
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

        // Keep only the last 20 recent repositories
        conn.execute(
            "DELETE FROM recent_repositories
             WHERE id NOT IN (
                SELECT id FROM recent_repositories
                ORDER BY last_opened DESC
                LIMIT 20
             )",
            [],
        )?;

        Ok(())
    }

    pub fn get_recent_repositories(&self) -> Result<Vec<RecentRepository>> {
        let conn = self
            .conn
            .lock()
            .map_err(|e| AxisError::Other(e.to_string()))?;
        let mut stmt = conn.prepare(
            "SELECT path, name, last_opened
             FROM recent_repositories
             ORDER BY last_opened DESC",
        )?;

        let repos = stmt
            .query_map([], |row| {
                let path: String = row.get(0)?;
                let name: String = row.get(1)?;
                let last_opened: String = row.get(2)?;

                Ok(RecentRepository {
                    path: PathBuf::from(path),
                    name,
                    last_opened: chrono::DateTime::parse_from_rfc3339(&last_opened)
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(|_| Utc::now()),
                })
            })?
            .filter_map(|r| r.ok())
            .collect();

        Ok(repos)
    }

    pub fn remove_recent_repository(&self, path: &Path) -> Result<()> {
        let conn = self
            .conn
            .lock()
            .map_err(|e| AxisError::Other(e.to_string()))?;
        // Normalize path: remove trailing slash
        let path_str = path.to_string_lossy().trim_end_matches('/').to_string();
        conn.execute(
            "DELETE FROM recent_repositories WHERE path = ?1",
            params![path_str],
        )?;
        Ok(())
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
    fn test_get_default_settings() {
        let tmp = TempDir::new().expect("should create temp directory");
        let db = Database::new(tmp.path()).expect("should create database");

        let settings = db.get_settings().expect("should get settings");
        assert_eq!(settings.font_size, 13);
        assert_eq!(settings.default_branch_name, "main");
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
}
