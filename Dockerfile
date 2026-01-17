# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json ./
COPY prisma ./prisma

RUN npm install --legacy-peer-deps

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Migration runner (full node_modules for Prisma CLI)
FROM node:20-alpine AS migrator
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY prisma ./prisma

# This stage has everything needed to run migrations

# Stage 4: Runner (minimal production image)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy only what's needed to run
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create uploads directory
RUN mkdir -p /app/public/uploads/thumbnails && \
    chown -R nextjs:nodejs /app/public/uploads

USER nextjs

EXPOSE 4144

ENV PORT=4144
ENV HOSTNAME="0.0.0.0"

# Just start the app - migrations should be run separately
CMD ["node", "server.js"]