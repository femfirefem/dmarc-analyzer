# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy frontend source code
COPY frontend/ .

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
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build

RUN chown -R pwuser:pwuser /app

USER pwuser

# Run Playwright tests
CMD ["npm", "run", "test:e2e"]

# Production stage
FROM denoland/deno:distroless-2.1.9

WORKDIR /app

# Copy build output from builder
COPY --from=builder /app/build ./build

# The distroless image runs as non-root by default
USER nonroot

# Expose port 5173 for web interface
EXPOSE 5173

# Run the server
ENV PORT=5173
CMD ["run", "--allow-net", "--allow-read", "--allow-env", "build/index.js"]
