# Commit Signing

Sign your commits to verify your identity and prove that commits came from you. Axis supports both GPG and SSH signing.

## Why Sign Commits?

- **Verify identity** - Prove commits are from you, not an impersonator
- **Build trust** - GitHub shows "Verified" badge on signed commits
- **Security requirements** - Some organizations require signed commits
- **Prevent tampering** - Detect if commits were modified

## Signing Methods

### GPG Signing

GPG (GNU Privacy Guard) is the traditional method for signing commits.

### SSH Signing

SSH signing (Git 2.34+) uses your existing SSH keys, avoiding the need for separate GPG keys.

## Setup in Axis

:::tabs
== Axis
1. Go to **Settings > Signing**
2. Enable **Sign commits**
3. Choose your signing method (GPG or SSH)
4. Configure your signing key

== CLI
```bash
# Enable signing for all commits
git config --global commit.gpgsign true
```
:::

## GPG Setup

### Generate a GPG Key

:::tabs
== macOS
```bash
# Install GPG
brew install gnupg

# Generate key
gpg --full-generate-key
# Choose: RSA and RSA, 4096 bits, key does not expire
```

== Linux
```bash
# Install GPG (usually pre-installed)
sudo apt install gnupg

# Generate key
gpg --full-generate-key
```

== Windows
```powershell
# Install Gpg4win from https://gpg4win.org
# Then in Git Bash or PowerShell:
gpg --full-generate-key
```
:::

### List Your Keys

```bash
gpg --list-secret-keys --keyid-format=long
```

Output example:
```
sec   rsa4096/ABC123DEF456 2024-01-01 [SC]
      1234567890ABCDEF1234567890ABCDEF12345678
uid           [ultimate] Your Name <your@email.com>
```

The key ID is `ABC123DEF456` in this example.

### Configure Git

```bash
# Set your signing key
git config --global user.signingkey ABC123DEF456

# Use GPG for signing
git config --global gpg.format openpgp
```

### Add Key to GitHub

1. Export your public key:
```bash
gpg --armor --export ABC123DEF456
```

2. Go to GitHub > Settings > SSH and GPG keys
3. Click **New GPG key**
4. Paste the exported key

## SSH Setup

SSH signing is simpler if you already have SSH keys set up.

### Configure Git for SSH Signing

```bash
# Use SSH for signing
git config --global gpg.format ssh

# Set your signing key (use your SSH public key path)
git config --global user.signingkey ~/.ssh/id_ed25519.pub
```

::: tip
On Windows, use the full path: `C:\Users\<username>\.ssh\id_ed25519.pub`
:::

### Add Key to GitHub

Your SSH key needs to be added as a **signing key** (not just authentication):

1. Go to GitHub > Settings > SSH and GPG keys
2. Click **New SSH key**
3. Set **Key type** to "Signing Key"
4. Paste your public key

## Using Signing in Axis

### Automatic Signing

When enabled in settings, all commits are automatically signed.

### Per-Commit Signing

:::tabs
== Axis
1. Stage your changes
2. Check the **Sign commit** checkbox in the commit dialog
3. Commit as usual

== CLI
```bash
git commit -S -m "Your commit message"
```
:::

### Verifying Signatures

:::tabs
== Axis
Signed commits show a verification badge in the commit history:
- **Verified** - Signature is valid and matches a known key
- **Unverified** - Signature exists but can't be verified
- **No signature** - Commit is not signed

== CLI
```bash
git log --show-signature
git verify-commit abc123
```
:::

## Troubleshooting

### "No signing key found"

1. Verify your key is configured:
```bash
git config --global user.signingkey
```

2. For GPG, ensure the key exists:
```bash
gpg --list-secret-keys
```

### GPG Passphrase Prompt

If GPG prompts for passphrase in terminal:

:::tabs
== macOS
```bash
# Use pinentry-mac for GUI prompts
brew install pinentry-mac
echo "pinentry-program $(which pinentry-mac)" >> ~/.gnupg/gpg-agent.conf
gpgconf --kill gpg-agent
```

== Linux
```bash
# Install pinentry for GUI
sudo apt install pinentry-gtk2
# or pinentry-qt for KDE
```

== Windows
```powershell
# Gpg4win includes GUI pinentry by default
```
:::

### SSH Signing Fails

1. Ensure Git 2.34 or newer:
```bash
git --version
```

2. Verify SSH key path is correct and uses `.pub` extension

3. Check the key is added to ssh-agent:
```bash
ssh-add -l
```

### "Signing failed" Error

1. Test signing manually:
```bash
echo "test" | gpg --clearsign
```

2. Check GPG agent is running:
```bash
gpg-agent --daemon
```

## Best Practices

1. **Use a strong passphrase** - Protect your signing key
2. **Back up your keys** - Store securely offline
3. **Set key expiration** - Rotate keys periodically
4. **Use separate keys** - Different keys for different purposes
5. **Verify before merging** - Check signatures on PRs

## Organization Requirements

Some organizations enforce signed commits:

- GitHub branch protection can require signed commits
- GitLab supports signature verification
- Configure in repository settings > Branch protection rules
