FROM node:20 AS build
WORKDIR /build/
COPY package* ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS prod
WORKDIR /app
COPY --from=build /build .
CMD ["npm", "start"]
