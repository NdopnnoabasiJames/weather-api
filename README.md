# Weather Backend API

A production-ready NestJS backend service for weather data retrieval, geocoding, caching, and persistence. Integrates with OpenWeather API for current weather and air quality data, with PostgreSQL storage and Redis caching for performance.

## Architecture Overview

The application follows a layered architecture with the following flow:

```
Client → NestJS API → Redis Cache → OpenWeather API → PostgreSQL
```

**Request Flow:**
1. Client requests weather data for a location
2. Location is resolved to coordinates via OpenWeather Geocoding API (cached for 24 hours)
3. Weather and air quality data is fetched from OpenWeather API
4. Response is cached in Redis with 10-minute TTL
5. Weather request metadata is persisted to PostgreSQL with normalized location entities

**Caching Strategy:**
- Location geocoding results: 24-hour cache
- Current weather data: 10-minute cache
- Graceful fallback to stale cache if external API fails

**Data Integrity:**
- Historical weather requests are deduplicated (same location + date range returns cached result)
- Location entities are normalized by coordinates (unique constraint on latitude/longitude)
- Weather records are immutable except for user-added notes

**Configuration:**
- Joi schema validation ensures all required environment variables are present at startup
- Application fails fast if configuration is invalid

## Features

- Location resolution with geocoding and normalization
- Current weather data with air quality index (AQI 1-5 mapped to categories)
- Multi-layer Redis caching with TTL and fallback strategies
- PostgreSQL persistence with TypeORM entities
- Idempotent historical weather requests (prevents duplicate API calls)
- Immutable weather records (only note field is editable)
- CSV and JSON export functionality for weather request history
- Rate limiting (20 requests/minute per IP)
- Global request validation with class-validator
- Comprehensive Swagger documentation
- Centralized configuration with Joi validation
- Structured error handling and logging

## Tech Stack

**Framework:** NestJS
**Database:** PostgreSQL (Supabase)
**Cache:** Redis (Upstash REST API)
**ORM:** TypeORM
**Validation:** class-validator, Joi
**External API:** OpenWeather (Current Weather, Geocoding, Air Pollution)
**Documentation:** Swagger/OpenAPI
**Rate Limiting:** @nestjs/throttler

## API Documentation

Interactive API documentation is available via Swagger:

```
http://localhost:3000/api/docs
```

All endpoints, request/response schemas, and validation rules are documented.

## Setup Instructions

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL database (Supabase recommended)
- Redis instance (Upstash recommended)
- OpenWeather API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd weather-api
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file in the root directory:
```bash
cp .env.example .env
```

4. Configure environment variables (see below)

5. Run database migrations:
```bash
npm run migration:run
```

6. Start the application:
```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

The API will be available at `http://localhost:3000/api/v1`

## Environment Variables

Required environment variables:

```env
# Application
PORT=3000
NODE_ENV=development
API_PREFIX=api/v1

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# OpenWeather API
OPENWEATHER_API_KEY=your_api_key_here
OPENWEATHER_BASE_URL=https://api.openweathermap.org

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=20
```

**Note:** The application uses Joi validation and will fail to start if required variables are missing or invalid.

## Environment Validation

The application validates all environment variables at startup using Joi schemas. If validation fails, the application will not start and will display clear error messages indicating which variables are missing or invalid.

**Validated fields:**
- `PORT`: Must be a number
- `DATABASE_URL`: Required string
- `OPENWEATHER_API_KEY`: Required string
- `UPSTASH_REDIS_REST_URL`: Required valid URI
- `UPSTASH_REDIS_REST_TOKEN`: Required string
- `NODE_ENV`: Must be one of: development, production, test

This fail-fast approach prevents runtime errors from misconfiguration.

## Export Functionality

The API supports exporting all weather request history in two formats:

**JSON Export:**
```
GET /api/v1/weather/export?format=json
```
Returns structured JSON array with full location and weather data.

**CSV Export:**
```
GET /api/v1/weather/export?format=csv
```
Returns flattened CSV with headers, suitable for spreadsheet import. Automatically sets `Content-Disposition` header for download.

CSV includes: id, locationInput, locationName, state, country, latitude, longitude, startDate, endDate, avgTemperature, minTemperature, maxTemperature, note, createdAt

## API Endpoints

### Location
- `GET /api/v1/location/resolve?query={city}` - Resolve location to coordinates

### Weather
- `GET /api/v1/weather/current?location={city}` - Get current weather and air quality
- `POST /api/v1/weather` - Create weather request (current or historical)
- `GET /api/v1/weather` - List all weather requests
- `GET /api/v1/weather/export?format={json|csv}` - Export weather data
- `GET /api/v1/weather/:id` - Get specific weather request
- `PATCH /api/v1/weather/:id` - Update weather request note
- `DELETE /api/v1/weather/:id` - Delete weather request

## Deployment

### Recommended Stack
- **Hosting:** Render, Railway, or Heroku
- **Database:** Supabase (managed PostgreSQL)
- **Redis:** Upstash (serverless Redis)

### Deployment Steps

1. Set up PostgreSQL database on Supabase
2. Set up Redis instance on Upstash
3. Obtain OpenWeather API key
4. Configure environment variables in hosting platform
5. Deploy application
6. Run database migrations if needed

**Important:** Ensure `DATABASE_URL` includes SSL parameters for Supabase:
```
postgresql://user:pass@host:port/db?sslmode=require
```

## Design Decisions

### Separate Location Entity
Location data is normalized into a separate entity with a unique constraint on coordinates. This prevents duplicate location entries and allows efficient querying by geographic position.

### Immutable Weather Records
Weather data (temperature, raw API response, dates) is immutable after creation. Only the `note` field can be updated. This preserves data integrity and maintains an accurate historical record.

### Caching Strategy
Two-tier caching approach:
- Short-term (10 min) for volatile weather data
- Long-term (24 hours) for stable geocoding data
- Fallback to stale cache if external API fails (graceful degradation)

### Historical Request Reuse
Before making external API calls for historical data, the system checks if an identical request (same location + date range) exists. This prevents redundant API calls and reduces costs.

### Modular Configuration
Configuration is split into domain-specific files (app, database, redis, throttle, openweather) and loaded via NestJS ConfigModule. This improves maintainability and testability.

### Fail-Fast Validation
Using Joi to validate environment variables at startup prevents runtime errors and makes misconfigurations immediately visible during deployment.

## Project Structure

```
src/
├── common/           # Shared filters, middleware, utilities
├── config/           # Configuration files and validation
├── database/         # Database module and setup
├── entities/         # TypeORM entities (Location, WeatherRequest)
├── location/         # Location module (geocoding, caching)
│   ├── decorators/   # Swagger decorators
│   ├── dto/          # Data transfer objects
│   └── interfaces/   # Type definitions
├── redis/            # Redis module and client setup
├── weather/          # Weather module (API integration, CRUD)
│   ├── decorators/   # Swagger decorators
│   ├── dto/          # Data transfer objects
│   └── interfaces/   # Type definitions
└── main.ts           # Application entry point
```

## License

MIT
