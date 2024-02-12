import handler from './handler'

Bun.serve({
  fetch(req) {
    return handler(req)
  },
  port: 8080,
});
