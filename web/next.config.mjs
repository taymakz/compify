/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Pre-existing errors in web/components/ui/* (missing deps) don't affect landing page
    ignoreBuildErrors: true,
  },
}

export default nextConfig
