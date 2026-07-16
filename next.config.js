/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["mongodb", "pino", "nodemailer", "bcryptjs"],
  },
};

module.exports = nextConfig;
