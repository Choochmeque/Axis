---
description: Download and install Axis Git client on Windows, macOS, or Linux. Stable and nightly release channels available.
---

# Installation

## Requirements

- **Git** must be installed on your system
- Supported platforms: macOS, Windows, Linux

## Release Channels

Axis offers two release channels to suit your needs:

### Stable

Stable releases are thoroughly tested and recommended for most users. They receive bug fixes and security updates.

- **Best for**: Daily use, production workflows
- **Updates**: Regular releases with tested features
- **Auto-update**: Enabled by default

### Nightly

Nightly builds include the latest features and improvements, built automatically from the main branch. These may contain experimental features or bugs.

- **Best for**: Testing new features, providing feedback
- **Updates**: Built daily when changes are made
- **Auto-update**: Nightly builds update to newer nightly builds

::: warning
Nightly builds may be unstable. Not recommended for critical workflows.
:::

## Download

Download from [GitHub Releases](https://github.com/Choochmeque/Axis/releases):

- **Stable**: Look for version numbers like `v1.0.0`
- **Nightly**: Look for tags ending with `-nightly`

| Platform | Format |
|----------|--------|
| macOS | `.dmg` |
| Windows | `.exe` (NSIS installer) |
| Linux | `.AppImage` |

## macOS

1. Download the `.dmg` file
2. Open the disk image
3. Drag Axis to your Applications folder
4. Launch Axis from Applications

::: tip
On first launch, you may need to right-click and select "Open" to bypass Gatekeeper.
:::

## Windows

1. Download the `.exe` installer
2. Run the installer
3. Follow the installation wizard
4. Launch Axis from the Start menu

## Linux

1. Download the `.AppImage` file
2. Make it executable: `chmod +x Axis-*.AppImage`
3. Run the AppImage

::: tip
You can use [AppImageLauncher](https://github.com/TheAssassin/AppImageLauncher) for better desktop integration.
:::
