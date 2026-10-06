/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: false,
    outputFileTracingIncludes: {
      "/*": ["./node_modules/argon2/prebuilds/linux-x64/*.node"],
    },
  },
};

export default nextConfig;
