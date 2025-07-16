FROM node:22 AS build
WORKDIR /build/
COPY package* ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22 AS prod
WORKDIR /app
COPY --from=build /build .
CMD ["npm", "start"]
