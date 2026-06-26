# Production image for the frontend SPA (build context: repo root)
FROM node:20-alpine AS builder

# openapi-generator-cli (used by `npm run generate:api`) shells out to a JRE.
RUN apk add --no-cache openjdk17-jre-headless=17.0.19_p10-r0

WORKDIR /repo

# openapitools.json lives at the repo root and the codegen input spec is
# server/docs/openapi.yaml; the codegen scripts reference both via hardcoded
# `../` relative paths, so this nesting must be preserved.
COPY openapitools.json ./openapitools.json
COPY server/docs ./server/docs
COPY frontend/package*.json ./frontend/
RUN npm --prefix frontend ci

COPY frontend/ ./frontend/
RUN npm --prefix frontend run generate:api && npm --prefix frontend run build

FROM nginx:1.27-alpine

RUN apk add --no-cache gettext=0.22.5-r0

COPY --from=builder /repo/frontend/dist /usr/share/nginx/html
COPY docker/frontend/config.js.template /usr/share/nginx/html/config.js.template
COPY docker/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/frontend/render-config.sh /docker-entrypoint.d/20-render-config.sh
RUN chmod +x /docker-entrypoint.d/20-render-config.sh

ENV API_BASE_URL=http://localhost:3000/api

EXPOSE 80
