#!/bin/bash
SCRIPT_DIR=$(dirname "$0")

# Go to the root directory (since it has pg and prisma config)
pushd "$SCRIPT_DIR/.."

# Start the postgres database (should read the config from pg.config.js)
docker compose -f docker-compose.dev.yml up -d

# Set DATABASE_URL environment variable
DATABASE_URL="postgres://dmarcanalyzer:development_only@localhost:55432/dmarcanalyzer"

# Go back to the original directory before running the command
popd

# Run the command passed as an argument to this script
DATABASE_URL=$DATABASE_URL "$@"

# Stop postgres after the script exits
trap "docker compose -f docker-compose.dev.yml down" EXIT
