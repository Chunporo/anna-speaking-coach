# Fix unrs-resolver Postinstall Error

## Problem
The `unrs-resolver` postinstall script fails because:
- It's a Rust-based package that needs to be compiled
- The Rust toolchain may not be available or configured correctly
- It's only used by `eslint-import-resolver-typescript` (a dev dependency)

## Solution

### Option 1: Skip Postinstall Script (Recommended)

The package works fine without the postinstall script. We've configured pnpm to skip it:

1. **Using .pnpmfile.cjs** (already created)
   - This file removes the postinstall script for unrs-resolver
   - pnpm will use this automatically

2. **Reinstall dependencies:**
   ```bash
   cd frontend
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   ```

### Option 2: Install with --ignore-scripts

If Option 1 doesn't work:

```bash
cd frontend
pnpm install --ignore-scripts
```

Then manually install only what you need:
```bash
pnpm install --ignore-scripts --filter .
```

### Option 3: Remove from onlyBuiltDependencies

The `pnpm-workspace.yaml` has been updated to remove `unrs-resolver` from `onlyBuiltDependencies`. This prevents pnpm from trying to build it.

## Why This Works

- `unrs-resolver` is only used by ESLint (dev dependency)
- ESLint will work fine even if the postinstall script doesn't run
- The package functionality doesn't depend on the Rust build for basic usage
- It's a development tool, not required for production builds

## Verification

After fixing, verify the installation:
```bash
cd frontend
pnpm install
pnpm run lint  # Should work fine
pnpm run build # Should complete successfully
```

## Alternative: Install Rust Toolchain

If you really need the full functionality of unrs-resolver:

```bash
# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Then reinstall
cd frontend
pnpm install
```

However, this is **not necessary** for the project to work.
