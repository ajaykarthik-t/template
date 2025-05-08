/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    experimental: {
      // This is important to prevent static optimization of pages that use Firebase
      appDir: true,
    },
    // Specify that dashboard should not be statically optimized
    output: 'standalone',
  };
  
  export default nextConfig;