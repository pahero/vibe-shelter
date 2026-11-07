FROM node:26-alpine AS dependencies

WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM dependencies AS builder

COPY . .
ARG SENTRY_ORG
ENV SENTRY_ORG=${SENTRY_ORG}
ARG SENTRY_PROJECT
ENV SENTRY_PROJECT=${SENTRY_PROJECT}
ARG SENTRY_URL
ENV SENTRY_URL=${SENTRY_URL}
RUN DATABASE_URL=postgresql://unused:unused@localhost:5432/unused npx prisma generate
RUN npm run build
RUN --mount=type=secret,id=better_stack_api_token \
  if [ -f /run/secrets/better_stack_api_token ]; then \
    export SENTRY_AUTH_TOKEN="$(cat /run/secrets/better_stack_api_token)"; \
    npm run upload:sourcemaps; \
  fi

FROM node:26-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production PORT=4000

COPY package*.json prisma ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

USER node

EXPOSE 4000

CMD ["node", "dist/main"]
