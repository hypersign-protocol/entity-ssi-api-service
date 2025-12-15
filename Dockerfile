FROM node:20.19.2
WORKDIR /usr/src/app

# Update and upgrade apt packages
RUN apt update && apt -y upgrade
RUN npm i -g npm

# Install FFMPEG (existing)
RUN apt-get install -y ffmpeg

# 🌟 NEW: Install essential Chromium dependencies
# These packages are needed to run a browser headless inside the container.
# This list is often needed for Puppeteer or similar tools.
RUN apt-get update && \
    apt-get install -y \
    chromium \
    libnss3 \
    libatk-bridge2.0-0 \
    libgconf-2-4 \
    libgbm-dev \
    libasound2 \
    libgtk-3-0 \
    libxshmfence-dev \
    libnspr4 \
    libdbus-glib-1-2 \
    fonts-noto-color-emoji \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# 🌟 MODIFIED: Set environment variable to skip Puppeteer's Chromium download
ENV PUPPETEER_SKIP_DOWNLOAD=true


COPY ./package.json .
RUN npx patch-package -y 

COPY ./tsconfig.json .

ENV NODE_OPTIONS="--openssl-legacy-provider   --max-old-space-size=4096"

RUN npm install
COPY . .
RUN npm run build
CMD ["npm","run","start:prod"]

