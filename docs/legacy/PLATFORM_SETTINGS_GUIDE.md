# ✅ Platform Settings - Admin Configurable Pricing

## Summary

I've refactored the taxi service to make all pricing and configuration settings
**admin-configurable** via database, instead of hardcoded values. This allows
you to:

- ✅ Update fares without redeploying code
- ✅ Run A/B tests on pricing
- ✅ Adjust commissions dynamically
- ✅ Configure cancellation fees via admin panel

---

## 🗄️ Database Changes

### New Table: `platform_settings`

```sql
CREATE TABLE platform_settings (
  id UUID PRIMARY KEY,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  value_type TEXT DEFAULT 'string',
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP,
  created_at TIMESTAMP,
  UNIQUE(category, key)
);
```

### Pre-seeded Settings

| Category          | Key                                 | Default Value | Description                   |
| ----------------- | ----------------------------------- | ------------- | ----------------------------- |
| `taxi_pricing`    | `base_fare`                         | 500           | Base fare (NGN)               |
| `taxi_pricing`    | `cost_per_km`                       | 100           | Per kilometer (NGN)           |
| `taxi_pricing`    | `cost_per_minute`                   | 20            | Per minute (NGN)              |
| `taxi_pricing`    | `min_fare`                          | 300           | Minimum fare (NGN)            |
| `taxi_pricing`    | `surge_multiplier_max`              | 3.0           | Max surge multiplier          |
| `taxi_pricing`    | `cancellation_fee`                  | 200           | Cancellation fee (NGN)        |
| `taxi_pricing`    | `cancellation_grace_period_minutes` | 5             | Free cancellation window      |
| `taxi_commission` | `driver_commission_rate`            | 0.80          | Driver keeps 80%              |
| `taxi_commission` | `platform_commission_rate`          | 0.20          | Platform keeps 20%            |
| `taxi_settings`   | `driver_search_radius_km`           | 10            | Driver search radius          |
| `taxi_settings`   | `max_drivers_to_notify`             | 5             | Drivers to notify per request |

---

## 🔧 Updated Functions

### 1. `complete-ride` ✅

- Now fetches `base_fare`, `cost_per_km`, `cost_per_minute`, `min_fare`,
  `driver_commission_rate` from database
- Falls back to defaults if settings not found

### 2. `cancel-ride` ✅

- Fetches `cancellation_fee` and `cancellation_grace_period_minutes` from
  database
- Applies fees dynamically

### 3. New Admin Functions

#### `update-platform-setting` (POST)

Update any platform setting (requires admin clearance level 4+).

**Request:**

```json
{
  "category": "taxi_pricing",
  "key": "base_fare",
  "value": "600"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "category": "taxi_pricing",
    "key": "base_fare",
    "value": "600",
    "updated_at": "2025-11-22T20:00:00Z"
  },
  "message": "Setting taxi_pricing.base_fare updated successfully"
}
```

#### `get-platform-settings` (GET)

Get all platform settings, optionally filtered by category.

**Request:**

```
GET /get-platform-settings?category=taxi_pricing
```

**Response:**

```json
{
  "success": true,
  "data": {
    "settings": {
      "taxi_pricing": {
        "base_fare": {
          "value": "600",
          "value_type": "number",
          "description": "Base fare for all rides (NGN)",
          "updated_at": "2025-11-22T20:00:00Z"
        },
        ...
      }
    }
  }
}
```

---

## 📝 Functions Still To Update

These functions should also fetch from database in the next iteration:

- `get-ride-estimate`: Should fetch pricing settings
- `request-ride`: Should use `driver_search_radius_km` and
  `max_drivers_to_notify`

---

## 🚀 Deployment

```bash
# 1. Update database schema
# Run taxi_schema.sql in Supabase SQL Editor

# 2. Deploy updated functions
cd /Users/user/Dev/giga
supabase functions deploy complete-ride
supabase functions deploy cancel-ride
supabase functions deploy update-platform-setting
supabase functions deploy get-platform-settings
```

---

## 💡 Usage Examples

### For Admin Panel

```javascript
// Update base fare
await fetch('/update-platform-setting', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${adminToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    category: 'taxi_pricing',
    key: 'base_fare',
    value: '650', // Increase from 500 to 650
  }),
});

// Get all taxi settings
const settings = await fetch('/get-platform-settings?category=taxi_pricing', {
  headers: { Authorization: `Bearer ${adminToken}` },
});
```

### Settings UI Component

```jsx
// Example React component for admin
function TaxiPricingSettings() {
  const [baseFare, setBaseFare] = useState(500);
  const [costPerKm, setCostPerKm] = useState(100);

  const updateSetting = async (key, value) => {
    await api.post('/update-platform-setting', {
      category: 'taxi_pricing',
      key,
      value: value.toString(),
    });
  };

  return (
    <div>
      <h2>Taxi Pricing</h2>
      <input
        type="number"
        value={baseFare}
        onChange={e => {
          setBaseFare(e.target.value);
          updateSetting('base_fare', e.target.value);
        }}
      />
    </div>
  );
}
```

---

## ✨ Benefits

✅ **No Code Deployments**: Change prices instantly without touching code ✅
**A/B Testing**: Test different pricing strategies easily ✅ **Regional
Pricing**: Can extend to support location-based pricing ✅ **Audit Trail**:
Track who changed what and when ✅ **Emergency Adjustments**: Quickly respond to
market conditions

---

## 🎯 Next Steps

1. Deploy the updated schema (taxi_schema.sql)
2. Deploy the updated functions
3. Build admin UI for managing settings
4. Update remaining functions (get-ride-estimate, request-ride)
5. Add validation rules (e.g., min_fare must be < base_fare + reasonable trip)
