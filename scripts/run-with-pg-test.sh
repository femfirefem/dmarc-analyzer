#!/bin/bash
SCRIPT_DIR=$(dirname "$0")

# Go to the root directory (since it has pg and prisma config)
pushd "$SCRIPT_DIR/.."

# Start the postgres database (should read the config from pg.config.js)
npx @databases/pg-test start

# Set DATABASE_URL environment variable
DATABASE_URL="postgres://dmarc-analyzer@localhost:65432/dmarc-analyzer"

# Run migrations
DATABASE_URL=$DATABASE_URL npx prisma db push

# Go back to the original directory before running the command
popd

# Run the command passed as an argument to this script
DATABASE_URL=$DATABASE_URL "$@"

# Stop postgres after the script exits
trap "npx @databases/pg-test stop" EXIT
