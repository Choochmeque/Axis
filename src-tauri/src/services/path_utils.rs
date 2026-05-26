use crate::error::{AxisError, Result};
use std::path::{Component, Path, PathBuf};

pub fn validate_repo_relative_path(path: &str) -> Result<PathBuf> {
    let path = Path::new(path);

    if path.as_os_str().is_empty() {
        return Err(AxisError::InvalidRepositoryPath(
            "Path must not be empty".to_string(),
        ));
    }

    let mut clean = PathBuf::new();
    for component in path.components() {
        match component {
            Component::Normal(part) => clean.push(part),
            Component::CurDir => {}
            Component::ParentDir | Component::RootDir | Component::Prefix(_) => {
                return Err(AxisError::InvalidRepositoryPath(format!(
                    "Path must stay inside repository: {}",
                    path.display()
                )));
            }
        }
    }

    if clean.as_os_str().is_empty() {
        return Err(AxisError::InvalidRepositoryPath(
            "Path must reference a repository file".to_string(),
        ));
    }

    Ok(clean)
}

pub fn resolve_repo_relative_path(workdir: &Path, path: &str) -> Result<(PathBuf, PathBuf)> {
    let relative_path = validate_repo_relative_path(path)?;
    let target_path = workdir.join(&relative_path);

    let canonical_workdir = workdir.canonicalize()?;
    let mut existing_ancestor = target_path.as_path();
    while !existing_ancestor.exists() {
        existing_ancestor = existing_ancestor.parent().ok_or_else(|| {
            AxisError::InvalidRepositoryPath(format!(
                "Path has no repository ancestor: {}",
                target_path.display()
            ))
        })?;
    }

    let canonical_ancestor = existing_ancestor.canonicalize()?;
    if !canonical_ancestor.starts_with(&canonical_workdir) {
        return Err(AxisError::InvalidRepositoryPath(format!(
            "Path must stay inside repository: {}",
            target_path.display()
        )));
    }

    Ok((relative_path, target_path))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_normal_relative_path() {
        let path =
            validate_repo_relative_path("src/main.rs").expect("relative path should be valid");
        assert_eq!(path, PathBuf::from("src/main.rs"));
    }

    #[test]
    fn rejects_parent_traversal() {
        let err = validate_repo_relative_path("../outside.txt").expect_err("path should fail");
        assert!(err.to_string().contains("inside repository"));
    }

    #[test]
    fn rejects_absolute_path() {
        let err = validate_repo_relative_path("/tmp/outside.txt").expect_err("path should fail");
        assert!(err.to_string().contains("inside repository"));
    }

    #[test]
    fn rejects_empty_path() {
        let err = validate_repo_relative_path("").expect_err("path should fail");
        assert!(err.to_string().contains("must not be empty"));
    }

    #[cfg(unix)]
    #[test]
    fn rejects_existing_symlink_parent_outside_workdir() {
        let repo = tempfile::tempdir().expect("should create repo tempdir");
        let outside = tempfile::tempdir().expect("should create outside tempdir");
        std::os::unix::fs::symlink(outside.path(), repo.path().join("linked"))
            .expect("should create symlink");

        let err = resolve_repo_relative_path(repo.path(), "linked/file.txt")
            .expect_err("symlink parent should fail");
        assert!(err.to_string().contains("inside repository"));
    }
}
