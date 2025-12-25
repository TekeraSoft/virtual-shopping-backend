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
        { id: 1 },
        { unique: true, background: true } // background ile mevcut koleksiyon çalışırken de oluşturulur
      );
    } catch (error) {
      console.error('Error creating indexes:', error);
      throw error;
    }
  }

  static async addToWishlist(item: ICart): Promise<ICart | null> {
    const { id, ...dataWithoutId } = item;
    if (!id) {
      throw new Error("Cart id is required to save wishlist");
    }
    try {

      const wishlist = await WishlistModel.findOneAndUpdate(
        { id },
        {
          $set: dataWithoutId,
          $setOnInsert: { id },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      ).lean();

      return wishlist as ICart;


    } catch (error) {
      console.error(`Wishlist add error for ${item.id}:`, error);
      throw error;
    }
  }

  static async getWishlist(wishlistId: string): Promise<ICart | null> {
    return WishlistModel.findOne({ id: wishlistId }).lean();
  }
  static async getAllWishlist(): Promise<ICart[]> {
    return await WishlistModel.find().lean();
  }

  static async removeFromWishlist(item: ICart): Promise<ICart | null> {
    if (!item.id) {
      return null;
    }
    const wishlist = await WishlistModel.findOneAndUpdate({ id: item.id }, item, { new: true }).lean();
    if (wishlist) {
      return wishlist as ICart;
    }
    return null;
  }

  static async clearWishlist(wishlistId: string): Promise<void> {
    try {
      const result = await WishlistModel.deleteOne({ id: wishlistId });
      console.log(`Cleared wishlist ${wishlistId}, deleted ${result.deletedCount} documents`);

      // Wait a bit to ensure the deletion is fully processed
      if (result.deletedCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`Error clearing wishlist ${wishlistId}:`, error);
      throw error;
    }
  }

  static async clearAllWishlists(): Promise<void> {
    await WishlistModel.deleteMany({});
  }

}
