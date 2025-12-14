# Auth Service Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy shared package first
COPY shared ./shared
WORKDIR /app/shared
RUN npm install && npm run build

# Copy auth service
WORKDIR /app/auth-service
COPY auth-service/package*.json ./
RUN npm install
COPY auth-service ./
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy shared dist
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/shared/package.json ./shared/

# Copy auth service
COPY --from=builder /app/auth-service/dist ./dist
COPY --from=builder /app/auth-service/node_modules ./node_modules
COPY --from=builder /app/auth-service/package.json ./

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/index.js"]
