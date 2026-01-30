# GIGA Dashboard API - Frontend Integration Guide

## 🚀 Quick Start

### Base URLs

- **Production API Gateway**: `https://your-api-gateway.railway.app`
- **Local Development**: `http://localhost:3000`

### Authentication

All API calls require JWT authentication from Supabase Auth:

```javascript
Authorization: Bearer <jwt_token>
```

## 🔐 Authentication Flow

### 1. Login

```javascript
const login = async (email, password) => {
  const response = await fetch(
    'https://your-api-gateway.railway.app/api/v1/auth/token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: 'your-supabase-anon-key',
      },
      body: JSON.stringify({
        email,
        password,
        grant_type: 'password',
      }),
    }
  );

  const data = await response.json();

  if (data.access_token) {
    localStorage.setItem('giga_token', data.access_token);
    return data;
  }

  throw new Error(data.error_description || 'Login failed');
};
```

### 2. API Helper Function

```javascript
const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('giga_token');

  const response = await fetch(
    `https://your-api-gateway.railway.app${endpoint}`,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
};
```

## 📊 Dashboard Endpoints

### Get Dashboard Statistics

```javascript
const getDashboardStats = async (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  return apiCall(`/api/dashboard/stats?${params}`);
};

// Usage
const stats = await getDashboardStats('2026-01-01', '2026-01-29');
console.log(stats.data);
// {
//   revenue: { value: 125000.50, change: '+22%', trend: 'up' },
//   orders: { value: 1250, change: '+15%', trend: 'up' },
//   visitors: { value: 15500, change: '+49%', trend: 'up' },
//   conversion: { value: 28.5, change: '+1.9%', trend: 'up' }
// }
```

### Get Sales Comparison

```javascript
const getSalesComparison = async (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  return apiCall(`/api/dashboard/sales-comparison?${params}`);
};

// Usage
const comparison = await getSalesComparison('2026-01-01', '2026-01-29');
console.log(comparison.data);
// {
//   current_period: { sales: 125000.50, start_date: '2026-01-01', end_date: '2026-01-29' },
//   previous_period: { sales: 98000.25, start_date: '2025-12-03', end_date: '2025-12-31' },
//   change: { amount: 27000.25, percentage: 27.55, trend: 'up' }
// }
```

### Get Category Breakdown

```javascript
const getCategoryBreakdown = async () => {
  return apiCall('/api/dashboard/category-breakdown');
};

// Usage
const breakdown = await getCategoryBreakdown();
console.log(breakdown.data);
// {
//   ecommerce: { revenue: 45000.00, orders: 450, vendors: 125 },
//   hotel: { revenue: 35000.00, bookings: 180, hotels: 45 },
//   taxi: { revenue: 25000.00, rides: 850, drivers: 200 },
//   media: { content_items: 1250, social_posts: 3500, engagement: 15000 }
// }
```

## 🏪 Business Module Endpoints

### Get E-commerce Traders

```javascript
const getTraders = async (page = 1, limit = 20, search = '', status = '') => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (search) params.append('search', search);
  if (status) params.append('status', status);

  return apiCall(`/api/ecommerce/traders?${params}`);
};

// Usage
const traders = await getTraders(1, 20, 'electronics', 'active');
console.log(traders.data.traders);
console.log(traders.pagination);
// {
//   page: 1,
//   limit: 20,
//   total: 150,
//   pages: 8
// }
```

### Get Taxi Drivers

```javascript
const getDrivers = async (page = 1, limit = 20, search = '', status = '') => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (search) params.append('search', search);
  if (status) params.append('status', status);

  return apiCall(`/api/taxi/drivers?${params}`);
};

// Usage
const drivers = await getDrivers(1, 20, 'LIC123', 'active');
console.log(drivers.data.drivers);
```

### Get Hotels

```javascript
const getHotels = async (page = 1, limit = 20, search = '', status = '') => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (search) params.append('search', search);
  if (status) params.append('status', status);

  return apiCall(`/api/hotel/hotels?${params}`);
};

// Usage
const hotels = await getHotels(1, 20, 'Grand Lagos', 'active');
console.log(hotels.data.hotels);
```

### Get Media Content

```javascript
const getMediaContent = async (page = 1, limit = 20, type = '') => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (type) params.append('type', type);

  return apiCall(`/api/media/content?${params}`);
};

// Usage
const media = await getMediaContent(1, 20, 'image');
console.log(media.data.content);
```

## 📮 Postal Monitoring Endpoints

### Get Postal Staff

```javascript
const getPostalStaff = async (
  page = 1,
  limit = 20,
  search = '',
  region = '',
  office = ''
) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (search) params.append('search', search);
  if (region) params.append('region', region);
  if (office) params.append('office', office);

  return apiCall(`/api/postal-monitoring/staff?${params}`);
};

// Usage
const staff = await getPostalStaff(1, 20, 'David', 'Lagos', '');
console.log(staff.data.staff);
```

## 👨‍💼 Manager Operations Endpoints

### Get Manager Dashboard Stats

```javascript
const getManagerStats = async () => {
  return apiCall('/api/managers/dashboard-stats');
};

// Usage
const managerStats = await getManagerStats();
console.log(managerStats.data);
// {
//   totalRevenue: 125000.50,
//   totalOrders: 450,
//   avgOrderValue: 277.78,
//   recentActivity: [...]
// }
```

### Get Latest Orders

```javascript
const getLatestOrders = async (limit = 10) => {
  return apiCall(`/api/managers/latest-orders?limit=${limit}`);
};

// Usage
const orders = await getLatestOrders(10);
console.log(orders.data.orders);
```

### Update Order

```javascript
const updateOrder = async (orderId, status, notes) => {
  return apiCall(`/api/managers/orders/${orderId}`, {
    method: 'PUT',
    body: JSON.stringify({ status, notes }),
  });
};

// Usage
const updatedOrder = await updateOrder(
  'order-uuid',
  'processing',
  'Order processed'
);
console.log(updatedOrder.data.order);
```

### Delete Order

```javascript
const deleteOrder = async orderId => {
  return apiCall(`/api/managers/orders/${orderId}`, {
    method: 'DELETE',
  });
};

// Usage
await deleteOrder('order-uuid');
```

## 📺 Advertisement Management Endpoints

### Get Incoming Ads

```javascript
const getIncomingAds = async (page = 1, limit = 20, status = 'pending') => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    status,
  });

  return apiCall(`/api/ads/incoming?${params}`);
};

// Usage
const ads = await getIncomingAds(1, 20, 'pending');
console.log(ads.data.ads);
```

### Update Ad Status

```javascript
const updateAdStatus = async (adId, status, reviewNotes) => {
  return apiCall(`/api/ads/${adId}/status`, {
    method: 'PUT',
    body: JSON.stringify({
      status,
      review_notes: reviewNotes,
    }),
  });
};

// Usage
const updatedAd = await updateAdStatus(
  'ad-uuid',
  'approved',
  'Campaign approved'
);
console.log(updatedAd.data.ad);
```

## 🏛️ Admin Panel Endpoints

### Get Business Categories

```javascript
const getBusinessCategories = async () => {
  return apiCall('/api/admin/categories');
};

// Usage
const categories = await getBusinessCategories();
console.log(categories.data);
// [
//   { id: 'ecommerce', name: 'E-commerce', description: 'Online marketplace and trading' },
//   { id: 'hotel', name: 'Hospitality', description: 'Hotel bookings and accommodation' },
//   { id: 'taxi', name: 'Transportation', description: 'Taxi and ride-hailing services' },
//   { id: 'media', name: 'Media & Content', description: 'Social media and content management' }
// ]
```

## 🔄 Complete React Hook Example

```javascript
import { useState, useEffect } from 'react';

// Custom hook for GIGA Dashboard API
export const useGigaAPI = () => {
  const [token, setToken] = useState(localStorage.getItem('giga_token'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const apiCall = async (endpoint, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://your-api-gateway.railway.app${endpoint}`,
        {
          ...options,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      setLoading(false);
      return data;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const login = async (email, password) => {
    const response = await fetch(
      'https://your-api-gateway.railway.app/api/v1/auth/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: 'your-supabase-anon-key',
        },
        body: JSON.stringify({
          email,
          password,
          grant_type: 'password',
        }),
      }
    );

    const data = await response.json();

    if (data.access_token) {
      localStorage.setItem('giga_token', data.access_token);
      setToken(data.access_token);
      return data;
    }

    throw new Error(data.error_description || 'Login failed');
  };

  const logout = () => {
    localStorage.removeItem('giga_token');
    setToken(null);
  };

  return {
    token,
    loading,
    error,
    login,
    logout,
    apiCall,
    // Dashboard methods
    getDashboardStats: (startDate, endDate) => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      return apiCall(`/api/dashboard/stats?${params}`);
    },
    getSalesComparison: (startDate, endDate) => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      return apiCall(`/api/dashboard/sales-comparison?${params}`);
    },
    getCategoryBreakdown: () => apiCall('/api/dashboard/category-breakdown'),
    // Business module methods
    getTraders: (page = 1, limit = 20, search = '', status = '') => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      return apiCall(`/api/ecommerce/traders?${params}`);
    },
    getDrivers: (page = 1, limit = 20, search = '', status = '') => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      return apiCall(`/api/taxi/drivers?${params}`);
    },
    getHotels: (page = 1, limit = 20, search = '', status = '') => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      return apiCall(`/api/hotel/hotels?${params}`);
    },
    // Add other methods as needed...
  };
};

// Usage in component
const Dashboard = () => {
  const api = useGigaAPI();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await api.getDashboardStats();
        setStats(data.data);
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    };

    if (api.token) {
      loadStats();
    }
  }, [api.token]);

  if (api.loading) return <div>Loading...</div>;
  if (api.error) return <div>Error: {api.error}</div>;
  if (!stats) return <div>No data</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      <div>Revenue: ${stats.revenue.value}</div>
      <div>Orders: {stats.orders.value}</div>
      <div>Visitors: {stats.visitors.value}</div>
      <div>Conversion: {stats.conversion.value}%</div>
    </div>
  );
};
```

## 📋 Response Format

All API responses follow this consistent format:

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "pagination": {
    // Only for paginated endpoints
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message here"
}
```

## 🔧 Error Handling

```javascript
const handleApiCall = async apiFunction => {
  try {
    const result = await apiFunction();
    return result;
  } catch (error) {
    if (error.message.includes('401')) {
      // Token expired, redirect to login
      localStorage.removeItem('giga_token');
      window.location.href = '/login';
    } else if (error.message.includes('403')) {
      // Insufficient permissions
      alert('You do not have permission to access this resource');
    } else if (error.message.includes('500')) {
      // Server error
      alert('Server error. Please try again later.');
    } else {
      // Other errors
      console.error('API Error:', error);
      alert('An error occurred. Please try again.');
    }
    throw error;
  }
};

// Usage
const loadData = async () => {
  await handleApiCall(() => api.getDashboardStats());
};
```

## 🎯 Testing Endpoints

You can test all endpoints using:

1. **Swagger UI**: Visit `https://your-admin-service.railway.app/api-docs`
2. **Postman**: Import the collection from
   `/postman/Giga-API-Collection.postman_collection.json`
3. **curl**: Use the examples in this guide

## 📚 Additional Resources

- **Full OpenAPI Spec**: `/docs/api/GIGA_DASHBOARD_SWAGGER.yaml`
- **Postman Collection**: `/postman/Giga-API-Collection.postman_collection.json`
- **Environment Variables**: `/.env.example`

## 🚀 Ready for Integration!

All endpoints are production-ready with:

- ✅ JWT authentication
- ✅ Comprehensive pagination
- ✅ Search and filtering
- ✅ Proper error handling
- ✅ Audit logging
- ✅ Rate limiting
- ✅ CORS configuration

The frontend team can now start integrating with confidence!
