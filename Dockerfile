# ---------------------------------------------------------------------------
# Stage 1: build the SPA
# ---------------------------------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.node.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2: PocketBase serves API + SPA (pb_public) in one container
# ---------------------------------------------------------------------------
FROM alpine:3.20

ARG PB_VERSION=0.39.4
ARG APP_VERSION=dev

LABEL org.opencontainers.image.title="Albumwerk" \
      org.opencontainers.image.description="Albumwerk — self-hostbare Kundenalben & Bildverkauf für Fotografen. 0 % Kommission, DSGVO-freundlich" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.source="https://gitea.robinhm.de/robinmeister/kathis_platform" \
      org.opencontainers.image.licenses="PolyForm-Noncommercial-1.0.0"

RUN apk add --no-cache \
      ca-certificates \
      unzip \
      # preview/watermark generation (pb_hooks/lib/previewlib.js)
      imagemagick imagemagick-jpeg imagemagick-webp imagemagick-heic \
      ttf-dejavu fontconfig \
    && wget -q "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" -O /tmp/pb.zip \
    && unzip -q /tmp/pb.zip -d /pb \
    && rm /tmp/pb.zip \
    && apk del unzip

COPY pb_migrations /pb/pb_migrations
COPY pb_hooks /pb/pb_hooks
COPY --from=build /app/dist /pb/pb_public
COPY docker-entrypoint.sh /pb/docker-entrypoint.sh
RUN chmod +x /pb/docker-entrypoint.sh

EXPOSE 8090

# pb_data holds the database and all uploaded files — mount it as a volume!
VOLUME ["/pb/pb_data"]

ENTRYPOINT ["/pb/docker-entrypoint.sh"]
