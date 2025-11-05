import { ICart } from '@schemas/cart.scheme';
import WishlistModel from '../models/wishlist.model';

export class WishlistService {

  static async dropIndexes(): Promise<void> {
    try {
      await WishlistModel.collection.dropIndexes();
    } catch (error) {
      console.error('Error dropping indexes:', error);
      throw error;
    }
  }

  static async createIndexes(): Promise<void> {
    try {
      await WishlistModel.collection.createIndex(
        { cartId: 1 },
        { unique: true, background: true } // background ile mevcut koleksiyon çalışırken de oluşturulur
      );
    } catch (error) {
      console.error('Error creating indexes:', error);
      throw error;
    }
  }

  static async addToWishlist(item: ICart): Promise<ICart | null> {
    const { cartId, ...dataWithoutCartId } = item;
    try {

      const { cartId, ...dataWithoutCartId } = item;

      const wishlist = await WishlistModel.findOneAndUpdate(
        { cartId },
        {
          $set: dataWithoutCartId,
          $setOnInsert: { cartId },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      ).lean();

      return wishlist as ICart;


    } catch (error) {
      console.error(`Wishlist add error for ${item.cartId}:`, error);
      throw error;
    }
  }

  static async getWishlist(userId: string): Promise<ICart | null> {
    return WishlistModel.findOne({ cartId: userId });
  }
  static async getAllWishlist(): Promise<ICart[]> {
    return await WishlistModel.find();
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
