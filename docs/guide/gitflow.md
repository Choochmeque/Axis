---
description: Use GitFlow branching model in Axis. Built-in support for feature, release, and hotfix branches.
---

# GitFlow

Built-in support for the GitFlow branching model.

## What is GitFlow?

GitFlow is a branching strategy with:
- **main** - Production-ready code
- **develop** - Integration branch
- **feature/** - New features
- **release/** - Release preparation
- **hotfix/** - Production fixes

```
main:     ──●─────────────────●────●──
            │                 │    │
release:    │           ●─────┘    │
            │           │          │
develop:  ──●───●───●───●──────────●──
                │   │
feature:        ●───┘
```

## Initialize GitFlow

:::tabs
== Axis
1. Go to **Repository > GitFlow**
2. Click **Initialize**
3. Confirm branch names (or customize)

== CLI
```bash
git flow init
# Answer prompts for branch names
```
:::

## Features

### Start Feature

:::tabs
== Axis
1. Click **New Feature**
2. Enter feature name
3. Creates `feature/your-feature` from `develop`

== CLI
```bash
git flow feature start your-feature
```
:::

### Finish Feature

:::tabs
== Axis
1. Click **Finish Feature**
2. Merges into `develop`
3. Optionally deletes feature branch

== CLI
```bash
git flow feature finish your-feature
```
:::

## Releases

### Start Release

:::tabs
== Axis
1. Click **New Release**
2. Enter version number
3. Creates `release/v1.0.0` from `develop`

== CLI
```bash
git flow release start v1.0.0
```
:::

### Finish Release

:::tabs
== Axis
1. Click **Finish Release**
2. Merges into `main` and `develop`
3. Creates version tag

== CLI
```bash
git flow release finish v1.0.0
# Creates tag and merges to main and develop
```
:::

## Hotfixes

### Start Hotfix

:::tabs
== Axis
1. Click **New Hotfix**
2. Enter hotfix name
3. Creates `hotfix/fix-name` from `main`

== CLI
```bash
git flow hotfix start fix-name
```
:::

### Finish Hotfix

:::tabs
== Axis
1. Click **Finish Hotfix**
2. Merges into `main` and `develop`
3. Creates patch version tag

== CLI
```bash
git flow hotfix finish fix-name
```
:::

## GitFlow Without Extension

If git-flow extension isn't installed, you can use standard Git:

```bash
# Start feature
git checkout develop
git checkout -b feature/my-feature

# Finish feature
git checkout develop
git merge --no-ff feature/my-feature
git branch -d feature/my-feature
```
