FROM node:20-alpine

# Prisma requires OpenSSL on Alpine. Chromium + its runtime deps are for
# Puppeteer — PDF generation renders the real template HTML/CSS through it
# instead of drawing plain text, so we use the system Chromium package
# rather than puppeteer's bundled (glibc-only, won't run on Alpine) download.
RUN apk add --no-cache openssl chromium nss freetype harfbuzz ca-certificates ttf-freefont
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run prisma:generate
RUN npm run build

EXPOSE 4000

# migrate → start (run seed manually once: docker compose exec backend npx prisma db seed)
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/index.js"]
