FROM node:18-alpine

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --omit=dev --silent

COPY . .

CMD [ "npm", "start" ]
