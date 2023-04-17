#!/usr/bin/env bash

docker-compose stop
git add .
git stash
docker-compose up -d
