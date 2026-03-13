/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure webpack is used instead of turbopack
  webpack: (config) => {
    return config;
  },
};

module.exports = nextConfig;
