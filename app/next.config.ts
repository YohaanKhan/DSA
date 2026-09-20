import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module and must not be bundled into the server build.
  serverExternalPackages: ['better-sqlite3'],
  typedRoutes: true,
  // Default bottom-left overlaps the nav rail's collapse control.
  devIndicators: { position: 'bottom-right' },
};

export default nextConfig;
