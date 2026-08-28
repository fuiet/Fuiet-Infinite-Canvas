FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates ffmpeg imagemagick \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

ENV NODE_ENV=production \
    CANVAS_RUNTIME=web \
    HOST=0.0.0.0 \
    PORT=8080 \
    CANVAS_DATA_DIR=/data \
    FFMPEG_PATH=/usr/bin/ffmpeg \
    FFPROBE_PATH=/usr/bin/ffprobe \
    MAGICK_PATH=/usr/bin/convert

VOLUME ["/data"]
EXPOSE 8080

CMD ["node", "web-start.cjs"]
