# Build Stage
FROM node:20 AS builder
WORKDIR /app
ENV DATABASE_URL="file:/app/prisma/data/dev.db"
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
# Generate Prisma Client
RUN npx prisma generate
# Build Next.js
RUN npm run build

# Production Stage
FROM node:20 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL="file:/app/prisma/data/dev.db"

# Install dependencies for production
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/traffic-collector.js ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./

EXPOSE 3000

CMD mkdir -p prisma/data && touch prisma/data/dev.db && npx prisma@5.22.0 db push --schema=prisma/schema.prisma --skip-generate --accept-data-loss && (node traffic-collector.js & npm run start)
