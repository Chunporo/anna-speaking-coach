# Contributing Guide

## Commit Message Convention

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc.)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools and libraries
- **ci**: Changes to CI configuration files and scripts
- **build**: Changes that affect the build system or external dependencies

### Scope

The scope is optional and indicates the area of the codebase affected:

- `backend`: Backend API changes
- `frontend`: Frontend UI/UX changes
- `docs`: Documentation changes
- `config`: Configuration files
- `deps`: Dependencies updates
- `auth`: Authentication related
- `db`: Database related
- `api`: API endpoints

### Subject

- Use imperative, present tense: "change" not "changed" nor "changes"
- Don't capitalize first letter
- No dot (.) at the end
- Maximum 50 characters

### Body (Optional)

- Explain **what** and **why** vs. **how**
- Wrap at 72 characters
- Can include multiple paragraphs

### Footer (Optional)

- Reference issues: `Fixes #123` or `Closes #456`
- Breaking changes: `BREAKING CHANGE: description`

### Examples

#### Simple commit
```
feat(backend): add user authentication endpoint
```

#### Commit with body
```
fix(frontend): resolve audio playback issue

The audio player was not properly handling WebM format files.
Added proper MIME type detection and fallback handling.

Fixes #123
```

#### Breaking change
```
feat(api): redesign user authentication flow

BREAKING CHANGE: The login endpoint now requires OAuth2 tokens
instead of username/password. Update your client code accordingly.
```

#### Multiple scopes
```
refactor(backend,frontend): extract common utilities

- Backend: Created utils/progress.py for progress updates
- Frontend: Created hooks/useAudioRecorder.ts for audio handling
```

## Setup Commit Message Template

### Option 1: Git Template (Recommended)

1. Configure git to use the template:
```bash
git config commit.template .gitmessage
```

2. Or set it globally:
```bash
git config --global commit.template ~/.gitmessage
cp .gitmessage ~/.gitmessage
```

### Option 2: Commitlint (Automatic Validation)

1. Install commitlint (if using npm/pnpm):
```bash
cd frontend
pnpm add -D @commitlint/cli @commitlint/config-conventional
```

2. Install husky for git hooks:
```bash
pnpm add -D husky
npx husky install
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit ${1}'
```

3. The commitlint configuration is in `.commitlintrc.json` at the root.

## Commit Message Best Practices

1. **Be specific**: Instead of "fix bug", write "fix(backend): handle null user_id in practice session"

2. **Use present tense**: "add feature" not "added feature"

3. **Keep it concise**: Subject should be clear and brief

4. **Reference issues**: Link to GitHub issues when applicable

5. **Group related changes**: One logical change per commit

6. **Write meaningful messages**: Future you (and others) will thank you

## Examples for This Project

```bash
# Feature
git commit -m "feat(backend): add Gemini AI feedback service"
git commit -m "feat(frontend): add practice history component"

# Bug fix
git commit -m "fix(backend): resolve streak calculation error"
git commit -m "fix(frontend): handle audio recording errors gracefully"

# Documentation
git commit -m "docs: update environment setup guide"
git commit -m "docs(deployment): add Railway deployment instructions"

# Refactoring
git commit -m "refactor(backend): extract progress update utilities"
git commit -m "refactor(frontend): split practice page into smaller components"

# Configuration
git commit -m "chore: update dependencies"
git commit -m "ci: add GitHub Actions workflow"
```

## Tools

### VS Code Extension
- **Conventional Commits**: Provides commit message templates and validation

### CLI Tools
- **commitizen**: Interactive commit message builder
  ```bash
  npm install -g commitizen
  npm install -g cz-conventional-changelog
  ```

### Git Aliases
Add these to your `~/.gitconfig`:
```ini
[alias]
  cm = commit -m
  cam = commit -am
  co = checkout
  br = branch
```

## Enforcing Rules

### Pre-commit Hook (Optional)

Create `.git/hooks/commit-msg`:
```bash
#!/bin/sh
# Validate commit message format
commit_msg=$(cat "$1")

if ! echo "$commit_msg" | grep -qE "^(feat|fix|docs|style|refactor|perf|test|chore|ci|build)(\(.+\))?: .{1,50}$"; then
  echo "❌ Invalid commit message format!"
  echo ""
  echo "Format: <type>(<scope>): <subject>"
  echo "Example: feat(backend): add user authentication"
  exit 1
fi
```

Make it executable:
```bash
chmod +x .git/hooks/commit-msg
```

## Questions?

If you have questions about commit messages, please open an issue or ask in discussions.
