FROM node:20.19.2

WORKDIR /usr/src/app

# ✅ Fix npm behavior (prevents your git dep crash)
ENV NPM_CONFIG_PREFER_OFFLINE=
ENV NPM_CONFIG_PREFER_ONLINE=
ENV NODE_OPTIONS="--openssl-legacy-provider --max-old-space-size=4096"
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Install system deps (no upgrade!)
RUN apt-get update && \
    apt-get install -y \
    ffmpeg \
    chromium \
    libnss3 \
    libatk-bridge2.0-0 \
    libgbm-dev \
    libasound2 \
    libgtk-3-0 \
    libxshmfence-dev \
    libnspr4 \
    libdbus-glib-1-2 \
    fonts-noto-color-emoji \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Copy package files first (for caching)
COPY package*.json ./

# ✅ Install deps (stable)
RUN npm install --legacy-peer-deps

# ✅ Apply patches AFTER install
RUN npx patch-package

# Copy rest of app
COPY . .

# Build
RUN npm run build

CMD ["npm","run","start:prod"]