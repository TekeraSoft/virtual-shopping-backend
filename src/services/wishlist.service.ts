import { IAddToCartItem } from "../types/cart/CartItem";

const wishlistStore: Map<string, IAddToCartItem[]> = new Map();

export class WishlistService {

  static addToWishlist(userId: string, item: IAddToCartItem): void {
    const userWishlist = wishlistStore.get(userId) || [];

    const existingIndex = userWishlist.findIndex(
      (i) => i.productId === item.productId &&
        i.variationId === item.variationId &&
        i.attributeId === item.attributeId
    );

    if (existingIndex === -1) {
      userWishlist.push(item);
      wishlistStore.set(userId, userWishlist);
    } else {
      userWishlist[existingIndex].quantity = item.quantity;
      wishlistStore.set(userId, userWishlist);
    }
  }


  static getWishlist(userId: string): IAddToCartItem[] {
    return wishlistStore.get(userId) || [];
  }


  static removeFromWishlist(userId: string, productId: string, variationId: string, attributeId: string): boolean {
    const userWishlist = wishlistStore.get(userId) || [];

    const newWishlist = userWishlist.filter(
      (item) => !(item.productId === productId &&
        item.variationId === variationId &&
        item.attributeId === attributeId)
    );

    if (newWishlist.length < userWishlist.length) {
      wishlistStore.set(userId, newWishlist);
      return true;
    }
    return false;
  }


  static clearWishlist(userId: string): void {
    wishlistStore.delete(userId);
  }


  static getAllWishlists(): Map<string, IAddToCartItem[]> {
    return wishlistStore;
  }
}
