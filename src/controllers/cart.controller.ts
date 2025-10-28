import { Request } from "express";
import { api_base_url } from "src/lib/urls";
import { IAddToCartItem, ICart } from "src/schemas/cart.scheme";

export async function addToCart(req: Request): Promise<{ success: boolean; message: string; data: ICart | null }> {
    const cartItem: IAddToCartItem = req.body;
    const authHeader = req.header("Authorization");
    const token = authHeader ? authHeader.split(" ")[1] : null;
    console.log("token", token);
    console.log("cartItem", cartItem)
    try {
        const resp = await fetch(
            api_base_url + `/cart/addToCart`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token && { "Authorization": `Bearer ${token}` }) },
                body: JSON.stringify([cartItem]),
            }
        );
        const data = await resp.json();
        console.log("addtoCartData from api is success")
        return { success: true, message: data.message || "", data: data };

    } catch (error: Error | any) {
        console.log("error", error)
        return { success: false, message: error.message || "Ürün sepete eklenemedi.", data: null };
    }
}

export async function deleteFromCart(req: Request, attributeId: string): Promise<{ success: boolean; message: string; data: any | null }> {
    const authHeader = req.header("Authorization");
    const token = authHeader ? authHeader.split(" ")[1] : null;
    try {
        const response = await fetch(api_base_url + `/cart/removeFromCart?attributeId=${attributeId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', ...(token && { "Authorization": `Bearer ${token}` }) },

        });

        if (!response.ok) {
            return { success: false, message: "Failed to delete item from cart.", data: null };
        }

        return { success: true, message: "cart cleared", data: null };
    } catch (error: any) {
        return { success: false, message: error.message || "Ürün sepete eklenemedi.", data: null };
    }
}

export async function getCartItems(req: Request): Promise<{ success: boolean; message: string; data: ICart | null }> {
    const authHeader = req.header("Authorization");
    const token = authHeader ? authHeader.split(" ")[1] : null;
    console.log("token", token);

    try {
        const response = await fetch(api_base_url + `/cart/getCart?guestUserId=`,
            {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', ...(token && { "Authorization": `Bearer ${token}` }) },
                credentials: 'include',
            });


        // Check if the response body is empty
        if (!response.body || response.headers.get('content-length') === '0') {
            return { success: true, message: "Empty response body", data: null };
        }

        const data = await response.json();
        console.log("cartId in getcartitems", data.cartId);

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