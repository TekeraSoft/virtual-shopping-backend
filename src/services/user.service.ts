// src/services/user.service.ts
import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { IUserPayload, TUserTypes } from "../types/user/types";
import { users } from "src/data/users";
import { Friend } from "src/models/friend.model";
import { InvitationService } from "./invitation.service";


export class UserService {
    // Keep maps for backward compatibility in memory, but prefer DB-backed implementations below
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

            // Update in-memory cache for quick sync (optional)
            const friends = this.userFriends.get(userId) || [];
            friends.push(friend);
            this.userFriends.set(userId, friends);
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
    static async inviteUserFriend(userId: string, friend: IUserPayload): Promise<void> {
        try {
            // userId is the invited user's id in the old signature; friend.userId is inviter
            await InvitationService.createInvitation(friend.userId, userId);

            // Keep in-memory for compatibility
            const invitations = this.friendInvitations.get(userId) || [];
            invitations.push(friend);
            this.friendInvitations.set(userId, invitations);
        } catch (error) {
            throw error;
        }
    }
    static async getUserFriendInvitations(userId: string): Promise<IUserPayload[]> {
        // Fetch invitations where friendId === userId
        try {
            const invitations = await InvitationService.getInvitationsForInvited(userId);
            // Map to IUserPayload using the users data if available
            const inviters: IUserPayload[] = invitations.map(inv => {
                const inviterUser = users.find(u => u.userId === inv.userId);
                if (inviterUser) {
                    return {
                        ...inviterUser,
                        roles: inviterUser.roles.map(r => r as TUserTypes),
                        sellerId: inviterUser.sellerId ?? ""
                    } as IUserPayload;
                }
                // Fallback: minimal payload
                return {
                    userId: inv.userId,
                    phoneNumber: '',
                    roles: [],
                    nameSurname: '',
                    email: '',
                    sub: '',
                    iat: 0,
                    exp: 0,
                    sellerId: ''
                } as IUserPayload;
            });
            return inviters;
        } catch (error) {
            console.error('Error fetching invitations from DB:', error);
            // Fallback to in-memory
            return this.friendInvitations.get(userId) || [];
        }
    }

    static async hasUserInvited(userId: string, email: string): Promise<boolean> {
        try {
            const inviter = users.find(u => u.email === email);
            if (!inviter) return false;
            const invitation = await InvitationService.getInvitation(inviter.userId, userId);
            return !!invitation;
        } catch (error) {
            console.error('Error checking invitation in DB:', error);
            // Fallback to in-memory
            const myInvitations = this.friendInvitations.get(userId) || [];
            return !!myInvitations.find(invited => invited.email === email);
        }
    }

    static async removeUserFriendInvitation(userId: string, inviterId: string): Promise<void> {
        try {
            await InvitationService.removeInvitation(inviterId, userId);
            // Update in-memory cache
            const invitations = this.friendInvitations.get(userId) || [];
            const updatedInvitations = invitations.filter(invite => invite.userId !== inviterId);
            this.friendInvitations.set(userId, updatedInvitations);
        } catch (error) {
            console.error('Error removing invitation from DB:', error);
            // Fallback to in-memory
            const invitations = this.friendInvitations.get(userId) || [];
            const updatedInvitations = invitations.filter(invite => invite.userId !== inviterId);
            this.friendInvitations.set(userId, updatedInvitations);
        }
    }

    /**
     * Get friends for a user from DB
     */
    static async getUserFriends(userId: string): Promise<IUserPayload[]> {
        try {
            const docs = await Friend.find({ userId }).sort({ createdAt: -1 }).lean();
            const friendPayloads: IUserPayload[] = docs.map(d => {
                const user = users.find(u => u.userId === d.friendId);
                if (user) {
                    return {
                        ...user,
                        roles: user.roles.map(r => r as TUserTypes),
                        sellerId: user.sellerId ?? ""
                    } as IUserPayload;
                }
                return {
                    userId: d.friendId,
                    phoneNumber: '',
                    roles: [],
                    nameSurname: d.friendName || '',
                    email: d.friendEmail || '',
                    sub: '',
                    iat: 0,
                    exp: 0,
                    sellerId: ''
                } as IUserPayload;
            });

            // Update in-memory cache
            this.userFriends.set(userId, friendPayloads);
            return friendPayloads;
        } catch (error) {
            console.error('Error fetching friends from DB:', error);
            return this.userFriends.get(userId) || [];
        }
    }
}
