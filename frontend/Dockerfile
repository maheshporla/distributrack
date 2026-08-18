# ============================================================================
# DistribuTrack frontend — multi-stage Docker build
# Stage 1: build the Vite app. Stage 2: serve static files with nginx,
# proxying /api to the backend service.
# ============================================================================
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
