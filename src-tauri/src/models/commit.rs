use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Commit {
    pub oid: String,
    pub short_oid: String,
    pub message: String,
    pub summary: String,
    pub author: Signature,
    pub committer: Signature,
    pub parent_oids: Vec<String>,
    pub timestamp: DateTime<Utc>,
    pub is_merge: bool,
    /// Signature info if the commit is signed
    pub signature: Option<CommitSignature>,
}

/// Information about a commit's cryptographic signature
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CommitSignature {
    /// The type of signature (GPG or SSH)
    pub format: String,
    /// The signer's key ID or fingerprint (if available)
    pub signer: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Signature {
    pub name: String,
    pub email: String,
    pub timestamp: DateTime<Utc>,
}

impl Commit {
    pub fn from_git2_commit(commit: &git2::Commit, repo: &git2::Repository) -> Self {
        let author = commit.author();
        let committer = commit.committer();

        let signature = Self::extract_signature(repo, commit.id());

        Commit {
            oid: commit.id().to_string(),
            short_oid: commit.id().to_string()[..7].to_string(),
            message: commit.message().unwrap_or("").to_string(),
            summary: commit.summary().unwrap_or("").to_string(),
            author: Signature::from_git2_signature(&author),
            committer: Signature::from_git2_signature(&committer),
            parent_oids: commit.parent_ids().map(|id| id.to_string()).collect(),
            timestamp: DateTime::from_timestamp(commit.time().seconds(), 0)
                .unwrap_or_default()
                .with_timezone(&Utc),
            is_merge: commit.parent_count() > 1,
            signature,
        }
    }

    fn extract_signature(repo: &git2::Repository, oid: git2::Oid) -> Option<CommitSignature> {
        use crate::services::SigningService;

        let (sig_buf, signed_data) = repo.extract_signature(&oid, Some("gpgsig")).ok()?;
        let sig_str = std::str::from_utf8(&sig_buf).ok()?;
        let data_string = String::from_utf8(signed_data.to_vec()).ok();

        let is_gpg = sig_str.contains("-----BEGIN PGP SIGNATURE-----");
        let is_ssh = sig_str.contains("-----BEGIN SSH SIGNATURE-----");

        let format = if is_gpg {
            "gpg"
        } else if is_ssh {
            "ssh"
        } else {
            "unknown"
        };

        let signer = match (data_string.as_deref(), is_gpg, is_ssh) {
            (Some(data), true, _) => SigningService::verify_gpg_signature(sig_str, data),
            (Some(data), _, true) => {
                SigningService::verify_ssh_signature(sig_str, data, repo.path())
            }
            _ => None,
        };

        Some(CommitSignature {
            format: format.to_string(),
            signer,
        })
    }
}

impl Signature {
    pub fn from_git2_signature(sig: &git2::Signature) -> Self {
        Signature {
            name: sig.name().unwrap_or("Unknown").to_string(),
            email: sig.email().unwrap_or("").to_string(),
            timestamp: DateTime::from_timestamp(sig.when().seconds(), 0)
                .unwrap_or_default()
                .with_timezone(&Utc),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Type)]
#[serde(rename_all = "PascalCase")]
pub enum BranchFilterType {
    #[default]
    All,
    Current,
    Specific(String),
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Type)]
#[serde(rename_all = "PascalCase")]
pub enum SortOrder {
    #[default]
    DateOrder,
    AncestorOrder,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct LogOptions {
    pub limit: Option<usize>,
    pub skip: Option<usize>,
    pub from_ref: Option<String>,
    #[serde(default)]
    pub branch_filter: BranchFilterType,
    #[serde(default = "default_include_remotes")]
    pub include_remotes: bool,
    #[serde(default)]
    pub sort_order: SortOrder,
}

fn default_include_remotes() -> bool {
    true
}

impl Default for LogOptions {
    fn default() -> Self {
        LogOptions {
            limit: Some(100),
            skip: None,
            from_ref: None,
            branch_filter: BranchFilterType::All,
            include_remotes: true,
            sort_order: SortOrder::DateOrder,
        }
    }
}
