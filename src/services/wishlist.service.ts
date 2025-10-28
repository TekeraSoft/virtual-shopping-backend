import { ICart } from 'src/schemas/cart.scheme';
import WishlistModel from '../models/wishlist.model';

export class WishlistService {

  static async addToWishlist(item: ICart): Promise<ICart | null> {
    try {
      // Use findOneAndReplace with upsert to handle both insert and update cases
      const wishlist: ICart | null = (await WishlistModel.findOneAndReplace(
        { cartId: item.cartId },
        item,
        { 
          new: true, 
          upsert: true,
          returnDocument: 'after'
        }
      )) as unknown as ICart | null;

      return wishlist;
    } catch (error) {
      console.error(`Error adding to wishlist for cartId ${item.cartId}:`, error);
      
      // If we get a duplicate key error, try to get the existing document
      if ((error as any).code === 11000) {
        console.log(`Duplicate key error for cartId ${item.cartId}, attempting to fetch existing document`);
        return await WishlistModel.findOne({ cartId: item.cartId });
      }
      
      throw error;
    }
  }

  static async getWishlist(userId: string): Promise<ICart | null> {
    return WishlistModel.findOne({ cartId: userId });
  }

  static async removeFromWishlist(item: ICart): Promise<ICart | null> {
    const wishlist: ICart | null = (await WishlistModel.findOneAndUpdate({ cartId: item.cartId }, item, { new: true })) as unknown as ICart | null;
    if (wishlist) {
      return wishlist
    }
    return null;
  }

  static async clearWishlist(userId: string): Promise<void> {
    try {
      const result = await WishlistModel.deleteOne({ cartId: userId });
      console.log(`Cleared wishlist for user ${userId}, deleted ${result.deletedCount} documents`);
      
      // Wait a bit to ensure the deletion is fully processed
      if (result.deletedCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`Error clearing wishlist for user ${userId}:`, error);
      throw error;
    }
  }

  static async clearAllWishlists(): Promise<void> {
    await WishlistModel.deleteMany({});
  }

}
