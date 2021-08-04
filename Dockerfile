FROM node:latest

COPY . /src

WORKDIR /src

RUN npm install --production

EXPOSE 3000
EXPOSE 8856
#For the TCP Server

CMD npm start