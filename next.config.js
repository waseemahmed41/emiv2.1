/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  
  // Disable source maps in production to hide implementation details
  productionBrowserSourceMaps: false,
  
  // Security and obfuscation settings
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Experimental features for better bundling
  experimental: {
    optimizePackageImports: ['framer-motion', 'recharts', 'three'],
    optimizeCss: false,
  },
  
  // Turbopack configuration (empty to avoid conflicts)
  turbopack: {},
  
  // Headers for additional security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; font-src 'self' https://cdnjs.cloudflare.com; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none';",
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // Webpack configuration for better obfuscation (only used when webpack is explicitly used)
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Add obfuscation for production builds
      config.optimization.minimize = true;
      
      // Remove source maps
      config.devtool = false;
      
      // Additional obfuscation settings
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
    }
    return config;
  },
};

export default nextConfig;
