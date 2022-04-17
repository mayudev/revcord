FROM node:17-alpine AS build
RUN apk add --no-cache python3 g++ make
RUN ln -s /usr/bin/python3 /usr/bin/python
WORKDIR /build/
COPY package* ./
RUN npm install
COPY . .
RUN npm run build

FROM node:17-alpine AS prod
WORKDIR /app
COPY --from=build /build .
CMD ["npm", "start"]