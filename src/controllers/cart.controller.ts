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
        const data = await response.json();
        return { success: true, message: data.message || "", data: data };
    } catch (error: any) {
        return { success: false, message: error.message || "Ürün sepete eklenemedi.", data: null };
    }
}

export async function getCartItems(req: Request): Promise<{ success: boolean; message: string; data: ICart | null }> {
    const authHeader = req.header("Authorization");
    const token = authHeader ? authHeader.split(" ")[1] : null;
    console.log("token", token);

    try {
        const response = await fetch(api_base_url + `/cart/getCart`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', ...(token && { "Authorization": `Bearer ${token}` }) },

        });
        const data = await response.json();

        console.log("data in getcartitems", data)

        return { success: true, message: data.message, data: data as ICart };
    } catch (error: any) {
        console.log("error get cart items", error)
        return { success: false, message: error.message || "Sepet verileri alınamadı.", data: null };
    }
}