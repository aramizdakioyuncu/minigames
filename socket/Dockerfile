FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY . .
RUN mkdir -p /app/data && chown node:node /app/data
USER node

EXPOSE 5050

CMD ["node", "server.js"]
