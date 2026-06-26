# Production image for the API server (build context: repo root)
FROM node:20-alpine AS builder

# openapi-generator-cli (used by `npm run generate:api`) shells out to a JRE.
RUN apk add --no-cache openjdk17-jre-headless=17.0.19_p10-r0

WORKDIR /repo

# openapitools.json lives at the repo root; the codegen scripts reference it
# via a hardcoded `../openapitools.json`, so this nesting must be preserved.
COPY openapitools.json ./openapitools.json
COPY server/package*.json ./server/
RUN npm --prefix server ci

COPY server/ ./server/
RUN npm --prefix server run generate:api && npm --prefix server run build

FROM node:20-alpine

WORKDIR /app

COPY server/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /repo/server/dist ./dist
COPY server/migrations ./migrations
COPY server/docs ./docs

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

ENTRYPOINT ["node", "dist/api.js"]
