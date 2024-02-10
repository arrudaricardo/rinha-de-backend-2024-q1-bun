# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 as base
WORKDIR /usr/src/app

# install dependencies into temp directory
# this will cache them and speed up future builds
ENV NODE_ENV=production

FROM base AS install
RUN mkdir -p /temp/prod
COPY . /temp/prod/
RUN cd /temp/prod && bun run build


# copy production dependencies and source code into final image
FROM base AS release
COPY --from=install /temp/prod/main .

USER bun
ENTRYPOINT [ "./main" ]
