import { Router } from 'express';
import { addToWishlist, getWishlist, removeFromWishlist } from '../controllers/wishlist.controller';
import { authenticate } from '@middlewares/authtenticate.checker';

const router = Router();

// Add item to wishlist
router.post('/add', authenticate, addToWishlist);

// Get user's wishlist
router.get('/', getWishlist);

// Remove item from wishlist
router.delete('/remove', authenticate, removeFromWishlist);

export default router;
