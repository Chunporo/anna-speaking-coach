/**
 * pnpmfile.cjs - Custom package installation hooks
 * This allows us to skip problematic postinstall scripts
 */

function readPackage(pkg, context) {
  // Skip postinstall for unrs-resolver (Rust build can fail)
  if (pkg.name === 'unrs-resolver') {
    // Remove postinstall script to avoid build errors
    if (pkg.scripts && pkg.scripts.postinstall) {
      delete pkg.scripts.postinstall;
    }
  }

  return pkg;
}

module.exports = {
  hooks: {
    readPackage,
  },
};
