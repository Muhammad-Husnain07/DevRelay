# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

# Stage 2: Runner
FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

RUN adduser -S node -u 1001 -G node

USER node

COPY --from=builder --chown=node:node /app .

EXPOSE 3000

CMD ["node", "src/app.js"]