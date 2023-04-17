############
# node #
############
FROM node:17-alpine as node

RUN apk add --no-cache --upgrade --virtual .persistent-deps \
        curl \
        openssl \
        # for node-sass module
        make \
        gcc \
        g++ \
        python2 \
        py-pip \
    # Install node packages
    && npm install --silent --save-dev -g \
        typescript

# Set up the application directory
WORKDIR /app

ENTRYPOINT []
CMD ["npm", "-v"]

############
# node-dev #
############
FROM node as node-dev

VOLUME ["/app"]
