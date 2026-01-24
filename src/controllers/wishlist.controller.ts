
import { Request, Response } from "express";
import { WishlistService } from "@services/wishlist.service";
import { addToCart, clearCart, deleteFromCart, getCartItems } from "./cart.controller";
import { IAddToCartItem } from "@schemas/cart.scheme";
import { cartSummarizer } from "@lib/cartSummarizer";

export async function addToWishlist(req: Request, res: Response) {
    const user = req.user;

    if (!user || !user.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }

    const body = req.body;
    const sellerListingId = body.sellerListingId || body.attributeId;
    
    if (!sellerListingId || !body.quantity || body.quantity < 1) {
        console.log("addToWishlist invalid data:", JSON.stringify(body));
        res.status(400).json({ error: "Invalid item data. sellerListingId/attributeId and quantity are required" });
        return;
    }

    req.body = {
        sellerListingId: sellerListingId,
        quantity: body.quantity
    };

    const isAddedToCart = await addToCart(req);
    if (!isAddedToCart.success || !isAddedToCart.data) {
        res.status(500).json({ error: isAddedToCart.message || "Failed to add item to cart" });
        return;
    }
    const newWishList = await getCartItems(req);
    if (!newWishList.success || !newWishList.data) {
        res.status(500).json({ error: newWishList.message || "Failed to retrieve cart items" });
        return;
    }
    await WishlistService.addToWishlist(newWishList.data);
    console.log("wishliste eklendi.")
    res.status(200).json({
        success: true,
        message: "Item added to wishlist",
        wishlist: newWishList.data
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
    console.log("getMyWishlist cartId", cart.data?.id)
    const wishlistId = cart.data?.id ?? user.userId;
    const getMyWishlist = await WishlistService.getWishlist(wishlistId);
    if (!getMyWishlist && cart.data?.id) {
        try {
            await WishlistService.addToWishlist(cart.data);
        } catch (error) {
            // console.error('Error adding to wishlist:', error);
            res.status(500).json({ error: "Failed to add to wishlist in getMyWishlist" });
            return;
        }

    }
    if (!cart.success) {
        res.status(500).json({ error: "Failed to retrieve my cart items" });
        return;
    }
    if (!cartSummarizer(cart.data)) {
        res.status(200).json({ wishlist: null });
        return;
    }
    res.status(200).json({ success: true, wishlist: cart.data });
    return;
}

export async function removeFromWishlist(req: Request, res: Response) {
    const user = req.user;
    const sellerListingId = (req.query.sellerListingId as string) || (req.query.attributeId as string);

    if (!user || !user.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    if (!sellerListingId) {
        console.log("removeFromWishlist missing param:", JSON.stringify(req.query));
        res.status(400).json({ error: "sellerListingId or attributeId is required" });
        return;
    }

    const cart = await getCartItems(req);
    if (!cart.success) {
        res.status(500).json({ error: "Failed to retrieve cart items" });
        return;
    }
    
    const cartId = cart.data?.id;
    console.log("removeFromWishlist cartId", cartId, "sellerListingId", sellerListingId);

    const isDeletedFromCart = await deleteFromCart(req, sellerListingId, cartId);
    if (!isDeletedFromCart.success) {
        res.status(500).json({ error: isDeletedFromCart.message || "Failed to remove item from cart" });
        return;
    }

    console.log("Item removed from cart:", isDeletedFromCart.data);

    const updatedCart = await getCartItems(req);
    const wishlistId = updatedCart.data?.id ?? user.userId;
    
    if (!updatedCart.success) {
        res.status(500).json({ error: "Failed to retrieve updated cart items" });
        return;
    }

    if (!updatedCart.data) {
        res.status(200).json({ wishlist: null });
        await WishlistService.clearWishlist(wishlistId);
        return;
    }

    const removed = await WishlistService.removeFromWishlist(updatedCart.data);

    if (removed) {
        const updatedWishlist = await WishlistService.getWishlist(wishlistId);
        res.status(200).json({
            success: true,
            message: "Item removed from wishlist",
            wishlist: updatedWishlist
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

    const cart = await getCartItems(req);
    const wishlistId = cart.success && cart.data?.id ? cart.data.id : user.userId;

    await WishlistService.clearWishlist(wishlistId);
    try {

        const response = await clearCart(req);

        if (!response.success) {
            console.log("Failed to clear cart while clearing wishlist");
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

export async function clearAllWishlists(req: Request, res: Response) {
    try {
        await WishlistService.clearAllWishlists();
        res.status(200).json({
            success: true,
            message: "All wishlists cleared"
        });
    } catch (error) {
        console.error('Error clearing all wishlists:', error);
        res.status(500).json({ error: "Failed to clear all wishlists" });
    }
}

export async function getAllWishlists(req: Request, res: Response) {

    try {
        const wishlists = await WishlistService.getAllWishlist();
        res.status(200).json({ success: true, wishlists });
    } catch (error) {
        console.error('Error retrieving all wishlists:', error);
        res.status(500).json({ error: "Failed to retrieve all wishlists" });
    }
}

export async function dropIndexes(req: Request, res: Response) {
    try {
        await WishlistService.dropIndexes();
        res.status(200).json({
            success: true,
            message: "Indexes dropped successfully"
        });
    } catch (error) {
        console.error('Error dropping indexes:', error);
        res.status(500).json({ error: "Failed to drop indexes" });
    }
}

export async function createIndexes(req: Request, res: Response) {
    try {
        await WishlistService.createIndexes();
        res.status(200).json({
            success: true,
            message: "Indexes created successfully"
        });
    } catch (error) {
        console.error('Error creating indexes:', error);
        res.status(500).json({ error: "Failed to create indexes" });
    }
}
