FROM node:latest AS BUILD_IMAGE


COPY ./package*.json /src/

WORKDIR /src
ARG mode="prod"

RUN if [ "${mode}" = "dev" ] ; then npm install ; else npm install --production ; fi

EXPOSE 3000
EXPOSE 8856
#For the TCP Server
COPY . /src
FROM node:17-alpine

CMD if [ "$mode" = "dev" ] ; then npm run debug ; else npm run start ; fi