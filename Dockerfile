# --- Stage 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bait_ci
ENV DATABASE_URL=$DATABASE_URL

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source code
COPY . .

# --- Stage 2: Runtime ---
FROM node:20-alpine

WORKDIR /app

# Non-root user for security
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
#USER nextjs

# Copy only what is needed from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
# Required by Prisma CLI (migrate deploy) at runtime to resolve DATABASE_URL
COPY --from=builder /app/prisma.config.ts ./

# Ensure production environment
ENV NODE_ENV=production
ENV PORT=3007

EXPOSE 3007

# Run migrations and start app
# Using a shell to allow multiple commands
CMD ["npm", "start"]
