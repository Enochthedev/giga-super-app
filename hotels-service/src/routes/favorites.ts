/**
 * Favorites routes for Hotels Service
 */

import { Router } from 'express';

import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js';
import { databaseService } from '../utils/database.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/v1/favorites
 * Get user's favorite hotels
 */
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    const { data: favorites, error } = await databaseService.supabase
      .from('favorite_hotels')
      .select(
        `
        *,
        hotel:hotels(
          id, name, slug, featured_image, city, country,
          star_rating, average_rating, total_reviews
        )
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data: favorites });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /api/v1/favorites/add
 * Add hotel to favorites
 */
router.post('/add', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { hotelId, hotel_id } = req.body;
    const hotelIdVal = hotelId || hotel_id;

    if (!hotelIdVal) {
      res.status(400).json({ success: false, error: 'Hotel ID is required' });
      return;
    }

    // Check if already favorited
    const { data: existing } = await databaseService.supabase
      .from('favorite_hotels')
      .select('id')
      .eq('user_id', userId)
      .eq('hotel_id', hotelIdVal)
      .single();

    if (existing) {
      res.json({ success: true, message: 'Hotel already in favorites', data: existing });
      return;
    }

    const { data: favorite, error } = await databaseService.supabase
      .from('favorite_hotels')
      .insert({ user_id: userId, hotel_id: hotelIdVal })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, message: 'Hotel added to favorites', data: favorite });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /api/v1/favorites/remove
 * Remove hotel from favorites
 */
router.post('/remove', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { hotelId, hotel_id } = req.body;
    const hotelIdVal = hotelId || hotel_id;

    if (!hotelIdVal) {
      res.status(400).json({ success: false, error: 'Hotel ID is required' });
      return;
    }

    const { error } = await databaseService.supabase
      .from('favorite_hotels')
      .delete()
      .eq('user_id', userId)
      .eq('hotel_id', hotelIdVal);

    if (error) throw error;

    res.json({ success: true, message: 'Hotel removed from favorites' });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/v1/favorites/check/:hotelId
 * Check if hotel is in favorites
 */
router.get('/check/:hotelId', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { hotelId } = req.params;

    const { data: favorite } = await databaseService.supabase
      .from('favorite_hotels')
      .select('id')
      .eq('user_id', userId)
      .eq('hotel_id', hotelId)
      .single();

    res.json({ success: true, data: { isFavorite: !!favorite } });
  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

export { router as favoritesRouter };
