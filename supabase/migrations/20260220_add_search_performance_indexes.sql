-- Performance indexes for search queries
-- These indexes dramatically speed up common search patterns

-- Products: Active products with stock (most common filter)
CREATE INDEX IF NOT EXISTS idx_products_active_stock 
ON ecommerce_products(is_active, stock_quantity) 
WHERE is_active = true AND deleted_at IS NULL AND stock_quantity > 0;

-- Products: Price range queries
CREATE INDEX IF NOT EXISTS idx_products_final_price 
ON ecommerce_products(final_price) 
WHERE is_active = true AND deleted_at IS NULL;

-- Products: Category filtering
CREATE INDEX IF NOT EXISTS idx_products_category 
ON ecommerce_products(category_id) 
WHERE is_active = true AND deleted_at IS NULL;

-- Products: Full-text search on name and description
CREATE INDEX IF NOT EXISTS idx_products_search_text 
ON ecommerce_products 
USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

-- Products: Sorting by created_at (newest first)
CREATE INDEX IF NOT EXISTS idx_products_created_at 
ON ecommerce_products(created_at DESC) 
WHERE is_active = true AND deleted_at IS NULL;

-- Products: Sorting by rating
CREATE INDEX IF NOT EXISTS idx_products_rating 
ON ecommerce_products(average_rating DESC NULLS LAST) 
WHERE is_active = true AND deleted_at IS NULL;

-- Hotels: Active hotels
CREATE INDEX IF NOT EXISTS idx_hotels_active 
ON hotels(is_active) 
WHERE is_active = true AND deleted_at IS NULL;

-- Hotels: Star rating filter
CREATE INDEX IF NOT EXISTS idx_hotels_star_rating 
ON hotels(star_rating) 
WHERE is_active = true AND deleted_at IS NULL;

-- Hotels: Location search (city, state)
CREATE INDEX IF NOT EXISTS idx_hotels_location 
ON hotels(city, state) 
WHERE is_active = true AND deleted_at IS NULL;

-- Categories: Active categories
CREATE INDEX IF NOT EXISTS idx_categories_active 
ON ecommerce_categories(is_active) 
WHERE is_active = true;

-- Vendors: Active vendors (used as brands)
CREATE INDEX IF NOT EXISTS idx_vendors_active 
ON ecommerce_vendors(is_active) 
WHERE is_active = true AND deleted_at IS NULL;

-- Analyze tables to update statistics
ANALYZE ecommerce_products;
ANALYZE ecommerce_categories;
ANALYZE ecommerce_vendors;
ANALYZE hotels;
