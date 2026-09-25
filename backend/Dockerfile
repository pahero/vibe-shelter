FROM node:22-alpine AS dependencies

WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM dependencies AS builder

COPY . .
RUN DATABASE_URL=postgresql://unused:unused@localhost:5432/unused npx prisma generate
RUN npm run build

# This target intentionally retains the Prisma CLI for the one-shot migration
# service in compose.prod.yml.
FROM builder AS migration

ENV NODE_ENV=production
CMD ["npx", "prisma", "migrate", "deploy"]

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

USER node

EXPOSE 4000

CMD ["node", "dist/main"]
