/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // need this for document uploads
    },
  },
  images: {
    remotePatterns: [],
  },
  // Tesseract.js needs node-fetch shimmed in node runtime
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals ?? []), 'tesseract.js'];
    }
    return config;
  },
};

export default nextConfig;
