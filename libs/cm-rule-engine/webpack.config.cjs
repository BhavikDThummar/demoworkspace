const { composePlugins, withNx } = require('@nx/webpack');

/**
 * Webpack configuration for cm-rule-engine
 * 
 * This configuration handles both Node.js and browser builds:
 * - Node.js: CommonJS with NestJS integration
 * - Browser: ESM with React integration
 */
module.exports = composePlugins(withNx(), (config, { options, context }) => {
  // Optimize for minimal bundle size and tree-shaking
  config.optimization = {
    ...config.optimization,
    usedExports: true,        // Enable tree-shaking
    sideEffects: false,       // Assume no side effects for better tree-shaking
    minimize: true,           // Minify output
    concatenateModules: true, // Scope hoisting for smaller bundles
    providedExports: true,    // Determine exports for each module
    innerGraph: true,         // Analyze dependencies within modules
  };

  // Configure externals for Node.js builds
  // These dependencies should not be bundled
  if (options.target === 'node') {
    config.externals = {
      '@nestjs/common': '@nestjs/common',
      '@nestjs/core': '@nestjs/core',
      '@nestjs/config': '@nestjs/config',
      'reflect-metadata': 'reflect-metadata',
      rxjs: 'rxjs',
    };
  }

  // Configure for browser builds
  if (options.target === 'web') {
    // React should be provided by the consuming application
    config.externals = {
      react: 'react',
      'react-dom': 'react-dom',
    };

    // Add fallbacks for Node.js modules that don't exist in browser
    config.resolve = {
      ...config.resolve,
      fallback: {
        zlib: false,
        util: false,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        buffer: false,
        http: false,
        https: false,
        url: false,
        querystring: false,
      },
    };
  }

  // Ensure proper module resolution for both environments
  config.resolve = {
    ...config.resolve,
    conditionNames: ['import', 'require', 'node', 'default'],
    mainFields: ['module', 'main'],
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  };

  return config;
});
