# One container serves both the website and the API on the same origin.
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm test && npm run build:live

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080 DB_PATH=/data/roadtrain.db
COPY package*.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY src/lib ./src/lib
COPY --from=build /app/dist ./dist
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 8080
HEALTHCHECK CMD wget -qO- http://localhost:8080/api/health || exit 1
CMD ["node", "--no-warnings", "server/index.js"]
