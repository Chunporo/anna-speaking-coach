#!/bin/bash
# Setup script for commit message rules

set -e

echo "🔧 Setting up commit message rules..."

# Check if git is initialized
if [ ! -d .git ]; then
    echo "❌ Error: Not a git repository. Please run 'git init' first."
    exit 1
fi

# Setup git commit template
if [ -f .gitmessage ]; then
    echo "✅ Found .gitmessage template"
    git config commit.template .gitmessage
    echo "✅ Configured git to use .gitmessage template"
else
    echo "⚠️  Warning: .gitmessage not found"
fi

# Setup commitlint (if in frontend directory with package.json)
if [ -f frontend/package.json ]; then
    echo ""
    echo "📦 Setting up commitlint for frontend..."
    cd frontend

    if command -v pnpm &> /dev/null; then
        echo "Installing commitlint with pnpm..."
        pnpm add -D @commitlint/cli @commitlint/config-conventional husky 2>/dev/null || true

        if [ -f package.json ]; then
            # Initialize husky
            if [ ! -d .husky ]; then
                npx husky install 2>/dev/null || true
            fi

            # Add commit-msg hook
            if [ -d .husky ]; then
                echo "npx --no -- commitlint --edit \$1" > .husky/commit-msg
                chmod +x .husky/commit-msg
                echo "✅ Created commit-msg hook"
            fi
        fi
    elif command -v npm &> /dev/null; then
        echo "Installing commitlint with npm..."
        npm install --save-dev @commitlint/cli @commitlint/config-conventional husky 2>/dev/null || true

        if [ -f package.json ]; then
            # Initialize husky
            if [ ! -d .husky ]; then
                npx husky install 2>/dev/null || true
            fi

            # Add commit-msg hook
            if [ -d .husky ]; then
                echo "npx --no -- commitlint --edit \$1" > .husky/commit-msg
                chmod +x .husky/commit-msg
                echo "✅ Created commit-msg hook"
            fi
        fi
    else
        echo "⚠️  Warning: pnpm or npm not found. Skipping commitlint setup."
    fi

    cd ..
fi

# Create simple git hook as fallback
if [ ! -f .git/hooks/commit-msg ]; then
    echo ""
    echo "📝 Creating basic commit-msg hook..."
    cat > .git/hooks/commit-msg << 'EOF'
#!/bin/sh
# Basic commit message validation

commit_msg=$(cat "$1")
first_line=$(echo "$commit_msg" | head -n 1)

# Check if message matches conventional commit format
if ! echo "$first_line" | grep -qE "^(feat|fix|docs|style|refactor|perf|test|chore|ci|build)(\(.+\))?: .{1,72}$"; then
    echo ""
    echo "❌ Invalid commit message format!"
    echo ""
    echo "Expected format: <type>(<scope>): <subject>"
    echo ""
    echo "Types: feat, fix, docs, style, refactor, perf, test, chore, ci, build"
    echo "Example: feat(backend): add user authentication"
    echo ""
    echo "Your message: $first_line"
    echo ""
    exit 1
fi

exit 0
EOF
    chmod +x .git/hooks/commit-msg
    echo "✅ Created basic commit-msg hook"
fi

echo ""
echo "✅ Commit message rules setup complete!"
echo ""
echo "📝 Commit message format:"
echo "   <type>(<scope>): <subject>"
echo ""
echo "   Example: feat(backend): add user authentication endpoint"
echo ""
echo "📖 See docs/CONTRIBUTING.md for full guidelines"
