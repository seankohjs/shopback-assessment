/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["typeorm", "sqlite3"],
  },
};

module.exports = nextConfig; 