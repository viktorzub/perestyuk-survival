FROM node:22-alpine

WORKDIR /app
COPY server.js index.html manifest.json icon-180.png icon-512.png ./

ENV PORT=3000 DATA_DIR=/app/data
EXPOSE 3000
CMD ["node", "server.js"]
