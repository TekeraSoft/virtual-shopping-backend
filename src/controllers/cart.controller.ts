import { Request } from "express";
import { api_base_url } from "@lib/urls";
import { IAddToCartItem, ICart } from "@schemas/cart.scheme";

export async function addToCart(req: Request): Promise<{ success: boolean; message: string; data: ICart | null }> {
    const body = req.body;
    const authHeader = req.header("Authorization");
    const token = authHeader ? authHeader.split(" ")[1] : null;
    
    const sellerListingId = body.sellerListingId || body.attributeId;
    const quantity = body.quantity;
    
    if (!sellerListingId || !quantity || quantity < 1) {
        return { success: false, message: "sellerListingId and quantity are required", data: null };
    }
    
    console.log("addToCart - sellerListingId:", sellerListingId, "quantity:", quantity);
    
    try {
        const url = api_base_url + `/cart/addToCart`;
        const requestBody = {
            sellerListingId: sellerListingId,
            quantity: String(quantity),
        };
        const bodyString = JSON.stringify(requestBody);
        console.log("addToCart URL", url);
        console.log("addToCart request body", bodyString);
        
        const resp = await fetch(
            url,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token && { "Authorization": `Bearer ${token}` }) },
                body: bodyString,
            }
        );

        const contentType = resp.headers.get("content-type") || "";
        const raw = await resp.text();
        console.log("addToCart status", resp.status, contentType);
        console.log("addToCart raw body (first 400)", raw.slice(0, 400));

        if (!resp.ok) {
            return { success: false, message: `addToCart http ${resp.status}`, data: null };
        }

        let data: any;
        try {
            data = contentType.includes("application/json") ? JSON.parse(raw) : JSON.parse(raw);
        } catch (e: any) {
            return { success: false, message: "addToCart json parse failed", data: null };
        }

        console.log("addtoCartData from api is success");
        return { success: true, message: data.message || "", data: data as ICart };

    } catch (error: Error | any) {
        console.log("error", error)
        return { success: false, message: error.message || "Ürün sepete eklenemedi.", data: null };
    }
}

export async function deleteFromCart(req: Request, sellerListingId: string, cartId?: string): Promise<{ success: boolean; message: string; data: any | null }> {
    const authHeader = req.header("Authorization");
    const token = authHeader ? authHeader.split(" ")[1] : null;
    const user = req.user as any;

    const cartOwnerId = cartId || user?.userId;
    
    if (!cartOwnerId) {
        return { success: false, message: "cartId or userId is required", data: null };
    }
    
    try {
        const url = api_base_url + `/cart/removeFromCart`;
        const requestBody = {
            cartId: cartId || cartOwnerId,
            sellerListingId: sellerListingId
        };
        const bodyString = JSON.stringify(requestBody);
        console.log("deleteFromCart URL", url);
        console.log("deleteFromCart request body", bodyString);
        
        const response = await fetch(url, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', ...(token && { "Authorization": `Bearer ${token}` }) },
            body: bodyString,
        });

        const contentType = response.headers.get("content-type") || "";
        const raw = await response.text();
        console.log("deleteFromCart status", response.status, contentType);
        console.log("deleteFromCart raw body (first 400)", raw.slice(0, 400));

        if (!response.ok) {
            return { success: false, message: `deleteFromCart http ${response.status}: ${raw.slice(0, 200)}`, data: null };
        }

        return { success: true, message: "Item removed from cart", data: null };
    } catch (error: any) {
        console.log("deleteFromCart error", error);
        return { success: false, message: error.message || "Ürün sepete eklenemedi.", data: null };
    }
}

export async function getCartItems(req: Request): Promise<{ success: boolean; message: string; data: ICart | null }> {
    const authHeader = req.header("Authorization");
    const token = authHeader ? authHeader.split(" ")[1] : null;
    console.log("token", token);

    try {
        const user = req.user as any;
        const cartOwnerId = user?.userId;
        const url = api_base_url + (cartOwnerId ? `/cart/getCart?cartOwnerId=${cartOwnerId}` : `/cart/getCart?guestUserId=`);
        console.log("getCartItems URL", url);
        const response = await fetch(url,
            {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', ...(token && { "Authorization": `Bearer ${token}` }) },
                credentials: 'include',
            });


        const contentType = response.headers.get("content-type") || "";
        const raw = await response.text();
        console.log("getCartItems status", response.status, contentType);
        console.log("getCartItems raw body (first 400)", raw.slice(0, 400));

        if (!response.ok) {
            return { success: false, message: `getCartItems http ${response.status}`, data: null };
        }

        let data: any;
        try {
            data = contentType.includes("application/json") ? JSON.parse(raw) : JSON.parse(raw);
        } catch (e: any) {
            return { success: false, message: "getCartItems json parse failed", data: null };
        }

        console.log("cartId in getcartitems", data.id);

        return { success: true, message: data.message, data: data as ICart };
    } catch (error: any) {
        console.log("error get cart items", error);
        return { success: false, message: error.message || "Sepet verileri alınamadı.", data: null };
    }
}

export async function clearCart(req: Request): Promise<{ success: boolean; message: string; data: any | null }> {
    const user = req.user;
    if (!user || !user.userId) {
        return { success: false, message: "Unauthorized", data: null };
    }
    const authHeader = req.header("Authorization");
    const token = authHeader ? authHeader.split(" ")[1] : null;
    try {
        const response = await fetch(api_base_url + `/cart/clearCart?cartOwnerId=${user?.userId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', ...(token && { "Authorization": `Bearer ${token}` }) },

        });
        console.log("response clear", response)
        if (!response.ok) {
            return { success: false, message: "Failed to clear cart.", data: null };
        }
        return { success: true, message: "Cart cleared", data: null };
    } catch (error: any) {
        return { success: false, message: error.message || "Sepet temizlenemedi.", data: null };
    }
}
