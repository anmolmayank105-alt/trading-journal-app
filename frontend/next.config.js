/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  
  // Output standalone for better deployment
  output: 'standalone',
  
  // Optimize for production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Reduce bundle size
  productionBrowserSourceMaps: false,
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    unoptimized: true,
  },
  
  // Environment variables with fallback
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
  },
  
  // Webpack optimizations
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Ignore specific warnings
    config.ignoreWarnings = [
      { module: /node_modules/ },
    ];
    
    return config;
  },
}

module.exports = nextConfig
