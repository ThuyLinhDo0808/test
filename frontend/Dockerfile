FROM node:20.11.0-alpine

# Install required system dependencies for canvas and node-gyp
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    pkgconfig \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    pixman-dev \
<<<<<<< HEAD
  && ln -sf python3 /usr/bin/python

WORKDIR /app

# install deps with lockfile (deterministic)
COPY package.json yarn.lock ./

RUN yarn install 
=======
    && ln -sf python3 /usr/bin/python

WORKDIR /app

COPY package*.json ./

RUN rm -f package-lock.json

RUN yarn install --legacy-peer-deps
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079

COPY . .

ENV NEXT_DISABLE_ESLINT=true

RUN yarn build

EXPOSE 3000

CMD ["yarn", "start"]
