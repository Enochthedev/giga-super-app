import { Request } from 'express';

// Base API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    timestamp: string;
    request_id: string;
    version: string;
  };
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_previous: boolean;
  has_next: boolean;
  previous_page?: number;
  next_page?: number;
}

// Authentication Types
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  roles?: string[];
  app_metadata?: Record<string, any>;
  user_metadata?: Record<string, any>;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  courier?: {
    id: string;
    is_active: boolean;
    is_verified: boolean;
  };
  requestId?: string;
}

// Location Types
export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

// Route Optimization Request/Response Types
export interface RouteOptimizationRequest {
  courier_id: string;
  delivery_assignments: string[];
  start_location?: LocationCoordinates;
  optimization_preferences?: {
    minimize_distance?: boolean;
    minimize_time?: boolean;
    consider_traffic?: boolean;
    consider_priority?: boolean;
  };
}

export interface RouteOptimizationResponse {
  optimized_sequence: string[];
  total_distance_km: number;
  estimated_duration_minutes: number;
  efficiency_score: number;
  waypoints: LocationCoordinates[];
  estimated_fuel_cost: number;
}

// Delivery Types
export interface DeliveryAssignment {
  id: string;
  order_id: string;
  courier_id: string;
  pickup_address: Address;
  delivery_address: Address;
  status: DeliveryStatus;
  priority: DeliveryPriority;
  estimated_pickup_time?: string;
  estimated_delivery_time?: string;
  actual_pickup_time?: string;
  actual_delivery_time?: string;
  picked_up_at?: string;
  delivery_fee: number;
  distance_km: number;
  estimated_distance_km?: number;
  estimated_duration_minutes?: number;
  delivery_latitude?: number;
  delivery_longitude?: number;
  special_instructions?: string;
  package_details: PackageDetails;
  created_at: string;
  updated_at: string;
}

export type DeliveryStatus =
  | 'pending'
  | 'assigned'
  | 'courier_en_route_pickup'
  | 'arrived_at_pickup'
  | 'picked_up'
  | 'in_transit'
  | 'arrived_at_delivery'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed'
  | 'cancelled'
  | 'returned';

export type DeliveryPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Address {
  id?: string;
  street_address: string;
  city: string;
  state: string;
  postal_code?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  landmark?: string;
  contact_name?: string;
  contact_phone?: string;
  delivery_instructions?: string;
}

export interface PackageDetails {
  weight_kg?: number;
  dimensions?: {
    length_cm: number;
    width_cm: number;
    height_cm: number;
  };
  fragile: boolean;
  value_naira?: number;
  description?: string;
  special_handling?: string[];
}

// Courier Types
export interface CourierProfile {
  id: string;
  user_id: string;
  courier_code: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string;
  verification_status: CourierVerificationStatus;
  availability_status: CourierAvailabilityStatus;
  is_online: boolean;
  current_location?: {
    latitude: number;
    longitude: number;
    updated_at: string;
  };
  vehicle_info: VehicleInfo;
  performance_metrics: CourierPerformanceMetrics;
  created_at: string;
  updated_at: string;
}

export type CourierVerificationStatus = 'pending' | 'verified' | 'rejected' | 'suspended';
export type CourierAvailabilityStatus = 'available' | 'busy' | 'offline' | 'on_break';

export interface VehicleInfo {
  type: string;
  registration: string;
  capacity_kg: number;
  max_delivery_radius_km: number;
}

export interface CourierPerformanceMetrics {
  total_deliveries: number;
  completed_deliveries: number;
  failed_deliveries: number;
  average_rating: number;
  completion_rate: number;
  on_time_delivery_rate: number;
  average_delivery_time_minutes: number;
  total_earnings: number;
}

// Route Optimization Types
export interface RouteOptimization {
  id: string;
  courier_id: string;
  assignments: string[];
  optimized_sequence: number[];
  total_distance_km: number;
  estimated_duration_minutes: number;
  waypoints: RouteWaypoint[];
  created_at: string;
}

export interface RouteWaypoint {
  assignment_id: string;
  sequence: number;
  address: Address;
  waypoint_type: 'pickup' | 'delivery';
  estimated_arrival_time: string;
  estimated_duration_minutes: number;
}

// Tracking Types
export interface DeliveryTracking {
  id: string;
  assignment_id: string;
  courier_id: string;
  latitude: number;
  longitude: number;
  status: DeliveryStatus;
  timestamp: string;
  notes?: string;
  photo_urls?: string[];
}

// Exception Handling Types
export interface DeliveryException {
  id: string;
  assignment_id: string;
  courier_id: string;
  exception_type: DeliveryExceptionType;
  description: string;
  resolution_status: ExceptionResolutionStatus;
  resolution_notes?: string;
  created_at: string;
  resolved_at?: string;
}

export type DeliveryExceptionType =
  | 'address_not_found'
  | 'recipient_unavailable'
  | 'package_damaged'
  | 'vehicle_breakdown'
  | 'weather_delay'
  | 'traffic_delay'
  | 'security_concern'
  | 'other';

export type ExceptionResolutionStatus = 'pending' | 'resolved' | 'escalated';

// Google Maps Types
export interface GoogleMapsRoute {
  distance: {
    text: string;
    value: number;
  };
  duration: {
    text: string;
    value: number;
  };
  start_location: {
    lat: number;
    lng: number;
  };
  end_location: {
    lat: number;
    lng: number;
  };
  steps: GoogleMapsStep[];
}

export interface GoogleMapsStep {
  distance: {
    text: string;
    value: number;
  };
  duration: {
    text: string;
    value: number;
  };
  start_location: {
    lat: number;
    lng: number;
  };
  end_location: {
    lat: number;
    lng: number;
  };
  html_instructions: string;
}

// Request/Response Types
export interface AssignDeliveryRequest {
  order_id: string;
  pickup_address: Address;
  delivery_address: Address;
  package_details: PackageDetails;
  priority?: DeliveryPriority;
  special_instructions?: string;
  preferred_courier_id?: string;
  scheduled_pickup_time?: string;
}

export interface TrackDeliveryRequest {
  assignment_id: string;
  latitude?: number;
  longitude?: number;
  accuracy_meters?: number;
  speed_kmh?: number;
  heading_degrees?: number;
  battery_level?: number;
  status?: DeliveryStatus;
  notes?: string;
  photo_urls?: string[];
  device_info?: {
    user_agent?: string;
    platform?: string;
    app_version?: string;
  };
}

export interface UpdateDeliveryStatusRequest {
  assignment_id: string;
  status: DeliveryStatus;
  notes?: string;
  photo_urls?: string[];
  delivery_confirmation?: {
    recipient_name: string;
    recipient_signature?: string;
    delivery_photo?: string;
  };
}

export interface OptimizeRoutesRequest {
  courier_id: string;
  assignment_ids: string[];
  start_location?: {
    latitude: number;
    longitude: number;
  };
}

// Error Types
export const ERROR_CODES = {
  // Validation errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_COORDINATES: 'INVALID_COORDINATES',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',

  // Authentication errors (401)
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Authorization errors (403)
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  COURIER_NOT_VERIFIED: 'COURIER_NOT_VERIFIED',
  COURIER_NOT_AVAILABLE: 'COURIER_NOT_AVAILABLE',

  // Resource errors (404)
  ASSIGNMENT_NOT_FOUND: 'ASSIGNMENT_NOT_FOUND',
  COURIER_NOT_FOUND: 'COURIER_NOT_FOUND',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',

  // Conflict errors (409)
  ASSIGNMENT_ALREADY_EXISTS: 'ASSIGNMENT_ALREADY_EXISTS',
  COURIER_ALREADY_ASSIGNED: 'COURIER_ALREADY_ASSIGNED',
  INVALID_DELIVERY_STATUS: 'INVALID_DELIVERY_STATUS',

  // External service errors (502)
  GOOGLE_MAPS_ERROR: 'GOOGLE_MAPS_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',

  // Server errors (500)
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  ROUTE_OPTIMIZATION_FAILED: 'ROUTE_OPTIMIZATION_FAILED',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
