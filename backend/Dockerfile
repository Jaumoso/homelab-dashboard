FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
# COPY server.js /app


EXPOSE 3000
CMD ["node", "server.js"]