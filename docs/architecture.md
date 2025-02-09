# DmarcAnalyzer Architecture

NOTE: This document describes the future architecture, not necessarily the current one.
The project is still under development and the architecture is subject to change.

## System Overview

DmarcAnalyzer is designed to receive, analyze, and report on DMARC (Domain-based Message Authentication, Reporting, and Conformance) records and reports. The system consists of three main components: a backend service, a frontend application, and a PostgreSQL database.

## Core Components

### 1. Backend Service (Deno)

The backend service is built using Deno and is structured into several key modules:

#### SMTP Server
- Listens on port 25 for incoming DMARC reports
- Handles email parsing and initial validation
- Queues reports for processing

#### Analysis Engine
- DMARC Record Analyzer: Validates and interprets DMARC policies
- SPF Record Analyzer: Checks SPF record compliance
- DKIM Record Analyzer: Verifies DKIM signatures
- Report Processors: Handles aggregate and failure reports

#### API Layer
- RESTful endpoints for frontend communication
- WebSocket support for real-time updates
- Authentication and authorization

### 2. Frontend Application (SvelteKit)

The frontend is a modern SPA built with SvelteKit, featuring:

#### Core Features
- Dashboard for DMARC analytics
- Interactive report viewing
- Real-time updates via WebSocket
- Responsive design with PicoCSS

#### Component Architecture
- Modular component structure
- Server-side rendering for initial load
- Client-side navigation
- Chart.js integration for visualizations

### 3. Database Layer (PostgreSQL)

PostgreSQL serves as the primary data store, managing:
- DMARC reports and analysis results
- User data and preferences
- Historical trends and statistics

## Data Flow

1. **Report Reception**
   ```
   Email Server -> SMTP Server -> Processing Queue -> Analysis Engine -> Database
   ```

2. **User Interaction**
   ```
   User -> Frontend -> API Layer -> Database -> Frontend -> User
   ```

3. **Analysis Pipeline**
   ```
   Raw Report -> Parser -> Analyzer -> Results -> Notification Service
   ```

## Security Architecture

### Authentication
- JWT-based authentication
- Role-based access control
- API key management for automated integrations

### Data Protection
- TLS for all connections
- Encrypted storage for sensitive data
- Rate limiting on API endpoints

## Deployment Architecture

The system is containerized using Docker with three main services:

### Container Structure

The application is deployed using three main containers:

1. **Backend Container**
   - Deno-based SMTP and API server
   - Ports: 25 (SMTP), 3000 (API)
   - Built using multi-stage Dockerfile for optimization
   - Runs as non-root user for security

2. **Frontend Container**
   - SvelteKit application
   - Port: 5173
   - Built using Node.js Alpine for minimal size
   - Static file serving

3. **Database Container**
   - PostgreSQL 15 Alpine
   - Port: 5432
   - Persistent volume storage
   - Configured for DMARC analysis workload

All services are connected through a dedicated Docker network (dmarc-network) and use volume persistence for the database.

### Scaling Considerations
- Horizontal scaling of backend services
- Load balancing for SMTP and HTTP traffic
- Database replication for high availability

## Monitoring and Logging

- Health checks for all services
- Metrics collection for performance monitoring
- Structured logging for debugging
- Alert system for critical issues

## Future Considerations

1. **Scalability Improvements**
   - Message queue implementation
   - Caching layer
   - Read replicas for database

2. **Feature Extensions**
   - Machine learning for threat detection
   - Advanced reporting capabilities
   - API integrations with security tools

3. **Performance Optimizations**
   - Edge caching
   - Report aggregation optimization
   - Batch processing improvements
