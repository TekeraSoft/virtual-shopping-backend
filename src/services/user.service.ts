// src/services/user.service.ts
import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { IUserPayload, TUserTypes } from "../types/user/types";
import { users } from "src/data/users";


export class UserService {
    private static userFriends: Map<string, IUserPayload[]> = new Map();
    private static friendInvitations: Map<string, IUserPayload[]> = new Map();
    static verifyToken(token: string): IUserPayload {
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
    static getUserInfoWithEmail(email: string): IUserPayload | null {

        const user = users.find(user => user.email === email);
        return user
            ? {
                ...user,
                roles: user.roles.map(role => role as TUserTypes),
                sellerId: user.sellerId ?? "",
            }
            : null;
    }
    static getUserInfoWithId(id: string): IUserPayload | null {

        const user = users.find(user => user.userId === id);
        return user
            ? {
                ...user,
                roles: user.roles.map(role => role as TUserTypes),
                sellerId: user.sellerId ?? "",
                friends: this.userFriends.get(id) || [],
            }
            : null;
    }
    static addUserFriend(userId: string, friend: IUserPayload): void {
        const friends = this.userFriends.get(userId) || [];
        friends.push(friend);
        this.userFriends.set(userId, friends);
    }
    static inviteUserFriend(userId: string, friend: IUserPayload): void {
        const invitations = this.friendInvitations.get(userId) || [];
        invitations.push(friend);
        this.friendInvitations.set(userId, invitations);
    }
    static getUserFriendInvitations(userId: string): IUserPayload[] {
        return this.friendInvitations.get(userId) || [];
    }
    static hasUserInvited(email: string, userId: string): boolean {
        const invitations = this.friendInvitations.get(userId) || [];
        return invitations.some(invitation => invitation.email === email);
    }
}
