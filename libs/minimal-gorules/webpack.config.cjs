const { composePlugins, withNx } = require('@nx/webpack');

module.exports = composePlugins(withNx(), (config, { options, context }) => {
  // Optimize for minimal bundle size and tree-shaking
  config.optimization = {
    ...config.optimization,
    usedExports: true,
    sideEffects: false,
    minimize: true,
    concatenateModules: true,
  };

  // Configure externals for Node.js builds
  if (options.target === 'node') {
    config.externals = {
      '@gorules/zen-engine': '@gorules/zen-engine',
      '@nestjs/common': '@nestjs/common',
      '@nestjs/core': '@nestjs/core',
      '@nestjs/config': '@nestjs/config',
      'reflect-metadata': 'reflect-metadata',
      'rxjs': 'rxjs',
    };
  }

  // Configure for browser builds
  if (options.target === 'web') {
    config.externals = {
      '@gorules/zen-engine': '@gorules/zen-engine',
      'react': 'react',
      'react-dom': 'react-dom',
    };
    
    // Add fallbacks for Node.js modules
    config.resolve = {
      ...config.resolve,
      fallback: {
        'zlib': false,
        'util': false,
        'fs': false,
        'path': false,
        'crypto': false,
        'stream': false,
        'buffer': false,
        'http': false,
        'https': false,
        'url': false,
        'querystring': false,
      },
    };
  }

  // Ensure proper module resolution
  config.resolve = {
    ...config.resolve,
    conditionNames: ['import', 'require', 'node', 'default'],
    mainFields: ['module', 'main'],
  };

  return config;
});