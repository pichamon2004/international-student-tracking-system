FROM node:20-alpine

# Prisma requires OpenSSL on Alpine
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run prisma:generate
RUN npm run build

EXPOSE 4000

# migrate → start (run seed manually once: docker compose exec backend npx prisma db seed)
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/index.js"]
