/**
 * E-Commerce Service Documentation
 * Covers: Product browsing, searching, categories, brands, trending
 */

import type { ServiceDocumentation } from '../types/postman.types.js';

export const ecommerceService: ServiceDocumentation = {
  name: '11. E-Commerce',
  description: 'Public endpoints for browsing and searching e-commerce products',
  baseUrl: '{{base_url}}',
  version: '1.0.0',
  endpoints: [
    {
      name: 'Search Products',
      description: 'Search for products with pagination and filtering. Publicly accessible.',
      method: 'POST',
      path: '/api/v1/products/search',
      requiresAuth: false,
      requestBody: {
        description: 'Search criteria',
        contentType: 'application/json',
        schema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search term for product name or description' },
            category_id: { type: 'string', description: 'Filter by category UUID' },
            brand: { type: 'string', description: 'Filter by brand name' },
            min_price: { type: 'number', description: 'Minimum price filter' },
            max_price: { type: 'number', description: 'Maximum price filter' },
            sort_by: { type: 'string', enum: ['price_asc', 'price_desc', 'newest', 'rating'] },
            page: { type: 'number', description: 'Page number for pagination', default: 1 },
            limit: { type: 'number', description: 'Items per page', default: 20 },
          },
        },
        example: {
          query: 'laptop',
          category_id: 'c2f3e8b0-a4d1-4b7e-9c5f-8d2eaf1b6d4c',
          min_price: 50000,
          max_price: 500000,
          sort_by: 'price_asc',
          page: 1,
          limit: 20,
        },
      },
      responses: [
        {
          status: 200,
          description: 'Products retrieved successfully',
          body: {
            success: true,
            data: {
              products: [
                {
                  id: 'product-uuid',
                  name: 'MacBook Pro M2',
                  description: 'Latest Apple MacBook Pro',
                  price: 850000,
                  stock_quantity: 15,
                  category_id: 'cat-uuid',
                  brand: 'Apple',
                  image_urls: ['url1', 'url2'],
                  rating: 4.8,
                  reviews_count: 24,
                },
              ],
              pagination: {
                page: 1,
                limit: 20,
                total: 45,
                pages: 3,
              },
            },
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Get Categories',
      description: 'Retrieve all product categories and their subcategories. Publicly accessible.',
      method: 'GET',
      path: '/api/v1/products/categories',
      requiresAuth: false,
      responses: [
        {
          status: 200,
          description: 'Categories retrieved successfully',
          body: {
            success: true,
            data: [
              {
                id: 'cat-uuid',
                name: 'Electronics',
                slug: 'electronics',
                parent_id: null,
                children: [
                  {
                    id: 'sub-uuid',
                    name: 'Laptops',
                    slug: 'laptops',
                    parent_id: 'cat-uuid',
                  },
                ],
              },
            ],
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Get Trending Products',
      description: 'Retrieve currently trending/popular products. Publicly accessible.',
      method: 'GET',
      path: '/api/v1/products/trending',
      requiresAuth: false,
      queryParams: [
        {
          name: 'limit',
          required: false,
          example: '10',
          type: 'number',
          description: 'Number of trending products to return (default: 10)',
        },
      ],
      responses: [
        {
          status: 200,
          description: 'Trending products retrieved successfully',
          body: {
            success: true,
            data: [
              {
                id: 'product-uuid',
                name: 'iPhone 15 Pro',
                price: 1200000,
                brand: 'Apple',
                rating: 4.9,
                trending_score: 98,
              },
            ],
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Get Brands',
      description: 'Retrieve a list of all available product brands. Publicly accessible.',
      method: 'GET',
      path: '/api/v1/products/brands',
      requiresAuth: false,
      queryParams: [
        {
          name: 'category_id',
          required: false,
          example: 'cat-uuid',
          type: 'string',
          description: 'Filter brands by a specific category',
        },
      ],
      responses: [
        {
          status: 200,
          description: 'Brands retrieved successfully',
          body: {
            success: true,
            data: [
              {
                name: 'Apple',
                product_count: 145,
              },
              {
                name: 'Samsung',
                product_count: 210,
              },
            ],
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Get Product Details',
      description:
        'Retrieve full details for a specific product including reviews and vendor info. Publicly accessible.',
      method: 'GET',
      path: '/api/v1/products/details',
      requiresAuth: false,
      queryParams: [
        {
          name: 'id',
          required: true,
          example: 'product-uuid',
          type: 'string',
          description: 'The UUID of the product',
        },
      ],
      responses: [
        {
          status: 200,
          description: 'Product details retrieved successfully',
          body: {
            success: true,
            data: {
              id: 'product-uuid',
              name: 'MacBook Pro M2',
              description: 'Latest Apple MacBook Pro with M2 Max chip, 32GB RAM, 1TB SSD',
              price: 850000,
              original_price: 900000,
              discount_percentage: 5,
              stock_quantity: 15,
              category_id: 'cat-uuid',
              category_name: 'Laptops',
              brand: 'Apple',
              specifications: {
                processor: 'Apple M2 Max',
                ram: '32GB',
                storage: '1TB SSD',
                screen: '16.2 inch Liquid Retina XDR',
              },
              image_urls: ['url1', 'url2', 'url3'],
              rating: 4.8,
              reviews_count: 24,
              vendor: {
                id: 'vendor-uuid',
                business_name: 'iStore Nigeria',
                rating: 4.9,
              },
              created_at: '2023-11-01T10:00:00Z',
              updated_at: '2024-01-15T08:30:00Z',
            },
          },
        },
        {
          status: 404,
          description: 'Product not found',
          body: {
            success: false,
            error: 'Product not found',
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },
  ],
};

export default ecommerceService;
