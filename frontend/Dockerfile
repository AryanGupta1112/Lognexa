FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* /app/
RUN npm install

ARG VITE_API_URL=/api
ARG VITE_SSE_URL=/api/stream/logs
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SSE_URL=$VITE_SSE_URL

COPY . /app
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
