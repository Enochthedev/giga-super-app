# Search Service API Documentation

## Overview

The Search Service provides comprehensive search functionality across all
content types in the Giga platform. It supports universal search,
category-specific search, advanced filtering, autocomplete, and real-time
location-based queries.

## Base URL

- **Local Development**: `http://localhost:3007`
- **Production**: `https://your-search-service-domain.com`

## Authentication

Most endpoints support optional authentication. When authenticated, users may
receive personalized results and access to additional features.

### Authentication Header

```
Authorization: Bearer <jwt_token>
```

## Response Format

All API responses follow this consistent structure:

```json
{
  "success": boolean,
  "data": object | array,
  "error": {
    "code": string,
    "message": string,
    "details": any
  },
  "pagination": {
    "page": number,
    "limit": number,
    "total": number,
    "total_pages": number,
    "has_previous": boolean,
    "has_next": boolean
  },
  "metadata": {
    "timestamp": string,
    "request_id": string,
    "version": string,
    "execution_time_ms": number,
    "cached": boolean
  }
}
```

## Endpoints

### Health Checks

#### GET /api/v1/health

Basic health check for the service.

**Response:**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "search-service",
    "version": "1.0.0",
    "timestamp": "2024-01-10T10:00:00Z",
    "uptime": 3600
  }
}
```

#### GET /api/v1/health/detailed

Detailed health check including dependency status.

**Response:**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": {
      "status": "healthy",
      "uptime": 3600,
      "memory": {...},
      "version": "1.0.0"
    },
    "dependencies": {
      "cache": {
        "status": "healthy",
        "details": {...}
      },
      "database": {
        "status": "healthy",
        "details": {...}
      }
    }
  }
}
```

### Universal Search

#### GET /api/v1/search

Search across all categories with unified results.

**Query Parameters:**

- `q` (required): Search query string
- `category` (optional): Filter by category (`all`, `hotels`, `products`,
  `drivers`, `posts`, `users`)
- `location` (optional): Location filter
- `min_price` (optional): Minimum price filter
- `max_price` (optional): Maximum price filter
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20, max: 100)
- `sort` (optional): Sort by (`relevance`, `price`, `rating`, `created_at`,
  `distance`)
- `order` (optional): Sort order (`asc`, `desc`)

**Example Request:**

```
GET /api/v1/search?q=luxury&category=hotels&location=Lagos&min_price=100&max_price=500&page=1&limit=20
```

**Response:**

```json
{
  "success": true,
  "data": {
    "query": "luxury",
    "category": "hotels",
    "total_results": 150,
    "results": [
      {
        "id": "hotel_123",
        "type": "hotels",
        "title": "Luxury Hotel Lagos",
        "description": "5-star luxury hotel in Victoria Island",
        "image_url": "https://example.com/image.jpg",
        "price": 250,
        "currency": "NGN",
        "rating": 4.8,
        "location": "Lagos, Nigeria",
        "relevance_score": 0.95,
        "data": {...},
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-10T00:00:00Z"
      }
    ],
    "suggestions": ["luxury hotels", "luxury suites", "luxury resorts"]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8,
    "has_previous": false,
    "has_next": true
  }
}
```

### Hotel Search

#### GET /api/v1/search/hotels

Search hotels with advanced filters.

**Query Parameters:**

- `q` (optional): Search query
- `location` (optional): Location filter
- `min_price` (optional): Minimum price per night
- `max_price` (optional): Maximum price per night
- `star_rating` (optional): Minimum star rating (1-5)
- `amenities` (optional): Array of required amenities
- `check_in` (optional): Check-in date (ISO 8601)
- `check_out` (optional): Check-out date (ISO 8601)
- `guests` (optional): Number of guests
- `page`, `limit`, `sort`, `order`: Standard pagination and sorting

**Example Request:**

```
GET /api/v1/search/hotels?q=luxury&location=Lagos&min_price=100&max_price=500&star_rating=4&check_in=2024-02-01T00:00:00Z&check_out=2024-02-03T00:00:00Z&guests=2
```

#### GET /api/v1/search/hotels/popular

Get popular hotels.

**Query Parameters:**

- `location` (optional): Filter by location
- `limit` (optional): Maximum results (default: 10)

#### GET /api/v1/search/hotels/nearby

Find hotels near a location.

**Query Parameters:**

- `latitude` (required): Latitude coordinate
- `longitude` (required): Longitude coordinate
- `radius` (optional): Search radius in kilometers (default: 10)
- `limit` (optional): Maximum results (default: 20)

### Product Search

#### GET /api/v1/search/products

Search products with filters.

**Query Parameters:**

- `q` (optional): Search query
- `category` (optional): Product category
- `brand` (optional): Brand filter
- `condition` (optional): Product condition (`new`, `used`, `refurbished`)
- `min_price` (optional): Minimum price
- `max_price` (optional): Maximum price
- `in_stock` (optional): Only show in-stock products
- `page`, `limit`, `sort`, `order`: Standard pagination and sorting

**Example Request:**

```
GET /api/v1/search/products?q=smartphone&category=electronics&brand=Apple&condition=new&min_price=500&max_price=1500
```

#### GET /api/v1/search/products/categories

Get all product categories.

**Response:**

```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "name": "Electronics",
        "count": 1250,
        "slug": "electronics"
      }
    ],
    "total_count": 8
  }
}
```

#### GET /api/v1/search/products/trending

Get trending products.

**Query Parameters:**

- `category` (optional): Filter by category
- `limit` (optional): Maximum results (default: 10)

#### GET /api/v1/search/products/brands

Get product brands.

**Query Parameters:**

- `category` (optional): Filter by category
- `limit` (optional): Maximum results (default: 50)

### Driver Search

#### GET /api/v1/search/drivers

Search taxi drivers with location-based filtering.

**Query Parameters:**

- `q` (optional): Search query
- `latitude` (optional): Latitude coordinate
- `longitude` (optional): Longitude coordinate
- `radius` (optional): Search radius in kilometers (default: 10)
- `vehicle_type` (optional): Vehicle type filter
- `rating_min` (optional): Minimum rating (0-5)
- `available_only` (optional): Only show available drivers (default: true)
- `page`, `limit`, `sort`, `order`: Standard pagination and sorting

**Example Request:**

```
GET /api/v1/search/drivers?latitude=6.5244&longitude=3.3792&radius=5&vehicle_type=sedan&rating_min=4
```

#### GET /api/v1/search/drivers/nearby

Find drivers near a specific location.

**Query Parameters:**

- `latitude` (required): Latitude coordinate
- `longitude` (required): Longitude coordinate
- `radius` (optional): Search radius in kilometers (default: 5)
- `limit` (optional): Maximum results (default: 10)

**Response:**

```json
{
  "success": true,
  "data": {
    "drivers": [
      {
        "id": "driver_123",
        "type": "drivers",
        "title": "John Doe",
        "rating": 4.8,
        "distance": 1.2,
        "estimated_arrival_minutes": 3,
        "vehicle_info": {
          "type": "sedan",
          "model": "Toyota Camry",
          "license_plate": "ABC-123"
        },
        "data": {...}
      }
    ],
    "total_count": 15,
    "search_center": {
      "latitude": 6.5244,
      "longitude": 3.3792
    },
    "radius_km": 5
  }
}
```

#### GET /api/v1/search/drivers/vehicle-types

Get available vehicle types.

**Response:**

```json
{
  "success": true,
  "data": {
    "vehicle_types": [
      {
        "type": "sedan",
        "name": "Sedan",
        "capacity": 4,
        "description": "Comfortable 4-seater car",
        "base_fare": 500,
        "per_km_rate": 100
      }
    ],
    "total_count": 5
  }
}
```

#### POST /api/v1/search/drivers/estimate-fare

Estimate fare for a trip.

**Request Body:**

```json
{
  "pickup_latitude": 6.5244,
  "pickup_longitude": 3.3792,
  "destination_latitude": 6.4474,
  "destination_longitude": 3.3903,
  "vehicle_type": "sedan"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "pickup": {
      "latitude": 6.5244,
      "longitude": 3.3792
    },
    "destination": {
      "latitude": 6.4474,
      "longitude": 3.3903
    },
    "distance_km": 12.5,
    "estimated_time_minutes": 25,
    "vehicle_type": "sedan",
    "fare_estimate": {
      "base_fare": 500,
      "distance_fare": 1250,
      "total_fare": 1750,
      "currency": "NGN"
    }
  }
}
```

### Search Suggestions

#### GET /api/v1/search/suggestions

Get search suggestions for autocomplete.

**Query Parameters:**

- `q` (required): Partial query string (minimum 2 characters)
- `category` (optional): Filter by category (default: `all`)
- `limit` (optional): Maximum suggestions (default: 10, max: 20)

**Example Request:**

```
GET /api/v1/search/suggestions?q=lux&category=hotels&limit=10
```

**Response:**

```json
{
  "success": true,
  "data": {
    "query": "lux",
    "suggestions": [
      {
        "text": "luxury hotels",
        "type": "query",
        "category": "hotels"
      },
      {
        "text": "luxury suites",
        "type": "query",
        "category": "hotels"
      }
    ]
  }
}
```

### Admin Operations

#### DELETE /api/v1/search/cache

Clear search cache (admin only).

**Authentication:** Required (admin role)

**Query Parameters:**

- `pattern` (optional): Cache key pattern to clear (default: `search:*`)

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Cleared 150 cache entries",
    "pattern": "search:*",
    "cleared_count": 150
  }
}
```

#### GET /api/v1/search/stats

Get search service statistics (admin only).

**Authentication:** Required (admin role)

**Response:**

```json
{
  "success": true,
  "data": {
    "cache": {
      "total_keys": 1250,
      "search_keys": 800,
      "autocomplete_keys": 450,
      "memory_usage": "25.6 MB"
    },
    "service": {
      "uptime": 86400,
      "memory": {...},
      "version": "1.0.0"
    }
  }
}
```

## Error Codes

| Code                       | HTTP Status | Description                |
| -------------------------- | ----------- | -------------------------- |
| `VALIDATION_ERROR`         | 400         | Invalid request parameters |
| `AUTHENTICATION_REQUIRED`  | 401         | Authentication required    |
| `INVALID_TOKEN`            | 401         | Invalid or expired token   |
| `INSUFFICIENT_PERMISSIONS` | 403         | Insufficient permissions   |
| `ENDPOINT_NOT_FOUND`       | 404         | Endpoint not found         |
| `RATE_LIMIT_EXCEEDED`      | 429         | Rate limit exceeded        |
| `SEARCH_ERROR`             | 500         | Search operation failed    |
| `INTERNAL_SERVER_ERROR`    | 500         | Internal server error      |

## Rate Limiting

Rate limits are applied per user (authenticated) or IP address (anonymous):

- **Search endpoints**: 100 requests per 15 minutes
- **Suggestions endpoint**: 200 requests per 15 minutes
- **Driver nearby search**: 200 requests per 15 minutes (real-time)
- **Admin endpoints**: No rate limit (authenticated admin only)

Rate limit headers are included in responses:

- `X-RateLimit-Limit`: Request limit per window
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp

## Caching

The service implements intelligent caching with different TTL values:

- **General search results**: 5 minutes
- **Location-based searches**: 30 seconds
- **Autocomplete suggestions**: 10 minutes
- **Static data** (categories, vehicle types): 1 hour

Cache status is indicated in the response metadata with the `cached` field.

## Examples

### Search for luxury hotels in Lagos

```bash
curl "http://localhost:3007/api/v1/search/hotels?q=luxury&location=Lagos&min_price=100&max_price=500&star_rating=4"
```

### Find nearby drivers

```bash
curl "http://localhost:3007/api/v1/search/drivers/nearby?latitude=6.5244&longitude=3.3792&radius=5"
```

### Get autocomplete suggestions

```bash
curl "http://localhost:3007/api/v1/search/suggestions?q=lux&category=hotels"
```

### Estimate taxi fare

```bash
curl -X POST "http://localhost:3007/api/v1/search/drivers/estimate-fare" \
  -H "Content-Type: application/json" \
  -d '{
    "pickup_latitude": 6.5244,
    "pickup_longitude": 3.3792,
    "destination_latitude": 6.4474,
    "destination_longitude": 3.3903,
    "vehicle_type": "sedan"
  }'
```

## SDKs and Integration

### JavaScript/TypeScript

```typescript
import { SearchClient } from '@giga/search-client';

const client = new SearchClient({
  baseUrl: 'http://localhost:3007',
  apiKey: 'your-api-key', // optional
});

// Universal search
const results = await client.search({
  q: 'luxury hotels',
  category: 'hotels',
  location: 'Lagos',
});

// Hotel search
const hotels = await client.searchHotels({
  q: 'luxury',
  location: 'Lagos',
  minPrice: 100,
  maxPrice: 500,
});

// Driver search
const drivers = await client.findNearbyDrivers({
  latitude: 6.5244,
  longitude: 3.3792,
  radius: 5,
});
```

### Python

```python
from giga_search import SearchClient

client = SearchClient(
    base_url='http://localhost:3007',
    api_key='your-api-key'  # optional
)

# Universal search
results = client.search(
    q='luxury hotels',
    category='hotels',
    location='Lagos'
)

# Hotel search
hotels = client.search_hotels(
    q='luxury',
    location='Lagos',
    min_price=100,
    max_price=500
)
```

## Support

For API support and questions:

- Documentation: [API Documentation](./API_DOCUMENTATION.md)
- Issues: [GitHub Issues](https://github.com/your-org/search-service/issues)
- Email: api-support@giga.com
