import { Request, Response } from "express";
import { api_base_url } from "src/lib/urls";
import { IAddToCartItem } from "src/types/cart/CartItem";

export async function addToCart(req: Request, res: Response) {
    const cartItem: IAddToCartItem = req.body;
    const authHeader = req.header("Authorization");
    const token = authHeader ? authHeader.split(" ")[1] : null;
    console.log("token", token);

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
        console.log("addtoCartData", data)
        return { success: true, message: data.message || "", data: data };

    } catch (error: Error | any) {

        return { success: false, message: error.message || "Ürün sepete eklenemedi.", data: null };
    }
}