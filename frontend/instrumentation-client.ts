import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://pPpKebiQrHtGAmFfemWX7U1F@s2827009.us-west-2a.betterstackdata.com/2827009",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
  tracePropagationTargets: [
    /^\//,
    ...(process.env.NEXT_PUBLIC_API_URL
      ? [process.env.NEXT_PUBLIC_API_URL]
      : ["http://localhost:4000"]),
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
