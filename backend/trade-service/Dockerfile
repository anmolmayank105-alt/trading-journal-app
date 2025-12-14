# Trade Service Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy shared package first
COPY shared ./shared
WORKDIR /app/shared
RUN npm install && npm run build

# Copy trade service
WORKDIR /app/trade-service
COPY trade-service/package*.json ./
RUN npm install
COPY trade-service ./
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy shared dist
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/shared/package.json ./shared/

# Copy trade service
COPY --from=builder /app/trade-service/dist ./dist
COPY --from=builder /app/trade-service/node_modules ./node_modules
COPY --from=builder /app/trade-service/package.json ./

ENV NODE_ENV=production
ENV PORT=3003

EXPOSE 3003

CMD ["node", "dist/index.js"]
