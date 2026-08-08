import { ConfigFactory } from "@nestjs/config/dist/interfaces/config-factory.interface";

export function generateIntegrationTestConfig(
  databaseUrl: string,
  s3Endpoint: string,
  s3ApiKey: string,
  s3Secret: string,
  s3BucketName: string,
): ConfigFactory {
  return () => ({
    nodeEnv: 'development',
    port: 4000,
    databaseUrl: databaseUrl,
    s3: {
      endpoint: s3Endpoint,
      bucketName: s3BucketName,
      apiKey: s3ApiKey,
      secret: s3Secret,
    },
    googleClientId: 'non-essential-for-tests',
    googleClientSecret: 'non-essential-for-tests',
    googleCallbackUrl: 'non-essential-for-tests',
    sessionCookieName: 'shelter_session',
    sessionSecret: 'session-secret-for-tests',
    sessionTtlHours: 168,
    sessionTtlMs: 168 * 60 * 60 * 1000,
    frontendUrl: 'non-essential-for-tests',
    allowedGoogleDomain: 'non-essential-for-tests',
  });
}
