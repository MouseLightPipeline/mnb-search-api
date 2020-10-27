FROM node:12.19

WORKDIR /app

COPY dist .

RUN yarn global add sequelize-cli@5

RUN yarn install --production=true

CMD ["./docker-entry.sh"]

EXPOSE  5000
