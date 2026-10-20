# Minimal, pinned, dependency-free image for oblique.cards.
FROM node:22-alpine

WORKDIR /app

# No dependencies to install; copy the app and its assets.
COPY package.json server.js index.html cards.txt og.png robots.txt ./
COPY favicon.ico favicon.svg favicon-32.png apple-touch-icon.png icon-192.png icon-512.png ./
COPY kit/brand-tokens.css ./kit/

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Basic container healthcheck hitting the app's own endpoint.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1

CMD ["node", "server.js"]
