# Dockerfile for Backend Starter Kit
# Follows: Multi-stage build for optimized image size

# Stage 1: Dependencies
FROM node:18-alpine AS deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json package-lock.json* yarn.lock* ./

RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    else npm install; fi


# Stage 2: Builder
FROM node:18-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Run tests (optional, can be skipped for faster builds)
# RUN npm test

ENV NODE_ENV=production

RUN npm run lint || true


# Stage 3: Production
FROM node:18-alpine AS production

RUN apk add --no-cache dumb-init

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]


# Stage 4: Development
FROM node:18-alpine AS development

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
