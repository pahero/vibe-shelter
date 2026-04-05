export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: process.env.DATABASE_URL,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL,
  sessionCookieName: process.env.SESSION_COOKIE_NAME || 'shelter_session',
  sessionSecret: process.env.SESSION_SECRET,
  sessionTtlHours: parseInt(process.env.SESSION_TTL_HOURS ?? '168', 10),
  sessionTtlMs: parseInt(process.env.SESSION_TTL_HOURS ?? '168', 10) * 60 * 60 * 1000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
  allowedGoogleDomain: process.env.ALLOWED_GOOGLE_DOMAIN,
});
