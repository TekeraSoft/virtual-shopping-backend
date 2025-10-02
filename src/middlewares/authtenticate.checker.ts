

import { Request, Response, NextFunction } from "express";
import { IUserPayload } from "../types/user/types";
import userService from "../services/user.service";

interface CustomRequest extends Request {
    user?: IUserPayload;
}

export const authenticate = async (
    req: CustomRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {


    const cookie = req.header("cookie");
    if (!cookie) {
        res.status(401).json({ message: "Access denied. Cookie yok" });
        return;
    }

    const cookies = cookie.split(";"); // Her bir cookie çiftini ayır
    const tokenCookie = cookies.find((c) => c.trim().startsWith("token="));
    if (!tokenCookie) {
        res.status(401).json({ message: "Access denied. Token yok" });
        return;
    }
    try {
        const token = tokenCookie.split("=")[1];
        const user = userService.verifyToken(token);
        // const user = await userService.getUserById(decoded._id.toString());

        if (!user) {

            res.status(404).json({ message: "Kullanıcı bulunamadı." });
            return;
        }

        req.user = user;
    } catch (error: any) {
        // Hata türüne göre yanıt döndür
        if (error.message === "Token süresi dolmuş. Lütfen tekrar giriş yapın.") {

            res.status(401).json({ message: error.message });
            return;
        } else if (error.message === "Geçersiz token. Lütfen tekrar giriş yapın.") {

            res.status(401).json({ message: error.message });
            return;
        } else {

            res.status(401).json({
                message: "Bilinmeyen bir hata oluştu. Lütfen tekrar deneyin.",
            });
            return;
        }
    }

    next();

    return;
};