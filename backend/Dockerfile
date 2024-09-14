FROM node:21-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY server.js /app

EXPOSE 3000
CMD ["node", "server.js"]