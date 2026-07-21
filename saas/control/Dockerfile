# Control-Plane: nacktes PocketBase + Hooks/Migrationen (kein SPA-Build nötig).
FROM alpine:3.20

ARG PB_VERSION=0.39.4

RUN apk add --no-cache ca-certificates unzip \
    && wget -q "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" -O /tmp/pb.zip \
    && unzip -q /tmp/pb.zip -d /pb \
    && rm /tmp/pb.zip \
    && apk del unzip

COPY pb_migrations /pb/pb_migrations
COPY pb_hooks /pb/pb_hooks
COPY pb_public /pb/pb_public
COPY docker-entrypoint.sh /pb/docker-entrypoint.sh
RUN chmod +x /pb/docker-entrypoint.sh

EXPOSE 8090
VOLUME ["/pb/pb_data"]
ENTRYPOINT ["/pb/docker-entrypoint.sh"]
