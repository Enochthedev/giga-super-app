import { Client, TravelMode } from '@googlemaps/google-maps-services-js';
import winston from 'winston';

const client = new Client({});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  },
});

// Haversine formula for fallback distance calculation
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Fallback calculation using Haversine formula
 */
function fallbackCalculation(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
) {
  const distance_km = calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng);
  const duration_minutes = Math.ceil((distance_km / 25) * 60); // Assume 25 km/h average speed

  return {
    distance_km: Math.round(distance_km * 10) / 10,
    duration_minutes,
    distance_text: `${distance_km.toFixed(1)} km`,
    duration_text: `${duration_minutes} mins`,
    using_fallback: true,
  };
}

/**
 * Get distance and duration between two points using Google Maps Distance Matrix API
 * Falls back to Haversine formula if API key is not available or request fails
 */
export async function getDistanceAndDuration(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<{
  distance_km: number;
  duration_minutes: number;
  distance_text: string;
  duration_text: string;
  using_fallback: boolean;
}> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  // If no API key, use fallback immediately
  if (!apiKey) {
    logger.warn('Google Maps API key not configured, using fallback calculation');
    return fallbackCalculation(origin, destination);
  }

  try {
    const response = await client.distancematrix({
      params: {
        origins: [`${origin.lat},${origin.lng}`],
        destinations: [`${destination.lat},${destination.lng}`],
        mode: TravelMode.driving,
        departure_time: 'now',
        traffic_model: 'best_guess',
        key: apiKey,
      },
      timeout: 5000, // 5 second timeout
    });

    const element = response.data.rows[0]?.elements[0];

    if (!element || element.status !== 'OK') {
      logger.warn('Google Maps API returned non-OK status', { status: element?.status });
      return fallbackCalculation(origin, destination);
    }

    const distance_km = element.distance.value / 1000;
    const duration_seconds = element.duration_in_traffic?.value || element.duration.value;
    const duration_minutes = Math.ceil(duration_seconds / 60);

    logger.info('Google Maps API request successful', {
      distance_km,
      duration_minutes,
    });

    return {
      distance_km: Math.round(distance_km * 10) / 10,
      duration_minutes,
      distance_text: element.distance.text,
      duration_text: element.duration_in_traffic?.text || element.duration.text,
      using_fallback: false,
    };
  } catch (error) {
    logger.error('Google Maps API error, using fallback', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return fallbackCalculation(origin, destination);
  }
}

/**
 * Get directions between two points
 * Returns null if API key is not available or request fails
 */
export async function getDirections(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  alternatives = false
) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    logger.warn('Google Maps API key not configured, directions not available');
    return null;
  }

  try {
    const response = await client.directions({
      params: {
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        mode: TravelMode.driving,
        alternatives,
        departure_time: 'now',
        key: apiKey,
      },
      timeout: 5000,
    });

    if (response.data.status !== 'OK' || !response.data.routes.length) {
      logger.warn('Google Maps Directions API returned no routes');
      return null;
    }

    return response.data.routes;
  } catch (error) {
    logger.error('Google Maps Directions API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Geocode an address to coordinates
 * Returns null if API key is not available or request fails
 */
export async function geocodeAddress(address: string) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    logger.warn('Google Maps API key not configured, geocoding not available');
    return null;
  }

  try {
    const response = await client.geocode({
      params: {
        address,
        key: apiKey,
      },
      timeout: 5000,
    });

    if (response.data.status !== 'OK' || !response.data.results.length) {
      logger.warn('Google Maps Geocoding API returned no results');
      return null;
    }

    const result = response.data.results[0];
    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      formatted_address: result.formatted_address,
    };
  } catch (error) {
    logger.error('Google Maps Geocoding API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Reverse geocode coordinates to address
 * Returns null if API key is not available or request fails
 */
export async function reverseGeocode(lat: number, lng: number) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    logger.warn('Google Maps API key not configured, reverse geocoding not available');
    return null;
  }

  try {
    const response = await client.reverseGeocode({
      params: {
        latlng: `${lat},${lng}`,
        key: apiKey,
      },
      timeout: 5000,
    });

    if (response.data.status !== 'OK' || !response.data.results.length) {
      logger.warn('Google Maps Reverse Geocoding API returned no results');
      return null;
    }

    return response.data.results[0].formatted_address;
  } catch (error) {
    logger.error('Google Maps Reverse Geocoding API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Get place autocomplete suggestions
 * Returns empty array if API key is not available or request fails
 */
export async function placeAutocomplete(
  input: string,
  location?: { lat: number; lng: number },
  radius = 50000
) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    logger.warn('Google Maps API key not configured, autocomplete not available');
    return [];
  }

  try {
    const response = await client.placeAutocomplete({
      params: {
        input,
        key: apiKey,
        ...(location && {
          location: `${location.lat},${location.lng}`,
          radius,
        }),
        components: ['country:ng'], // Nigeria only
      },
      timeout: 5000,
    });

    if (response.data.status !== 'OK') {
      logger.warn('Google Maps Autocomplete API returned non-OK status');
      return [];
    }

    return response.data.predictions.map(prediction => ({
      place_id: prediction.place_id,
      description: prediction.description,
      main_text: prediction.structured_formatting.main_text,
      secondary_text: prediction.structured_formatting.secondary_text,
    }));
  } catch (error) {
    logger.error('Google Maps Autocomplete API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return [];
  }
}
