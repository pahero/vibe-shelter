import * as Sentry from "@sentry/nestjs";

Sentry.init({
  dsn:
    process.env.SENTRY_DSN ??
    "https://pPpKebiQrHtGAmFfemWX7U1F@s2827009.us-west-2a.betterstackdata.com/2827009",
});
