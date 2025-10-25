import { ICart } from 'src/schemas/cart.scheme';
import WishlistModel from '../models/wishlist.model';

export class WishlistService {

  static async addToWishlist(item: ICart): Promise<ICart | null> {
    const wishlist: ICart | null = (await WishlistModel.findOneAndUpdate({ id: item.cartId }, item, { new: true })) as unknown as ICart | null;

    if (wishlist) {
      return wishlist;
    } else {
      const newWishlist = new WishlistModel(item);
      return newWishlist.save();
    }
  }

  static async getWishlist(userId: string): Promise<ICart | null> {
    return WishlistModel.findOne({ id: userId });
  }

  static async removeFromWishlist(item: ICart): Promise<ICart | null> {
    const wishlist: ICart | null = (await WishlistModel.findOneAndUpdate({ id: item.cartId }, item, { new: true })) as unknown as ICart | null;
    if (wishlist) {
      return wishlist
    }
    return null;
  }

  static async clearWishlist(userId: string): Promise<void> {
    await WishlistModel.deleteOne({ id: userId });
  }

  static async clearAllWishlists(): Promise<void> {
    await WishlistModel.deleteMany({});
  }

}
