import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    cpus: 1,
    serverActions: { bodySizeLimit: '4mb' },
    staticGenerationMaxConcurrency: 1,
    staticGenerationMinPagesPerWorker: 1,
  },
}

export default nextConfig
