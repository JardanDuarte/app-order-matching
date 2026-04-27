FROM node:24

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# necessário para hot reload funcionar no docker
ENV CHOKIDAR_USEPOLLING=true

CMD ["npm", "start"]