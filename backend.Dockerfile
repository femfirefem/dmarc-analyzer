ARG DENO_VERSION=2.1.9

# Build stage
FROM denoland/deno:${DENO_VERSION} AS builder
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Copy source code
COPY package.json .
COPY package-lock.json .
COPY prisma/ prisma/
COPY backend/ backend/

WORKDIR /app/backend

# Install dependencies
RUN deno install

FROM builder AS test-base
ENV MOCK_DB=true

# Cache test dependencies
RUN deno cache src/**/*.test.ts

# Unit test stage
FROM test-base AS unit-test

# Run unit tests (excluding e2e-test files)
CMD ["test", "--allow-net", "--allow-sys", "--allow-env", "--allow-read", "--allow-ffi", "**/*.unit.test.*"]

# E2E test stage
FROM test-base AS e2e-test

# Run e2e tests only
CMD ["test", "--allow-net", "--allow-sys", "--allow-env", "--allow-read", "--allow-ffi", "**/*.e2e.test.*"]

FROM builder AS compile

# Cache build dependencies
RUN deno cache src/main.ts

# Compile the code
RUN deno compile --output /app/dmarc-analyzer --allow-net --allow-sys --allow-env --allow-read --allow-ffi src/main.ts

# Production stage
#FROM denoland/deno:distroless-${DENO_VERSION}
FROM gcr.io/distroless/cc
ENV DENO_DIR=/deno-dir/

WORKDIR /app

# Copy the source code and deno.lock from builder
# COPY --from=builder --chown=nonroot:nonroot /app/node_modules ./node_modules
# COPY --from=builder --chown=nonroot:nonroot /app/deno.json .
# COPY --from=builder --chown=nonroot:nonroot /app/deno.lock .
# COPY --from=builder --chown=nonroot:nonroot /app/package.json .
# COPY --from=builder --chown=nonroot:nonroot /app/package-lock.json .
COPY --from=compile --chown=nonroot:nonroot /app/dmarc-analyzer .

# The distroless image runs as non-root by default
USER nonroot

# Expose ports
EXPOSE 25 3000

# Run the server
# CMD ["run", "--cached-only", "--allow-net", "--allow-sys", "--allow-env", "--allow-read", "--allow-ffi", "src/main.ts"]
CMD ["./dmarc-analyzer"]