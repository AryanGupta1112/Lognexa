FROM node:20-alpine
WORKDIR /app
COPY package.json /app/package.json
RUN npm install
COPY index.js /app/index.js
EXPOSE 3001
CMD ["node", "index.js"]
