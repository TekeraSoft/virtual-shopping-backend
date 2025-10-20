
import { Request, Response } from "express";
import { WishlistService } from "@services/wishlist.service";
import { IAddToCartItem } from "src/types/cart/CartItem";
import { addToCart } from "./cart.controller";

export async function addToWishlist(req: Request, res: Response) {
    const user = req.user;

    if (!user || !user.userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const item: IAddToCartItem = req.body;

    if (!item || !item.productId) {
        return res.status(400).json({ error: "Invalid item data" });
    }

    WishlistService.addToWishlist(user.userId, item);
    const isAddedToCart = await addToCart(req, res);
    if(!isAddedToCart.success){
        return res.status(500).json({ error: "Failed to add item to cart" });
    }

    return res.status(200).json({
        success: true,
        message: "Item added to wishlist",
        data: isAddedToCart.data
    });
}

export async function getWishlist(req: Request, res: Response) {

    const wishlistUserId = req.query.wishListId as string;
    if (!wishlistUserId) {
        return res.status(400).json({ error: "wishListId query parameter is required" });
    }

    const wishlist = WishlistService.getWishlist(wishlistUserId);

    return res.status(200).json({ success: true, wishlist });
}

export async function removeFromWishlist(req: Request, res: Response) {
    const user = req.user;

    if (!user || !user.userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const { productId, variationId, attributeId } = req.body;

    if (!productId) {
        return res.status(400).json({ error: "Product ID is required" });
    }

    const removed = WishlistService.removeFromWishlist(
        user.userId,
        productId,
        variationId,
        attributeId
    );

    if (removed) {
        return res.status(200).json({
            success: true,
            message: "Item removed from wishlist",
            data: WishlistService.getWishlist(user.userId)
        });
    }

    return res.status(404).json({ error: "Item not found in wishlist" });
}