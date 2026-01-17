# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files AND prisma schema (needed for postinstall script)
COPY package.json ./
COPY prisma ./prisma

# Use npm install instead of npm ci since there's no package-lock.json
RUN npm install --legacy-peer-deps

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files INCLUDING prisma directory
COPY . .

# Generate Prisma Client (may already be done by postinstall, but ensure it's fresh)
RUN npx prisma generate

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma files for runtime migrations
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Create uploads directory with proper permissions
RUN mkdir -p /app/public/uploads/thumbnails && \
    chown -R nextjs:nodejs /app/public/uploads

USER nextjs

EXPOSE 4144

ENV PORT=4144
ENV HOSTNAME="0.0.0.0"

# Run migrations and start the app
CMD npx prisma migrate deploy && node server.js