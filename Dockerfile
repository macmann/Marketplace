# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=secret,id=proxy-ca,target=/tmp/proxy-ca.pem \
    if [ -f /tmp/proxy-ca.pem ]; then export NODE_EXTRA_CA_CERTS=/tmp/proxy-ca.pem; fi; \
    npm ci --no-audit --no-fund
FROM deps AS build
COPY . .
RUN npm run build
FROM base AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 UPLOAD_DIR=/app/uploads
RUN mkdir -p /app/uploads && chown node:node /app/uploads
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node","server.js"]
FROM deps AS tools
RUN mkdir -p /app/uploads && chown node:node /app/uploads
COPY --chown=node:node . .
ENV NODE_ENV=production
USER node
CMD ["npm","run","worker"]
