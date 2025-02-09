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

## Installation

1. Clone the repository
2. Run `deno install`

## Usage

1. Run `deno run --allow-net --allow-read --allow-env src/full_server.ts`
2. Open the web interface at `http://localhost:5173`

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
