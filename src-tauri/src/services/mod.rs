mod file_watcher;
mod git2_service;
mod git_cli_service;
mod signing_service;

pub use file_watcher::*;
pub use git2_service::*;
pub use git_cli_service::*;
pub use signing_service::*;

// TODO: Implement a single GitService that combines both Git2Service and GitCliService
// pub struct GitService {
//     git2: Git2Service,
//     git_cli: GitCliService,
// }
