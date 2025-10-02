// src/services/user.service.ts
import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { IUserPayload } from "../types/user/types";

class UserService {
    verifyToken(token: string): IUserPayload {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as IUserPayload;
            return decoded as IUserPayload;
        } catch (error) {
            if (error instanceof TokenExpiredError) {
                console.error("TokenExpiredError: Token süresi dolmuş.");
                throw new Error("Token süresi dolmuş. Lütfen tekrar giriş yapın.");
            } else if (error instanceof JsonWebTokenError) {
                console.error("JsonWebTokenError: Token doğrulanamadı.");
                throw new Error("Geçersiz token. Lütfen tekrar giriş yapın.");
            } else {
                console.error("Bilinmeyen bir hata oluştu:", error);
                throw new Error("Bilinmeyen bir hata oluştu. Lütfen tekrar deneyin.");
            }
        }
    }
}

export default new UserService();