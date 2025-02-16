# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy source code
COPY package.json .
COPY package-lock.json .
COPY prisma/ prisma/
COPY frontend/ frontend/

WORKDIR /app/frontend

# Install dependencies
RUN npm install

# Build the application
RUN npm run build

# Unit test stage
FROM builder AS unit-test

# Run unit tests
CMD ["npm", "run", "test:unit", "--", "--run"]

# E2E test stage
FROM mcr.microsoft.com/playwright:v1.50.1-noble AS e2e-test

WORKDIR /app

# Install Playwright browsers and dependencies
RUN npx playwright install --with-deps

# Copy frontend code
COPY frontend/ .

# Copy build output from builder
COPY --from=builder /app/frontend/node_modules ./node_modules
COPY --from=builder /app/frontend/build ./build

RUN chown -R pwuser:pwuser /app

USER pwuser

# Run Playwright tests
CMD ["npm", "run", "test:e2e"]

# Production stage
FROM oven/bun:1.2-alpine

WORKDIR /app

# Copy build output from builder
COPY --from=builder /app/frontend/package.json ./package.json
COPY --from=builder /app/frontend/package-lock.json ./package-lock.json
COPY --from=builder /app/frontend/node_modules ./node_modules
COPY --from=builder /app/frontend/build ./build

# Expose port 5173 for web interface
EXPOSE 5173

# Run the server
ENV PORT=5173
CMD ["bun", "./build"]
