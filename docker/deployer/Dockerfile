FROM node:20-alpine

# Install Docker CLI (to run docker compose commands on the host via the socket)
RUN apk add --no-cache docker-cli git curl

WORKDIR /app
COPY server.js .

EXPOSE 9000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:9000/health || exit 1

CMD ["node", "server.js"]
