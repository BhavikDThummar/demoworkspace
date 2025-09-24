import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { Logger } from '@nestjs/common';

export interface SSLOptions {
  key: Buffer;
  cert: Buffer;
}

export function loadSSLCertificates(): SSLOptions | null {
  const logger = new Logger('SSLConfig');

  // Define possible certificate paths (in order of preference)
  const certPaths = [
    // Production build (certificates copied to dist/assets/certs)
    {
      key: join(__dirname, 'assets/certs/key.pem'),
      cert: join(__dirname, 'assets/certs/cert.pem'),
      description: 'Production build path',
    },
    // Development mode (relative to src/assets/certs)
    {
      key: join(__dirname, 'assets/certs/key.pem'),
      cert: join(__dirname, 'assets/certs/cert.pem'),
      description: 'Development path',
    },
    // Workspace root fallback (original location)
    {
      key: join(process.cwd(), 'apps/bomdemoapiv2/certs/key.pem'),
      cert: join(process.cwd(), 'apps/bomdemoapiv2/certs/cert.pem'),
      description: 'Workspace root path',
    },
  ];

  for (const paths of certPaths) {
    try {
      // Check if both files exist before attempting to read
      if (existsSync(paths.key) && existsSync(paths.cert)) {
        const sslOptions = {
          key: readFileSync(paths.key),
          cert: readFileSync(paths.cert),
        };

        logger.log(
          `🔒 SSL certificates loaded successfully from ${paths.description}: ${paths.key}`,
        );
        return sslOptions;
      }
    } catch (error) {
      logger.warn(
        `⚠️  Failed to load certificates from ${paths.description}: ${(error as Error).message}`,
      );
    }
  }

  logger.error('❌ No valid SSL certificates found in any of the expected locations');
  return null;
}
