FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY . .
USER node

EXPOSE 4000

CMD ["node", "server.js"]
