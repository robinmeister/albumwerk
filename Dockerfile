# ---------------------------------------------------------------------------
# Stage 1: build the SPA
#
# glibc, nicht Alpine: @stylexswc/rs-compiler veröffentlicht für musl nur ein
# x64-Binary (kein linux-arm64-musl), der Build bräche auf einem arm64-Host mit
# "Cannot find native binding" ab.
# ---------------------------------------------------------------------------
FROM node:20-bookworm-slim AS build

ARG APP_VERSION=dev

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.node.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src
# vite.config.ts bakes APP_VERSION into the bundle for support/error reports
RUN APP_VERSION="${APP_VERSION}" npm run build

# ---------------------------------------------------------------------------
# Stage 2: PocketBase serves API + SPA (pb_public) in one container
# ---------------------------------------------------------------------------
FROM alpine:3.20

ARG PB_VERSION=0.39.4
ARG APP_VERSION=dev
# Von BuildKit gesetzt (amd64/arm64); beim klassischen Builder leer, dann
# entscheidet uname -m über das PocketBase-Binary.
ARG TARGETARCH

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
    && case "${TARGETARCH:-$(uname -m)}" in \
         amd64|x86_64)  PB_ARCH=amd64 ;; \
         arm64|aarch64) PB_ARCH=arm64 ;; \
         *) echo "PocketBase: nicht unterstützte Architektur '${TARGETARCH:-$(uname -m)}'" >&2; exit 1 ;; \
       esac \
    && wget -q "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${PB_ARCH}.zip" -O /tmp/pb.zip \
    && unzip -q /tmp/pb.zip -d /pb \
    && rm /tmp/pb.zip \
    && apk del unzip

COPY pb_migrations /pb/pb_migrations
COPY pb_hooks /pb/pb_hooks
COPY --from=build /app/dist /pb/pb_public
COPY docker-entrypoint.sh /pb/docker-entrypoint.sh
RUN chmod +x /pb/docker-entrypoint.sh

# read by pb_hooks/lib/supportlib.js when forwarding a ticket to the vendor
ENV APP_VERSION=${APP_VERSION}

# Previews are rendered by several workers in parallel (pb_hooks/previews.pb.js),
# so each `magick` should stay on one core — OpenMP oversubscription cost ~15 %
# in measurements (8 images / 4 parallel / 4 cores: 4.1 s -> 3.5 s).
ENV MAGICK_THREAD_LIMIT=1

EXPOSE 8090

# pb_data holds the database and all uploaded files — mount it as a volume!
VOLUME ["/pb/pb_data"]

ENTRYPOINT ["/pb/docker-entrypoint.sh"]
