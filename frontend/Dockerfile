FROM node:26-alpine AS dependencies

WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM dependencies AS builder

WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ARG NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ENV NEXT_PUBLIC_RECAPTCHA_SITE_KEY=${NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
ARG SENTRY_ORG
ENV SENTRY_ORG=${SENTRY_ORG}
ARG SENTRY_PROJECT
ENV SENTRY_PROJECT=${SENTRY_PROJECT}
ARG SENTRY_URL
ENV SENTRY_URL=${SENTRY_URL}

COPY . .
RUN --mount=type=secret,id=better_stack_api_token \
  if [ -f /run/secrets/better_stack_api_token ]; then export SENTRY_AUTH_TOKEN="$(cat /run/secrets/better_stack_api_token)"; fi; \
  npm run build

FROM node:26-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=4001

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node

EXPOSE 4001

CMD ["node", "server.js"]
