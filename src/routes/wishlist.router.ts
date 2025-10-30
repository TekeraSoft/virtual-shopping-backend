import { Router } from 'express';
import { addToWishlist, clearWishlist, getMyWishlist, getWishlist, removeFromWishlist, clearAllWishlists, getAllWishlists, dropIndexes, createIndexes } from '../controllers/wishlist.controller';
import { authenticate } from '@middlewares/authtenticate.checker';

const wishlistRouter = Router();

// Add item to wishlist
wishlistRouter.post('/add', authenticate, addToWishlist);

// Get user's wishlist
wishlistRouter.get('/', getWishlist);

wishlistRouter.get('/me', authenticate, getMyWishlist);
wishlistRouter.delete('/clear', authenticate, clearWishlist);
wishlistRouter.delete('/clear-all', clearAllWishlists);
wishlistRouter.get('/get-all', getAllWishlists);
wishlistRouter.get('/drop-indexes', dropIndexes);
wishlistRouter.get('/create-indexes', createIndexes);


// Remove item from wishlist
wishlistRouter.delete('/remove', authenticate, removeFromWishlist);

export default wishlistRouter;
