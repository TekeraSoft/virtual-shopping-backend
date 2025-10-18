

import { Request, Response, NextFunction } from "express";
import { IUserPayload } from "../types/user/types";
import { UserService } from "@services/user.service";

interface CustomRequest extends Request {
    user?: IUserPayload;
}

export const authenticate = async (
    req: CustomRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {



    const authHeader = req.header("Authorization");

    if (!authHeader) {
        res.status(401).json({ message: "Access denied. Authorization header yok" });
        return;
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        res.status(401).json({ message: "Access denied. Token yok" });
        return;
    }

    try {

        const user = UserService.verifyToken(token);

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