const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable standalone output for Docker deployment
  output: process.env.DOCKER_BUILD === 'true' ? 'standalone' : undefined,
  // Configure webpack to resolve @/ alias
  webpack: (config, { dir, defaultLoaders }) => {
    // Get the absolute path to the project root (frontend directory)
    const projectRoot = path.resolve(dir || __dirname);
    
    // Configure alias to match tsconfig.json: "@/*": ["./*"]
    // This means @/lib/api should resolve to ./lib/api from project root
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': projectRoot,
    };
    
    // Ensure webpack resolves modules from the project directory
    if (!config.resolve.modules) {
      config.resolve.modules = [];
    }
    if (!config.resolve.modules.includes(projectRoot)) {
      config.resolve.modules.unshift(projectRoot);
    }
    
    return config;
  },
}

module.exports = nextConfig

