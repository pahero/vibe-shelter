import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://pPpKebiQrHtGAmFfemWX7U1F@s2827009.us-west-2a.betterstackdata.com/2827009",
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
