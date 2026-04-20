FROM node:22-alpine AS deps
RUN apk add --no-cache python3 make g++
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY shared/ ./shared/
COPY prompts/ ./prompts/
COPY scenarios/ ./scenarios/
COPY web/ ./web/
COPY --from=deps /app/web/node_modules ./web/node_modules
WORKDIR /app/web
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/shared/ ./shared/
COPY --from=builder /app/prompts/ ./prompts/
COPY --from=builder /app/scenarios/ ./scenarios/
# Standalone server (includes node_modules for serverExternalPackages like better-sqlite3)
COPY --from=builder /app/web/.next/standalone/ ./web/
# Static assets must be copied separately with standalone output
COPY --from=builder /app/web/.next/static/ ./web/.next/static/

RUN mkdir -p /app/results

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

WORKDIR /app/web
EXPOSE 3000
CMD ["node", "server.js"]
