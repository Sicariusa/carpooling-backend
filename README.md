# Carpooling Backend

This is the backend implementation for a carpooling system, focusing on ride booking and management.

## Architecture

The system is built using a microservices architecture with the following services:

- **Ride Service**: Manages rides, including creation, searching, and status updates.
- **Booking Service**: Manages bookings, including creation, cancellation, and status updates.

## Technologies

- **NestJS**: Framework for building Node.js server-side applications
- **GraphQL**: API query language
- **Prisma**: ORM for database access
- **PostgreSQL**: Database
- **Kafka**: Message broker for inter-service communication
- **Docker**: Containerization
- **Fetch API**: For service-to-service communication (no external HTTP client libraries needed)

## Features

### Ride Booking & Management

- Passengers can search for rides either going to GIU or leaving from GIU
- Passengers can filter for Girls-Only rides
- Passengers can book a ride if seats are available
- Passengers can modify their destination after booking a ride
- Passengers can cancel their booking before a certain deadline
- Drivers are notified when a passenger books or cancels a ride
- Drivers can offer rides (from GIU to any destination or from any destination to GIU)
- Drivers can set a ride as Girls-Only
- Drivers can accept or reject booking requests from passengers
- Passengers and drivers can view their ride history

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js (for local development)

### Running the Application

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/carpooling-backend.git
   cd carpooling-backend
   ```

2. Start the services using Docker Compose:
   ```
   docker-compose up
   ```

3. The services will be available at:
   - Ride Service: http://localhost:3001
   - Booking Service: http://localhost:3002

### API Documentation

- Ride Service Swagger: http://localhost:3001/api
- Booking Service Swagger: http://localhost:3002/api
- Ride Service GraphQL Playground: http://localhost:3001/graphql
- Booking Service GraphQL Playground: http://localhost:3002/graphql

## Development

### Running Services Locally

1. Install dependencies:
   ```
   cd services/ride-service
   npm install
   cd ../booking-service
   npm install
   ```

2. Start the services:
   ```
   cd services/ride-service
   npm run start:dev
   cd ../booking-service
   npm run start:dev
   ```

### Database Migrations

1. Generate Prisma client:
   ```
   cd services/ride-service
   npx prisma generate
   cd ../booking-service
   npx prisma generate
   ```

2. Run migrations:
   ```
   cd services/ride-service
   npx prisma migrate dev
   cd ../booking-service
   npx prisma migrate dev
   ```

## Implementation Notes

### Service Communication

The services communicate with each other using HTTP requests via the built-in Fetch API. This approach:
- Eliminates the need for external HTTP client libraries like axios
- Uses modern JavaScript features available in Node.js
- Simplifies dependency management
