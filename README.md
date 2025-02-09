# DmarcAnalyzer

## Overview

DmarcAnalyzer is a tool that analyzes DMARC records and provides a report on the results.

## Features

- Analyze DMARC records
- Analyze SPF records
- Analyze DKIM records
- SMTP server to receive DMARC reports
- Analyze DMARC aggregate reports
- Analyze DMARC failure reports
- Store results in a database
- Email results to a list of email addresses
- Trend analysis of DMARC results
- Email trend changes to a list of email addresses
- Graphical representation of DMARC results
- Web interface to view DMARC results

## Technologies Used

- Deno (smtp server and web server  )
- SQLite (database)
- SvelteKit (web interface)
- PicoCSS (styling)
- Chart.js (graphical representation)

## Requirements

- Deno
- Node.js
- npm

## Installation

1. Clone the repository
2. Run `npm install`

## Development Servers

1. Run `npm run dev` to start the development servers
2. Open the web interface at `http://localhost:5173`
3. SMTP server will be running on port 52525
4. Web API server will be running on port 3000

## Docker Containers

1. Run `npm run docker:build` to build the docker images
2. Run `npm run docker:up` to start the docker containers
3. Open the web interface at `http://localhost:5173`
4. SMTP server will be running on port 25
5. Web API server will be running on port 3000
6. PostgreSQL database will be running on port 5432

## Contributing

1. Fork the repository
2. Create a new branch
3. Make your changes and commit them
4. Push your changes to your fork
5. Create a pull request

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Contact

For more information, please contact me at @Sense545.
