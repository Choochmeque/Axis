# SSH Keys

SSH keys provide secure authentication to remote Git repositories without entering passwords. Axis helps you manage SSH keys and handles passphrase prompts.

## SSH Key Basics

SSH uses key pairs for authentication:

- **Private key**: Kept secret on your machine
  - macOS/Linux: `~/.ssh/id_ed25519`
  - Windows: `C:\Users\<username>\.ssh\id_ed25519`
- **Public key**: Shared with services like GitHub (same path with `.pub` extension)

## Setting Up SSH Keys

### Generate a New Key

1. Open Terminal
2. Generate an Ed25519 key (recommended):

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

3. When prompted, choose a location (default is fine)
4. Enter a passphrase for additional security

### Add Key to SSH Agent

::: code-group

```bash [macOS]
# Start the SSH agent
eval "$(ssh-agent -s)"

# Add your key (with keychain)
ssh-add --apple-use-keychain ~/.ssh/id_ed25519
```

```bash [Linux]
# Start the SSH agent
eval "$(ssh-agent -s)"

# Add your key
ssh-add ~/.ssh/id_ed25519
```

```powershell [Windows]
# Start the SSH agent service (run as Administrator)
Get-Service ssh-agent | Set-Service -StartupType Automatic
Start-Service ssh-agent

# Add your key
ssh-add $env:USERPROFILE\.ssh\id_ed25519
```

:::

### Add Key to GitHub

1. Copy your public key:

::: code-group

```bash [macOS]
pbcopy < ~/.ssh/id_ed25519.pub
```

```bash [Linux]
xclip -selection clipboard < ~/.ssh/id_ed25519.pub
# or
cat ~/.ssh/id_ed25519.pub  # then copy manually
```

```powershell [Windows]
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub | Set-Clipboard
```

:::

2. Go to GitHub > Settings > SSH and GPG keys
3. Click **New SSH key**
4. Paste your public key and save

## Using SSH in Axis

### Passphrase Handling

When you perform Git operations with an SSH key that has a passphrase:

1. Axis prompts for the passphrase
2. Optionally save it to the system keychain
3. Future operations use the saved passphrase

### SSH Key Selection

Axis uses your system's SSH configuration. To specify which key to use for different hosts, edit your SSH config:

- macOS/Linux: `~/.ssh/config`
- Windows: `C:\Users\<username>\.ssh\config`

::: tip
On Windows, you can use either forward slashes or `~` in the config file. Git for Windows and OpenSSH understand both formats.
:::

```
# GitHub
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/github_key

# GitLab
Host gitlab.com
  HostName gitlab.com
  User git
  IdentityFile ~/.ssh/gitlab_key

# Work server
Host work
  HostName git.company.com
  User git
  IdentityFile ~/.ssh/work_key
```

## Managing Keys in Axis

### View SSH Keys

1. Open **Settings** > **SSH Keys**
2. View your configured SSH keys
3. See which keys are loaded in the SSH agent

### Troubleshooting

If SSH authentication fails:

1. Verify the key is added to GitHub/GitLab
2. Check the key is loaded: `ssh-add -l`
3. Test the connection: `ssh -T git@github.com`
4. Ensure the remote URL uses SSH format: `git@github.com:user/repo.git`

## Key Types

### Ed25519 (Recommended)

- Modern, secure, and fast
- Shorter keys with equivalent security
- Widely supported

```bash
ssh-keygen -t ed25519 -C "email@example.com"
```

### RSA

- Older but universally compatible
- Use 4096 bits for security

```bash
ssh-keygen -t rsa -b 4096 -C "email@example.com"
```

## Security Best Practices

1. **Always use a passphrase** - Protects your key if your machine is compromised
2. **Use unique keys** - Different keys for different services
3. **Rotate keys periodically** - Replace old keys annually
4. **Never share private keys** - Only share `.pub` files
5. **Use SSH agent** - Avoid entering passphrases repeatedly

## Converting HTTPS to SSH

If your repository uses HTTPS and you want to switch to SSH:

```bash
# View current remote
git remote -v

# Change to SSH
git remote set-url origin git@github.com:username/repo.git
```

Or in Axis:

1. Go to **Repository** > **Remotes**
2. Edit the remote URL
3. Change to SSH format
