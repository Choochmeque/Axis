---
description: Generate and manage SSH keys in Axis. Secure authentication to GitHub and other Git remotes.
---

# SSH Keys

SSH keys provide secure authentication to remote Git repositories without entering passwords. Axis includes full SSH key management - no terminal required.

## SSH Key Basics

SSH uses key pairs for authentication:

- **Private key**: Kept secret on your machine (`~/.ssh/id_ed25519`)
- **Public key**: Shared with services like GitHub (same path with `.pub` extension)

## Managing SSH Keys

### View Your Keys

Go to **Settings > SSH Keys** to see all SSH keys in your `~/.ssh` directory. Each key shows:

- Key type (Ed25519, RSA, ECDSA)
- Comment/name
- Fingerprint

### Generate a New Key

:::tabs
== Axis
1. Go to **Settings > SSH Keys**
2. Click the **+** button
3. Choose algorithm (Ed25519 recommended)
4. Enter a filename (e.g., `github_key`)
5. Optionally add a comment and passphrase
6. Click **Generate**

== CLI
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```
:::

### Import an Existing Key

:::tabs
== Axis
1. Go to **Settings > SSH Keys**
2. Click the **Import** button
3. Browse to select your private key file
4. Enter a filename for the imported key
5. Click **Import**

== CLI
```bash
cp /path/to/key ~/.ssh/
chmod 600 ~/.ssh/keyname
```
:::

### Copy Public Key

:::tabs
== Axis
1. Go to **Settings > SSH Keys**
2. Click the **Copy** button next to a key
3. The public key is copied to your clipboard

== CLI
```bash
# macOS
pbcopy < ~/.ssh/id_ed25519.pub

# Linux
xclip -selection clipboard < ~/.ssh/id_ed25519.pub

# Windows
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub | Set-Clipboard
```
:::

### Export a Key

:::tabs
== Axis
1. Go to **Settings > SSH Keys**
2. Click the **Export** button next to a key
3. Choose a destination folder
4. Select whether to export public key only or both keys
5. Click **Export**

== CLI
```bash
cp ~/.ssh/id_ed25519 /path/to/destination/
cp ~/.ssh/id_ed25519.pub /path/to/destination/
```
:::

### Delete a Key

:::tabs
== Axis
1. Go to **Settings > SSH Keys**
2. Click the **Delete** button next to a key
3. Confirm deletion

== CLI
```bash
rm ~/.ssh/id_ed25519
rm ~/.ssh/id_ed25519.pub
```
:::

::: warning
Deleting a key removes it from your system. You'll lose access to any service configured with this key.
:::

## Adding Key to GitHub/GitLab

1. Copy your public key (see above)
2. Go to GitHub > Settings > SSH and GPG keys
3. Click **New SSH key**
4. Paste your public key and save

## Per-Remote Key Assignment

Axis can assign specific SSH keys to specific remotes, useful when you have multiple keys for different services.

1. Go to **Repository > Remotes**
2. Select a remote
3. Choose which SSH key to use for this remote

This avoids the need to configure `~/.ssh/config` manually.

## Passphrase Handling

When you perform Git operations with a passphrase-protected key:

1. Axis prompts for the passphrase
2. The passphrase is cached in memory for the session
3. Future operations use the cached passphrase

## SSH Agent Integration

For persistent passphrase caching, add your key to the SSH agent:

:::tabs
== macOS
```bash
eval "$(ssh-agent -s)"
ssh-add --apple-use-keychain ~/.ssh/id_ed25519
```

== Linux
```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

== Windows
```powershell
# Run as Administrator
Get-Service ssh-agent | Set-Service -StartupType Automatic
Start-Service ssh-agent
ssh-add $env:USERPROFILE\.ssh\id_ed25519
```
:::

## Key Types

### Ed25519 (Recommended)

- Modern, secure, and fast
- Shorter keys with equivalent security
- Widely supported

### RSA

- Older but universally compatible
- Use 4096 bits for security

### ECDSA

- Elliptic curve cryptography
- Good balance of security and performance

## Converting HTTPS to SSH

If your repository uses HTTPS and you want to switch to SSH:

:::tabs
== Axis
1. Go to **Repository > Remotes**
2. Click the remote to edit
3. Change URL from HTTPS to SSH format
   (e.g., `git@github.com:username/repo.git`)
4. Click **Save**

== CLI
```bash
git remote set-url origin git@github.com:username/repo.git
```
:::

## Troubleshooting

### Authentication Failed

1. Verify the key is added to GitHub/GitLab
2. Check the key is loaded: `ssh-add -l`
3. Test the connection: `ssh -T git@github.com`
4. Ensure the remote URL uses SSH format

### Wrong Key Used

Use per-remote key assignment in Axis, or configure `~/.ssh/config`:

```
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/github_key
```

## Security Best Practices

1. **Always use a passphrase** - Protects your key if your machine is compromised
2. **Use unique keys** - Different keys for different services
3. **Rotate keys periodically** - Replace old keys annually
4. **Never share private keys** - Only share `.pub` files
