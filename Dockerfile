FROM oven/bun:1.2-debian AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY prisma ./prisma
COPY scripts ./scripts
RUN bun install --frozen-lockfile

FROM oven/bun:1.2-debian AS builder
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=file:/app/data/custom.db
ENV DIRECT_URL=file:/app/data/custom.db

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p /app/data \
  && node scripts/pre-dev.js
RUN bunx next build

FROM oven/bun:1.2-debian AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV DATABASE_URL=file:/app/data/custom.db
ENV DIRECT_URL=file:/app/data/custom.db
ENV STORAGE_MODE=local
ENV UPLOAD_DIR=/app/data/uploads

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg curl \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /app/data/uploads

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./

EXPOSE 3000

CMD ["sh", "-c", "./node_modules/.bin/prisma db push --accept-data-loss --skip-generate && bun server.js"]
