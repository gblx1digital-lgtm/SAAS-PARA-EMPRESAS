FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY . .
# Contatos e configurações ficam no volume persistente /data
ENV DATA_DIR=/data PORT=3000
RUN mkdir -p /data
EXPOSE 3000
CMD ["node", "server.js"]
