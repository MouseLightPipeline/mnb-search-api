FROM node:16

WORKDIR /app

COPY dist .

RUN yarn global add sequelize-cli@5

RUN yarn install --production=true

CMD ["./docker-entry.sh"]

EXPOSE  5000
