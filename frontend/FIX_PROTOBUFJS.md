# Fix protobufjs Postinstall Error

## Problem
The `protobufjs` postinstall script fails because `@google-cloud/speech` is a Node.js-only package that shouldn't be in frontend dependencies.

## Solution

### Option 1: Remove @google-cloud/speech (Recommended)

The frontend doesn't need `@google-cloud/speech` because:
- It's a Node.js-only package (won't work in browser)
- The frontend uses the backend API for transcription
- The `gg_stt.js` file already handles the case when it's not available

**Steps:**
1. Remove `@google-cloud/speech` from `package.json` dependencies (already done)
2. Clean and reinstall:
   ```bash
   cd frontend
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   ```

### Option 2: Skip protobufjs Postinstall (If you need the package)

If you must keep `@google-cloud/speech` for some reason:

```bash
cd frontend
pnpm install --ignore-scripts
```

Then manually build protobufjs:
```bash
cd node_modules/.pnpm/protobufjs@*/node_modules/protobufjs
pnpm run postinstall
```

### Option 3: Use .npmrc Configuration

Add to `frontend/.npmrc`:
```
ignore-scripts=true
```

Then install:
```bash
pnpm install
```

## Why This Happens

1. `@google-cloud/speech` depends on `protobufjs`
2. `protobufjs` has a postinstall script that builds native bindings
3. This script can fail in certain environments or with pnpm
4. The frontend doesn't actually need this package

## Verification

After fixing, verify the installation:
```bash
cd frontend
pnpm install
pnpm run build
```

The build should complete without protobufjs errors.
