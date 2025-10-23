
import { Request, Response } from "express";
import { WishlistService } from "@services/wishlist.service";
import { addToCart, clearCart, deleteFromCart, getCartItems } from "./cart.controller";
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
    console.log("Item added to cart:", isAddedToCart.data.id);
    await WishlistService.addToWishlist(isAddedToCart.data);
    console.log("wishliste eklendi.")
    res.status(200).json({
        success: true,
        message: "Item added to wishlist",
        wishlist: isAddedToCart.data
    });
    console.log("response döndü.");
    return;
}

export async function getWishlist(req: Request, res: Response) {

    const wishlistUserId = req.query.wishListId as string;
    if (!wishlistUserId) {
        res.status(400).json({ error: "wishListId query parameter is required" });
        return;
    }

    const wishlist = await WishlistService.getWishlist(wishlistUserId);
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
    const getMyWishlist = await WishlistService.getWishlist(user.userId);
    if (!getMyWishlist && cart.data?.id) {
        await WishlistService.addToWishlist(cart.data);
    }
    if (!cart.success) {
        res.status(500).json({ error: "Failed to retrieve my cart items" });
        return;
    }
    if (!cart.data?.cartItems?.length) {
        res.status(200).json({ wishlist: null });
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

    console.log("Item removed from cart:", isDeletedFromCart.data);

    const cart = await getCartItems(req);
    if (!cart.success) {
        res.status(500).json({ error: "Failed to retrieve cart items" });
        return;
    }

    if (!cart.data) {
        res.status(404).json({ error: "Item not found in wishlist" });
        return;
    }

    const removed = await WishlistService.removeFromWishlist(cart.data);

    if (removed) {
        res.status(200).json({
            success: true,
            message: "Item removed from wishlist",
            wishlist: WishlistService.getWishlist(user.userId)
        });
        return;
    }
    res.status(404).json({ error: "Item not found in wishlist" });
    return;
}

export async function clearWishlist(req: Request, res: Response) {
    const user = req.user;

    if (!user || !user.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }

    await WishlistService.clearWishlist(user.userId);
    try {

        const response = await clearCart(req);

        if (!response.success) {
            res.status(500).json({ error: "Failed to clear cart" });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Wishlist cleared",
            wishlist: null
        });
        return
    } catch (error) {
        console.error('Error clearing wishlist:', error);
        res.status(500).json({ error: "Failed to clear wishlist" });
        return;
    }
}