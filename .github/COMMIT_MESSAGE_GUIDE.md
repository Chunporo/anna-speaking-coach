# Commit Message Guide

Quick reference for commit message conventions.

## Quick Format

```
<type>(<scope>): <subject>
```

## Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(backend): add practice session endpoint` |
| `fix` | Bug fix | `fix(frontend): resolve audio playback issue` |
| `docs` | Documentation | `docs: update setup instructions` |
| `style` | Code style (formatting, etc.) | `style(backend): format code with black` |
| `refactor` | Code refactoring | `refactor(frontend): extract audio hooks` |
| `perf` | Performance improvement | `perf(backend): optimize database queries` |
| `test` | Tests | `test(backend): add practice session tests` |
| `chore` | Maintenance tasks | `chore: update dependencies` |
| `ci` | CI/CD changes | `ci: add GitHub Actions workflow` |
| `build` | Build system | `build: update Docker configuration` |

## Common Scopes

- `backend` - Backend API changes
- `frontend` - Frontend UI changes
- `docs` - Documentation
- `config` - Configuration files
- `auth` - Authentication
- `db` - Database
- `api` - API endpoints

## Examples

```bash
# Simple feature
feat(backend): add user authentication

# With body and footer
fix(frontend): resolve audio recording issue

The MediaRecorder API was not properly handling browser
permissions. Added proper error handling and user feedback.

Fixes #123

# Breaking change
feat(api): redesign authentication flow

BREAKING CHANGE: Login endpoint now requires OAuth2 tokens
```

## Tips

✅ **Do:**
- Use imperative mood ("add" not "added")
- Keep subject under 50 characters
- Be specific and clear
- Reference issues when applicable

❌ **Don't:**
- Use past tense ("fixed" → "fix")
- End subject with period
- Write vague messages ("fix bug")
- Mix multiple unrelated changes
