/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['bcrypt'],
  },
  eslint: {
    // Lint errors won't fail the production build; fix them separately
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Type errors also won't fail the build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
