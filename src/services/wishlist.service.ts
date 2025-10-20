import { IAddToCartItem, ICart } from "src/schemas/cart.scheme";

const wishlistStore: Map<string, ICart> = new Map();

export class WishlistService {

  static addToWishlist(userId: string, item: ICart): void {
    wishlistStore.set(userId, item);
  }


  static getWishlist(userId: string): ICart | null {
    return wishlistStore.get(userId) || null;
  }


  static removeFromWishlist(userId: string, cart: ICart): boolean {

    wishlistStore.set(userId, cart);

    return true;
  }


  static clearWishlist(userId: string): void {
    wishlistStore.delete(userId);
  }


  static getAllWishlists(): Map<string, ICart> {
    return wishlistStore;
  }
}
