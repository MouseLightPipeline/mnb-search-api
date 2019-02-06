#!/usr/bin/env bash

logName=$(date '+%Y-%m-%d_%H-%M-%S');

mkdir -p /var/log/mnb

./migrate.sh &> /var/log/mnb/${HOSTNAME}-${logName}.log

wait

export DEBUG=mnb*

node --max-old-space-size=8192 --optimize-for-size app.js >> /var/log/mnb/${HOSTNAME}-${logName}.log 2>&1
