FROM node:22-alpine

WORKDIR /app

COPY package*.json ./


RUN npm install

COPY . .

#ENV key=value

EXPOSE 4000
EXPOSE 3004


CMD [ "npm", "start" ]
