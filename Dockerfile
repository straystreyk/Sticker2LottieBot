# Используем Node.js 22 LTS на базе Alpine
FROM node:22-alpine

WORKDIR /app

COPY package.json .compose.env ./

RUN npm install

COPY . .

RUN npm run build

CMD ["node", "dist/index.js"]
