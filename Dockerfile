# Stage 1: Build stage
FROM node:24-alpine AS builder

WORKDIR /app

RUN apk add --no-cache g++ make py3-pip py3-setuptools python3

RUN mkdir server

COPY server/package*.json ./server/
COPY server/server.js ./server/

WORKDIR /app/server
RUN npm install

# Stage 2: Runtime stage
FROM node:24-alpine

WORKDIR /app

RUN mkdir -p public server/db

COPY public/ ./public/
COPY server/server.js ./server/

COPY --from=builder /app/server/node_modules ./server/node_modules

EXPOSE 3000
CMD ["node", "server/server.js"]