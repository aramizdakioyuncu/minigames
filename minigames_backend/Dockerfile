FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --chown=node:node src ./src
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4100
USER node
EXPOSE 4100
CMD ["node", "src/server.js"]
