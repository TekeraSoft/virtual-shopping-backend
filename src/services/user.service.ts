// src/services/user.service.ts
import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { IUserPayload, TUserTypes } from "../types/user/types";
import { users } from "src/data/users";

class UserService {
    verifyToken(token: string): IUserPayload {
        try {
            if (!process.env.JWT_SECRET) {
                throw new Error("JWT_SECRET is not defined in environment variables.");
            }
            const secret = Buffer.from(process.env.JWT_SECRET, 'base64');
            const decoded = jwt.verify(token, secret, { algorithms: ['HS512'] });
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
    getUserInfoWithEmail(email: string): IUserPayload | null {

        const user = users.find(user => user.email === email);
        return user
            ? {
                ...user,
                roles: user.roles.map(role => role as TUserTypes),
                sellerId: user.sellerId ?? "",
            }
            : null;
    }
    getUserInfoWithId(id: string): IUserPayload | null {

        const user = users.find(user => user.userId === id);
        return user
            ? {
                ...user,
                roles: user.roles.map(role => role as TUserTypes),
                sellerId: user.sellerId ?? "",
            }
            : null;
    }

}

export default new UserService();