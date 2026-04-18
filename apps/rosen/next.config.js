/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  outputFileTracingIncludes: {
    /**
     * Transfer the 'configs' directory to the production build to ensure
     * the 'tokensMap.json' file is accessible in the production environment.
     */
    '/': ['./configs/*'],
  },
  serverExternalPackages: [
    'ergo-lib-wasm-nodejs',
    '@emurgo/cardano-serialization-lib-nodejs',
    'typeorm',
  ],
  async headers() {
    return [
      {
        source: '/(.*?)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
    ];
  },
  webpack: function (config, options) {
    /**
     * This configuration should be applied as recommended in:
     * https://docs.reown.com/appkit/next/core/installation#extra-configuration
     */
    config.externals.push('pino-pretty', 'lokijs', 'encoding');

    config.experiments = {
      asyncWebAssembly: true,
      syncWebAssembly: true,
      layers: true,
    };
    if (!options.isServer) {
      config.resolve.fallback = {
        'fs': false,
        // Ignore the dependency imported internally by @reown/appkit since we don't use Solana
        '@solana/kit': false,
        // Ignore the dependency warning from @metamask/sdk
        '@react-native-async-storage/async-storage': false,
      };
    }
    config.resolve.alias['@solana/kit'] = false;

    return config;
  },
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

module.exports = nextConfig;

// Injected content via Sentry wizard below

const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig(module.exports, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Instrument Pages Router API routes and data fetching methods (default: true)
    autoInstrumentServerFunctions: true,

    // Instrument Next.js middleware (default: true)
    autoInstrumentMiddleware: true,

    // Instrument App Router components (default: true)
    autoInstrumentAppDirectory: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
