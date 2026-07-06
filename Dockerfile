# ===== build stage =====
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ===== runtime stage =====
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PATH="/opt/lottie-venv/bin:${PATH}"

COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
  && apk add --no-cache python3 \
  && apk add --no-cache --virtual .lottie-build-deps py3-pip build-base python3-dev \
  && python3 -m venv /opt/lottie-venv \
  && /opt/lottie-venv/bin/pip install --no-cache-dir lottie \
  && apk del .lottie-build-deps \
  && npm cache clean --force

COPY --from=build /app/dist ./dist

RUN mkdir -p /data && chown -R node:node /app /data

USER node

CMD ["node", "dist/index.js"]
