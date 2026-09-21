FROM ghcr.io/pnpm/pnpm:12 AS base
RUN pnpm runtime set node 24 -g
COPY . /app
WORKDIR /app

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build

FROM nginx:alpine
WORKDIR /app
RUN mkdir -p /app/build/client
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/dist /usr/share/nginx/html
RUN sed -i 's/80;/8080;/' /etc/nginx/conf.d/default.conf
ENV NODE_ENV production
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"] 

#FROM base
#COPY --from=prod-deps /app/node_modules /app/node_modules
#COPY --from=build /app/dist /app/dist
#EXPOSE 8000
#CMD [ "pnpm", "start" ]
