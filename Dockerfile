FROM node:latest

COPY ./package*.json /src/

WORKDIR /src
ARG mode="prod"

RUN if [ "${mode}" = "dev" ] ; then npm install ; else npm install --production ; fi

EXPOSE 3000
EXPOSE 8856
#For the TCP Server
COPY . /src

CMD if [ "$mode" = "dev" ] ; then npm run debug ; else npm run start ; fi