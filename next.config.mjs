// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add this 'images' configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**',
      },
      // You could add other image hosts here if needed, e.g.:
      // {
      //   protocol: 'https',
      //   hostname: 'upload.wikimedia.org',
      //   port: '',
      //   pathname: '/**',
      // },
      // {
      //   protocol: 'https',
      //   hostname: 'example.com',
      //   port: '',
      //   pathname: '/my-images/**',
      // },
    ],
  },
  // Existing 'content' array for Tailwind configuration (ensure it's still here)
  webpack: (config, { isServer }) => {
    // Add any necessary webpack configurations here if they exist
    return config;
  },
};

// Export the config object
export default nextConfig;
