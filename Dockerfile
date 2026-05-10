FROM node:22-slim
WORKDIR /app

# Copiar package files
COPY package.json package-lock.json* ./

# Instalar dependencias
RUN npm ci

# Copiar source code
COPY . .

# Inyectar DATABASE_URL en build time para que Next.js pueda conectar
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

# Build
RUN npm run build

# Expose port
EXPOSE 3000
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
CMD ["npm", "start"]