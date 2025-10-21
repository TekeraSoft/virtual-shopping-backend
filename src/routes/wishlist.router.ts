import { Router } from 'express';
import { addToWishlist, getMyWishlist, getWishlist, removeFromWishlist } from '../controllers/wishlist.controller';
import { authenticate } from '@middlewares/authtenticate.checker';

const wishlistRouter = Router();

// Add item to wishlist
wishlistRouter.post('/add', authenticate, addToWishlist);

// Get user's wishlist
wishlistRouter.get('/', getWishlist);

wishlistRouter.get('/me', authenticate, getMyWishlist);


// Remove item from wishlist
wishlistRouter.delete('/remove', authenticate, removeFromWishlist);

export default wishlistRouter;
