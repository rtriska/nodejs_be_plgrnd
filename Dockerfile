FROM node:22.14.0-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

# pnpm is not included in the base image
RUN npm install -g pnpm@10.5.2

RUN pnpm install

COPY . .

EXPOSE 3000

RUN pnpm build

ENTRYPOINT ["node", "./dist/index.js"]
