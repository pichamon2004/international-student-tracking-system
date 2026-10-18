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
# Deploy order (set -e: any failing step stops the container before the API starts):
#   1. backfill-request-events + pre-push-migrations — move data out of legacy columns before db push drops them
#   2. prisma db push                                 — create what Prisma knows about
#   3. post-push-db-objects                           — add custom SQL objects (CHECK constraints) Prisma can't express
#   4. verify-db-objects                              — prove those objects exist and the database enforces them
CMD ["sh", "-c", "set -e; npx ts-node --transpile-only prisma/backfill-request-events.ts; npx ts-node --transpile-only prisma/pre-push-migrations.ts; npx prisma db push --accept-data-loss; npx ts-node --transpile-only prisma/post-push-db-objects.ts; npx ts-node --transpile-only prisma/verify-db-objects.ts; node dist/index.js"]
