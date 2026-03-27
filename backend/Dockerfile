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

# migrate → seed → start
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node dist/index.js"]
