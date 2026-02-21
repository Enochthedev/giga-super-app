/**
 * Reviews routes - Guest review functionality
 */

import { Router } from 'express';

import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js';
import { databaseService } from '../utils/database.js';

const router = Router();

/**
 * POST /api/v1/reviews
 * Create a hotel review (requires completed booking)
 */
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const {
      hotel_id,
      booking_id,
      rating,
      title,
      comment,
      cleanliness_rating,
      comfort_rating,
      location_rating,
      service_rating,
      value_rating,
      images,
    } = req.body;

    if (!hotel_id || !rating) {
      res.status(400).json({ success: false, error: 'hotel_id and rating are required' });
      return;
    }

    if (rating < 1 || rating > 5) {
      res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
      return;
    }

    // Find a completed booking for this user at this hotel
    let bookingQuery = databaseService.supabase
      .from('hotel_bookings')
      .select('id, booking_status')
      .eq('hotel_id', hotel_id)
      .eq('user_id', userId)
      .eq('booking_status', 'checked_out');

    // If specific booking_id provided, use that
    if (booking_id) {
      bookingQuery = databaseService.supabase
        .from('hotel_bookings')
        .select('id, booking_status')
        .eq('id', booking_id)
        .eq('user_id', userId);
    }

    const { data: booking, error: bookingError } = await bookingQuery.single();

    if (bookingError || !booking) {
      res.status(400).json({
        success: false,
        error: 'You can only review hotels where you have completed a stay',
        code: 'BOOKING_REQUIRED',
        details: {
          message: booking_id
            ? 'The specified booking was not found or does not belong to you'
            : 'No completed booking found for this hotel. You must check out before leaving a review.',
          requirements: [
            'You must have a booking at this hotel',
            'The booking must be in "checked_out" status',
            'You can only leave one review per hotel',
          ],
        },
      });
      return;
    }

    // Check if booking is checked out (if specific booking_id was provided)
    if (booking.booking_status !== 'checked_out') {
      res.status(400).json({
        success: false,
        error: 'You can only review after checking out',
        code: 'CHECKOUT_REQUIRED',
        details: {
          current_status: booking.booking_status,
          message: 'Please wait until after your stay is complete to leave a review',
        },
      });
      return;
    }

    // Check for existing review
    const { data: existing } = await databaseService.supabase
      .from('hotel_reviews')
      .select('id')
      .eq('hotel_id', hotel_id)
      .eq('user_id', userId)
      .single();

    if (existing) {
      res.status(400).json({
        success: false,
        error: 'You have already reviewed this hotel',
        code: 'DUPLICATE_REVIEW',
        details: {
          existing_review_id: existing.id,
          message: 'You can update your existing review instead of creating a new one',
          update_endpoint: `PUT /api/v1/reviews/${existing.id}`,
        },
      });
      return;
    }

    const { data: review, error } = await databaseService.supabase
      .from('hotel_reviews')
      .insert({
        hotel_id,
        user_id: userId,
        booking_id: booking.id,
        rating,
        title,
        comment,
        cleanliness_rating: cleanliness_rating || rating,
        comfort_rating: comfort_rating || rating,
        location_rating: location_rating || rating,
        service_rating: service_rating || rating,
        value_rating: value_rating || rating,
        images: images || [],
        is_verified: true, // Verified because we confirmed the booking
        is_approved: true, // Auto-approve for now
      })
      .select()
      .single();

    if (error) throw error;

    // Mark booking as reviewed
    await databaseService.supabase
      .from('hotel_bookings')
      .update({ has_review: true })
      .eq('id', booking.id);

    res.json({ success: true, message: 'Review submitted successfully', data: review });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * PUT /api/v1/reviews/:id
 * Update own review
 */
router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { data: existing } = await databaseService.supabase
      .from('hotel_reviews')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existing || existing.user_id !== userId) {
      res.status(403).json({ success: false, error: 'Not authorized' });
      return;
    }

    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.id;
    delete updates.user_id;
    delete updates.hotel_id;
    delete updates.is_verified;

    const { data, error } = await databaseService.supabase
      .from('hotel_reviews')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, message: 'Review updated', data });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * DELETE /api/v1/reviews/:id
 * Delete own review
 */
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { data: existing } = await databaseService.supabase
      .from('hotel_reviews')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existing || existing.user_id !== userId) {
      res.status(403).json({ success: false, error: 'Not authorized' });
      return;
    }

    const { error } = await databaseService.supabase.from('hotel_reviews').delete().eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /api/v1/reviews/:id/helpful
 * Mark a review as helpful
 */
router.post('/:id/helpful', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await databaseService.supabase.rpc('increment_helpful_count', {
      review_id: id,
    });

    // Fallback if RPC doesn't exist
    if (error) {
      const { data: review } = await databaseService.supabase
        .from('hotel_reviews')
        .select('helpful_count')
        .eq('id', id)
        .single();

      if (review) {
        await databaseService.supabase
          .from('hotel_reviews')
          .update({ helpful_count: (review.helpful_count || 0) + 1 })
          .eq('id', id);
      }
    }

    res.json({ success: true, message: 'Marked as helpful' });
  } catch (error) {
    console.error('Mark helpful error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /api/v1/reviews/my-reviews
 * Get user's own reviews
 */
router.get('/my-reviews', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    const { data: reviews, error } = await databaseService.supabase
      .from('hotel_reviews')
      .select('*, hotel:hotels(id, name, slug, featured_image, city)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data: reviews });
  } catch (error) {
    console.error('Get my reviews error:', error);
    res.status(400).json({ success: false, error: (error as Error).message });
  }
});

export { router as reviewsRouter };
