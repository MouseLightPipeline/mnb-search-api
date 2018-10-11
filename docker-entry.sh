#!/usr/bin/env bash

./migrate.sh

wait

export DEBUG=mnb*

node app.js
