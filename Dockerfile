FROM node:24-slim

WORKDIR /app

RUN mkdir -p public server/db

COPY public/ ./public/
COPY server/ ./server/

WORKDIR /app/server
RUN npm install

EXPOSE 3000
CMD ["node", "server.js"]