/** @type {import('next').NextConfig} */

/**
 * Baseline security headers for every response. frame-ancestors 'none' (plus
 * the legacy X-Frame-Options for older browsers) stops the app — including the
 * login page — being embedded and clickjacked. A full script-src CSP is not set
 * here because Next.js inline runtime scripts would need per-request nonces;
 * revisit if/when a nonce pipeline is added.
 */
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["mongodb", "pino", "nodemailer", "bcryptjs"],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

module.exports = nextConfig;
