
import { Request, Response } from "express";
import { WishlistService } from "@services/wishlist.service";
import { addToCart, deleteFromCart, getCartItems } from "./cart.controller";
import { IAddToCartItem } from "src/schemas/cart.scheme";

export async function addToWishlist(req: Request, res: Response) {
    const user = req.user;

    if (!user || !user.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }

    const item: IAddToCartItem = req.body;

    if (!item || !item.productId) {
        res.status(400).json({ error: "Invalid item data" });
        return;
    }


    const isAddedToCart = await addToCart(req);
    if (!isAddedToCart.success || !isAddedToCart.data) {
        res.status(500).json({ error: isAddedToCart.message || "Failed to add item to cart" });
        return;
    }
    WishlistService.addToWishlist(user.userId, isAddedToCart.data);
    res.status(200).json({
        success: true,
        message: "Item added to wishlist",
        data: isAddedToCart.data
    });
    return;
}

export async function getWishlist(req: Request, res: Response) {

    const wishlistUserId = req.query.wishListId as string;
    if (!wishlistUserId) {
        res.status(400).json({ error: "wishListId query parameter is required" });
        return;
    }

    const wishlist = WishlistService.getWishlist(wishlistUserId);
    res.status(200).json({ success: true, wishlist });
    return;
}

export async function getMyWishlist(req: Request, res: Response) {

    const user = req.user;
    if (!user || !user.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }

    const cart = await getCartItems(req);
    if (!cart.success || !cart.data) {
        res.status(500).json({ error: "Failed to retrieve cart items" });
        return;
    }
    res.status(200).json({ success: true, wishlist: cart.data });
    return;
}

export async function removeFromWishlist(req: Request, res: Response) {
    const user = req.user;
    const attributeId = req.query.attributeId as string;

    if (!user || !user.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    if (!attributeId) {
        res.status(400).json({ error: "attributeId is required" });
        return;
    }

    const isDeletedFromCart = await deleteFromCart(req, attributeId);
    if (!isDeletedFromCart.success) {
        res.status(500).json({ error: "Failed to remove item from cart" });
        return;
    }

    const cart = await getCartItems(req);
    if (!cart.success || !cart.data) {
        res.status(500).json({ error: "Failed to retrieve cart items" });
        return;
    }

    const removed = WishlistService.removeFromWishlist(user.userId, cart.data);

    if (removed) {
        res.status(200).json({
            success: true,
            message: "Item removed from wishlist",
            data: WishlistService.getWishlist(user.userId)
        });
        return;
    }
    res.status(404).json({ error: "Item not found in wishlist" });
    return;
}