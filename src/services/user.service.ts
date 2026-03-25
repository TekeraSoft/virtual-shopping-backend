// src/services/user.service.ts
import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { IUserPayload, TUserTypes } from "../types/user/types";
import { Friend, IFriend } from "@models/friend.model";
import { InvitationService } from "./invitation.service";
import { user_api_base_url } from "@lib/urls";


export class UserService {

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

    static async getUserInfoWithEmail(email: string): Promise<IUserPayload | null> {
        const normalizedEmail = email?.trim().toLowerCase();
        if (!normalizedEmail) {
            return null;
        }
        const url = `${user_api_base_url}/user/by-email?email=${encodeURIComponent(normalizedEmail)}`;
        return this.fetchUser(url);
    }

    static async getUserInfoWithId(id: string): Promise<IUserPayload | null> {
        const normalizedId = id?.trim();
        if (!normalizedId) {
            return null;
        }
        const url = `${user_api_base_url}/user/by-id/${encodeURIComponent(normalizedId)}`;
        return this.fetchUser(url);
    }
    /**
     * Add a friend to a user's friend list (persisted in DB)
     */
    static async addUserToFriendList(userId: string, friend: IUserPayload): Promise<void> {
        try {
            const newFriend = new Friend({
                userId,
                friendId: friend.userId,
                friendEmail: friend.email,
                friendName: friend.nameSurname
            });
            await newFriend.save();
            await this.removeUserFriendInvitation(userId, friend.userId);

        } catch (error: any) {
            // Ignore duplicate key errors (friend already added)
            if (error.code === 11000) {
                return;
            }
            console.error('Error adding friend to DB:', error);
            throw error;
        }
    }
    /**
     * Create a friend invitation (persisted in DB)
     * Note: the Invitation model stores inviter->friend mapping, so we invert parameters accordingly
     */
    static async inviteFriend(invitedId: string, inviterId: string): Promise<void> {
        try {
            // userId is the invited user's id in the old signature; friend.userId is inviter
            await InvitationService.createInvitation(invitedId, inviterId);
        } catch (error) {
            throw error;
        }
    }
    static async getUserFriendInvitations(userId: string): Promise<IUserPayload[]> {
        // Fetch invitations where friendId === userId
        try {
            const invitations = await InvitationService.getInvitationsForInvited(userId);
            const inviterIds = invitations.map(inv => inv.inviterId).filter(Boolean);
            const inviters = await Promise.all(inviterIds.map(id => this.getUserInfoWithId(id)));
            return inviters.filter((u): u is IUserPayload => !!u);
        } catch (error) {
            console.error('Error fetching invitations from DB:', error);
            return [];
        }
    }

    static async hasUserInvited(inviterId: string, invitedId: string): Promise<boolean> {
        try {
            const invitation = await InvitationService.getInvitation(inviterId, invitedId);
            return !!invitation;
        } catch (error) {
            console.error('Error checking invitation in DB:', error);
            return false
        }
    }

    static async removeUserFriendInvitation(userId: string, inviterId: string): Promise<void> {
        try {
            await InvitationService.removeInvitation(inviterId, userId);
            ;
        } catch (error) {
            console.error('Error removing invitation from DB:', error);
        }
    }

    /**
     * Get friends for a user from DB
     */
    static async getUserFriends(userId: string): Promise<IUserPayload[]> {
        try {
            const docs = await Friend.find({ userId }).sort({ createdAt: -1 }).lean();
            return await this.mapFriendsToPayload(docs);
        } catch (error) {
            console.error('Error fetching friends from DB:', error);
            throw new Error('Failed to fetch user friends.');
        }
    }
    static async removeAllFriends(): Promise<void> {
        try {
            await Friend.deleteMany({}).lean();
            console.log("All friends deleted from DB.");
        } catch (error) {
            console.error('Error deleting all friends from DB:', error);
            throw new Error('Tüm arkadaşlar silinemedi.');
        }
    }
    static async getAllFriends(): Promise<{ success: boolean; data: IFriend[] }> {
        try {
            const docs = await Friend.find({}).lean().exec();
            // lean().exec() returns mongoose documents which may include extra/internal fields;
            // cast via unknown first when the developer intentionally asserts this shape.
            return { success: true, data: docs as unknown as IFriend[] };
        } catch (error) {
            console.error('Error fetching all friends from DB:', error);
            return { success: false, data: [] };
        }
    }
    static async removeFriend(userId: string, friendId: string): Promise<boolean> {
        try {
            const result = await Friend.deleteMany({
                $or: [
                    { userId, friendId },
                    { userId: friendId, friendId: userId }
                ]
            }).lean();
            return (result.deletedCount || 0) > 0;
        } catch (error) {
            console.error('Error fetching friends from DB:', error);
            throw new Error('Arkadaşın silinemedi. Belki de hiç arkadaşın olmadı );');
        }
    }
    private static async mapFriendsToPayload(docs: any[]): Promise<IUserPayload[]> {
        const friendIds = docs.map(d => d.friendId).filter(Boolean);
        const users = await Promise.all(friendIds.map(id => this.getUserInfoWithId(id)));
        return users.filter((u): u is IUserPayload => !!u);
    }

    private static async fetchUser(url: string): Promise<IUserPayload | null> {
        try {
            const response = await fetch(url, { method: "GET" });
            if (!response.ok) {
                const raw = await response.text();
                console.log("[UserService] fetch non-200 body", { url, body: raw.slice(0, 400) });
                return null;
            }
            const raw = await response.text();
            const payload = raw ? JSON.parse(raw) : null;
            const data = payload?.data;
            if (!data) {
                console.log("[UserService] fetch missing data", { url, payload });
                return null;
            }
            return {
                userId: data.userId || "",
                phoneNumber: data.phoneNumber || "",
                roles: (data.roles || []).map((r: string) => r as TUserTypes),
                nameSurname: data.nameSurname || "",
                email: data.email || "",
                sub: data.email || data.userId || "",
                iat: 0,
                exp: 0,
                sellerId: data.sellerId || "",
                avatar: data.avatarId || undefined
            } as IUserPayload;
        } catch (error) {
            console.error("Error fetching user:", { url, error });
            return null;
        }
    }
}
