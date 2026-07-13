FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy application source code
COPY . .

# Expose Next.js port
EXPOSE 3000

# Build and start Next.js on container startup to capture runtime env variables
CMD ["sh", "-c", "npm run build && npm run start"]
