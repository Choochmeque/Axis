# GitFlow

Built-in support for the GitFlow branching model.

## What is GitFlow?

GitFlow is a branching strategy with:
- **main** - Production-ready code
- **develop** - Integration branch
- **feature/** - New features
- **release/** - Release preparation
- **hotfix/** - Production fixes

## Initialize GitFlow

1. Go to **Repository > GitFlow**
2. Click **Initialize**
3. Confirm branch names (or customize)

## Features

### Start Feature
1. Click **New Feature**
2. Enter feature name
3. Creates `feature/your-feature` from `develop`

### Finish Feature
1. Click **Finish Feature**
2. Merges into `develop`
3. Optionally deletes feature branch

## Releases

### Start Release
1. Click **New Release**
2. Enter version number
3. Creates `release/v1.0.0` from `develop`

### Finish Release
1. Click **Finish Release**
2. Merges into `main` and `develop`
3. Creates version tag

## Hotfixes

### Start Hotfix
1. Click **New Hotfix**
2. Enter hotfix name
3. Creates `hotfix/fix-name` from `main`

### Finish Hotfix
1. Click **Finish Hotfix**
2. Merges into `main` and `develop`
3. Creates patch version tag
