# GIGA API Quick Test Reference

Copy-paste ready test data for all API endpoints.

## Base URL

```
https://giga-giga-production.up.railway.app
```

## Authentication Header

```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 1. User Addresses

### Add Address (POST /api/v1/user/addresses)

```json
{
  "label": "Home",
  "street": "15 Admiralty Way, Lekki Phase 1",
  "city": "Lagos",
  "state": "Lagos",
  "zip_code": "101233",
  "country": "Nigeria",
  "phone": "+2348012345678",
  "latitude": 6.4541,
  "longitude": 3.4744,
  "is_default": true
}
```

---

## 2. Switch Role

### Switch Role (POST /api/v1/user/switch-role)

```json
{
  "role": "DRIVER"
}
```

Available roles: USER, DRIVER, VENDOR, HOTEL_MANAGER, ADMIN

---

## 3. Search Hotels (POST /api/v1/hotels/search)

```json
{
  "city": "Lagos",
  "page": 1,
  "limit": 20
}
```

---

## 4. Request Ride (POST /api/v1/rides/request)

```json
{
  "pickup_address": "Lekki Phase 1, Lagos",
  "pickup_lat": 6.4541,
  "pickup_lng": 3.4744,
  "dropoff_address": "Victoria Island, Lagos",
  "dropoff_lat": 6.4281,
  "dropoff_lng": 3.4219,
  "vehicle_type": "comfort"
}
```

---

## 5. Notifications (GET /api/v1/notifications/history)

```
GET /api/v1/notifications/history?limit=20&offset=0
```

---

## 6. Ads (POST /api/v1/ads/fetch)

```json
{
  "placement_type": "home",
  "limit": 3
}
```
