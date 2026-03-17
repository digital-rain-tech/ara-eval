FROM node:20-alpine AS base

# Install dependencies for better-sqlite3 native compilation
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy shared data files (read by the web app at runtime)
COPY shared/ ./shared/
COPY prompts/ ./prompts/
COPY scenarios/ ./scenarios/

# Copy web app
COPY web/package.json web/package-lock.json ./web/

WORKDIR /app/web
RUN npm ci

COPY web/ .

# Build Next.js
RUN npm run build

# Production image
FROM node:20-alpine AS runner

RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy shared data
COPY --from=base /app/shared/ ./shared/
COPY --from=base /app/prompts/ ./prompts/
COPY --from=base /app/scenarios/ ./scenarios/

# Copy built web app
COPY --from=base /app/web/package.json /app/web/package-lock.json ./web/
COPY --from=base /app/web/.next ./web/.next
COPY --from=base /app/web/node_modules ./web/node_modules
COPY --from=base /app/web/next.config.ts ./web/next.config.ts
COPY --from=base /app/web/postcss.config.mjs ./web/postcss.config.mjs

# Create results directory for SQLite persistence
RUN mkdir -p /app/results

WORKDIR /app/web

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
