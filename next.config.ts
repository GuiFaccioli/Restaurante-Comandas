import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  allowedDevOrigins: ['localhost', '127.0.0.1'],
  experimental: {
    cpus: 1,
    serverActions: { bodySizeLimit: '4mb' },
    staticGenerationMaxConcurrency: 1,
    staticGenerationMinPagesPerWorker: 1,
  },
}

export default nextConfig
