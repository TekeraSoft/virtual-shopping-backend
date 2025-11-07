import { Invitation, IInvitation } from '../models/invitation.model';

export class InvitationService {

    static async dropIndexes(): Promise<void> {
        try {
            await Invitation.collection.dropIndexes();
        } catch (error) {
            console.error('Error dropping indexes:', error);
            throw error;
        }
    }

    /**
     * Create a new invitation
     * @param userId - ID of the user sending the invitation
     * @param friendId - ID of the user receiving the invitation
     * @returns Created invitation document
     * @throws Error if invitation already exists
     */

    static async createInvitation(invitedId: string, inviterId: string): Promise<IInvitation> {
        try {
            const newInvitation = new Invitation({
                inviterId,
                invitedId
            });

            const savedInvitation = await newInvitation.save();
            return savedInvitation;
        } catch (error: any) {
            // MongoDB unique constraint error
            if (error.code === 11000) {
                throw new Error('Invitation already exists');
            }
            throw error;
        }
    }

    /**
     * Get all invitations sent by a specific user
     * @param userId - ID of the user who sent invitations
     * @returns Array of invitations sent by the user
     */
    static async getInvitationsForInviter(userId: string): Promise<IInvitation[]> {
        try {
            const invitations = await Invitation.find({ inviterId: userId }).sort({ createdAt: -1 });
            return invitations;
        } catch (error) {
            console.error('Error fetching invitations for inviter:', error);
            return [];
        }
    }

    /**
     * Get all invitations received by a specific user
     * @param friendId - ID of the user who received invitations
     * @returns Array of invitations received by the user
     */
    static async getInvitationsForInvited(friendId: string): Promise<IInvitation[]> {
        try {
            const invitations = await Invitation.find({ invitedId: friendId }).sort({ createdAt: -1 });
            return invitations;
        } catch (error) {
            console.error('Error fetching invitations for invited user:', error);
            return [];
        }
    }

    /**
     * Remove/delete an invitation
     * @param userId - ID of the user who sent the invitation
     * @param friendId - ID of the user who received the invitation
     * @returns true if invitation was removed, false if not found
     */
    static async removeInvitation(userId: string, friendId: string): Promise<boolean> {
        try {
            const result = await Invitation.deleteOne({ inviterId: userId, invitedId: friendId });
            return result.deletedCount > 0;
        } catch (error) {
            console.error('Error removing invitation:', error);
            return false;
        }
    }

    /**
     * Check if invitation exists between two users
     * @param userId - ID of the user who sent the invitation
     * @param friendId - ID of the user who received the invitation
     * @returns Invitation document if exists, null otherwise
     */
    static async getInvitation(userId: string, friendId: string): Promise<IInvitation | null> {
        try {
            const invitation = await Invitation.findOne({ inviterId: userId, invitedId: friendId });
            return invitation;
        } catch (error) {
            console.error('Error fetching invitation:', error);
            return null;
        }
    }

    /**
     * Check if there's a mutual invitation (both users invited each other)
     * @param userId1 - First user ID
     * @param userId2 - Second user ID
     * @returns Object with both invitations if they exist
     */
    static async getMutualInvitation(userId1: string, userId2: string): Promise<{
        user1ToUser2: IInvitation | null;
        user2ToUser1: IInvitation | null;
    }> {
        try {
            const [invitation1, invitation2] = await Promise.all([
                Invitation.findOne({ inviterId: userId1, invitedId: userId2 }),
                Invitation.findOne({ inviterId: userId2, invitedId: userId1 })
            ]);

            return {
                user1ToUser2: invitation1,
                user2ToUser1: invitation2
            };
        } catch (error) {
            console.error('Error fetching mutual invitations:', error);
            return {
                user1ToUser2: null,
                user2ToUser1: null
            };
        }
    }

    /**
     * Get all invitations in the system (for admin purposes)
     * @param limit - Maximum number of invitations to return
     * @param skip - Number of invitations to skip (for pagination)
     * @returns Array of all invitations
     */
    static async getAllInvitations(limit: number = 100, skip: number = 0): Promise<IInvitation[]> {
        try {
            const invitations = await Invitation.find()
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(skip);
            return invitations;
        } catch (error) {
            console.error('Error fetching all invitations:', error);
            return [];
        }
    }

    /**
     * Get total count of invitations in the system
     * @returns Total number of invitations
     */
    static async getInvitationCount(): Promise<number> {
        try {
            const count = await Invitation.countDocuments();
            return count;
        } catch (error) {
            console.error('Error counting invitations:', error);
            return 0;
        }
    }

    /**
     * Clear all invitations (for testing purposes)
     * @returns Number of deleted invitations
     */
    static async clearAllInvitations(): Promise<number> {
        try {
            const result = await Invitation.deleteMany({});
            return result.deletedCount || 0;
        } catch (error) {
            console.error('Error clearing all invitations:', error);
            return 0;
        }
    }

    /**
     * Get invitations by date range
     * @param startDate - Start date
     * @param endDate - End date
     * @returns Array of invitations within the date range
     */
    static async getInvitationsByDateRange(startDate: Date, endDate: Date): Promise<IInvitation[]> {
        try {
            const invitations = await Invitation.find({
                createdAt: {
                    $gte: startDate,
                    $lte: endDate
                }
            }).sort({ createdAt: -1 });
            return invitations;
        } catch (error) {
            console.error('Error fetching invitations by date range:', error);
            return [];
        }
    }

    /**
     * Remove expired invitations (older than specified days)
     * @param days - Number of days after which invitations are considered expired
     * @returns Number of removed invitations
     */
    static async removeExpiredInvitations(days: number = 30): Promise<number> {
        try {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() - days);

            const result = await Invitation.deleteMany({
                createdAt: { $lt: expiryDate }
            });

            return result.deletedCount || 0;
        } catch (error) {
            console.error('Error removing expired invitations:', error);
            return 0;
        }
    }
}