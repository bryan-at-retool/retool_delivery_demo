# pull base image
FROM node:16.5-alpine3.11

# set our node environment, either development or production
# defaults to production, compose overrides this to development on build and run
ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

# default to port 3000 for node, and 9229 and 9230 (tests) for debug
ARG PORT=3000
ENV PORT $PORT
EXPOSE $PORT 9229 9230

# set database connection string
ARG DATABASE_URL
ARG DATABASE_URL_TEST
ENV DATABASE_URL $DATABASE_URL
ENV DATABASE_URL_TEST $DATABASE_URL_TEST

# install global packages
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH /home/node/.npm-global/bin:$PATH
RUN npm i npm@latest pnpm@latest knex@0.20.13 mocha@7.1.1 -g

# install dependencies first, in a different location for easier app bind mounting for local development
# due to default /opt permissions we have to create the dir with root and change perms
RUN mkdir /opt/node_app && chown node:node /opt/node_app
WORKDIR /opt/node_app
ENV PATH /opt/node_app/.bin:$PATH
USER node
COPY ./package.json ./pnpm-lock.yaml ./
RUN pnpm install

# check every 30s to ensure this service returns HTTP 200
HEALTHCHECK --interval=30s CMD node healthcheck.js



# copy in our source code last, as it changes the most
WORKDIR /opt/node_app/app
COPY ./ ./

# if you want to use npm start instead, then use `docker run --init in production`
# so that signals are passed properly. Note the code in index.js is needed to catch Docker signals
# using node here is still more graceful stopping then npm with --init afaik
# I still can't come up with a good production way to run with npm and graceful shutdown
CMD [ "node", "./bin/www" ]

