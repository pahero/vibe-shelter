import * as Sentry from "@sentry/nestjs";
import { trace } from "@opentelemetry/api";

Sentry.init({
  dsn:
    process.env.SENTRY_DSN ??
    "https://pPpKebiQrHtGAmFfemWX7U1F@s2827009.us-west-2a.betterstackdata.com/2827009",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
  beforeSend(event) {
    const span = trace.getActiveSpan();
    if (span) {
      const spanContext = span.spanContext();
      if (spanContext.traceId !== "00000000000000000000000000000000") {
        event.contexts = {
          ...event.contexts,
          trace: {
            trace_id: spanContext.traceId,
            span_id: spanContext.spanId,
          },
        };
      }
    }
    return event;
  },
});
