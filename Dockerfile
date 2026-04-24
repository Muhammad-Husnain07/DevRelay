FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 CMD wget -q http://localhost:3000/api/health -O- | grep -q "ok" || exit 1

CMD ["node", "src/app.js"]