/** @type {import('next').NextConfig} */
const backendApiUrl =
  process.env.BACKEND_API_URL || "http://localhost:3001/api";

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendApiUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;