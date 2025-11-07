import { Request, Response } from 'express';
import { InvitationService } from '../services/invitation.service';
import { responseTypes } from '../lib/responseTypes';
import { users } from '@data/users';

export class InvitationController {

    /**
     * Create a new friend invitation
     */
    static async createInvitation(req: Request, res: Response): Promise<void> {
        try {
            const { userId, email } = req.body;

            const friendId = users.find(user => user.email === email)?.userId; //TODO: find user in db with email

            if (!friendId) {
                res.status(404).json({
                    success: false,
                    responseType: responseTypes.invitedUserNotFound,
                    message: 'Friend not found'
                });
                return;
            }

            if (!userId || !friendId) {
                res.status(400).json({
                    success: false,
                    responseType: responseTypes.userNotFound,
                    message: 'userId is required'
                });
                return;
            }

            if (userId === friendId) {
                res.status(400).json({
                    success: false,
                    responseType: responseTypes.cannotAddYourself,
                    message: 'Cannot send invitation to yourself'
                });
                return;
            }

            const invitation = await InvitationService.createInvitation(userId, friendId);

            res.status(201).json({
                success: true,
                responseType: responseTypes.invitationSent,
                message: 'Invitation sent successfully',
                data: invitation
            });
        } catch (error: any) {
            if (error.message === 'Invitation already exists') {
                res.status(409).json({
                    success: false,
                    responseType: responseTypes.friendRequestAlreadySent,
                    message: 'Invitation already exists'
                });
                return;
            }

            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
            console.error('Error creating invitation:', error);
            return;
        }
    }

    /**
     * Get invitations sent by a user
     */
    static async getSentInvitations(req: Request, res: Response): Promise<void> {
        try {
            const user = req.user;

            if (!user?.userId) {
                res.status(400).json({
                    success: false,
                    message: 'userId is required'
                });
                return;
            }

            const invitations = await InvitationService.getInvitationsForInviter(user.userId);

            res.status(200).json({
                success: true,
                message: 'Sent invitations retrieved successfully',
                data: invitations,
                count: invitations.length
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
            console.error('Error fetching sent invitations:', error);
        }
    }

    /**
     * Get invitations received by a user
     */
    static async getReceivedInvitations(req: Request, res: Response): Promise<void> {
        try {
            const { userId } = req.params;

            if (!userId) {
                res.status(400).json({
                    success: false,
                    message: 'userId is required'
                });
                return;
            }

            const invitations = await InvitationService.getInvitationsForInvited(userId);

            res.status(200).json({
                success: true,
                message: 'Received invitations retrieved successfully',
                data: invitations,
                count: invitations.length
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
            console.error('Error fetching received invitations:', error);
        }
    }

    /**
     * Accept a friend invitation
     */
    static async acceptInvitation(req: Request, res: Response): Promise<void> {
        try {
            const { userId, friendId } = req.body;

            if (!userId || !friendId) {
                res.status(400).json({
                    success: false,
                    message: 'userId and friendId are required'
                });
                return;
            }

            // Check if invitation exists
            const invitation = await InvitationService.getInvitation(friendId, userId);
            if (!invitation) {
                res.status(404).json({
                    success: false,
                    responseType: responseTypes.invitationNotFound,
                    message: 'Invitation not found'
                });
                return;
            }

            // Remove the invitation (since it's accepted)
            const removed = await InvitationService.removeInvitation(friendId, userId);

            if (removed) {
                res.status(200).json({
                    success: true,
                    responseType: responseTypes.invitationAccepted,
                    message: 'Invitation accepted successfully'
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Failed to process invitation'
                });
            }
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
            console.error('Error accepting invitation:', error);
        }
    }

    /**
     * Reject a friend invitation
     */
    static async rejectInvitation(req: Request, res: Response): Promise<void> {
        try {
            const { userId, friendId } = req.body;

            if (!userId || !friendId) {
                res.status(400).json({
                    success: false,
                    message: 'userId and friendId are required'
                });
                return;
            }

            // Check if invitation exists
            const invitation = await InvitationService.getInvitation(friendId, userId);
            if (!invitation) {
                res.status(404).json({
                    success: false,
                    responseType: responseTypes.invitationNotFound,
                    message: 'Invitation not found'
                });
                return;
            }

            // Remove the invitation (since it's rejected)
            const removed = await InvitationService.removeInvitation(friendId, userId);

            if (removed) {
                res.status(200).json({
                    success: true,
                    responseType: responseTypes.invitationRejected,
                    message: 'Invitation rejected successfully'
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Failed to process invitation'
                });
            }
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
            console.error('Error rejecting invitation:', error);
        }
    }

    /**
     * Get mutual invitations between two users
     */
    static async getMutualInvitations(req: Request, res: Response): Promise<void> {
        try {
            const { userId1, userId2 } = req.params;

            if (!userId1 || !userId2) {
                res.status(400).json({
                    success: false,
                    message: 'userId1 and userId2 are required'
                });
                return;
            }

            const mutualInvitations = await InvitationService.getMutualInvitation(userId1, userId2);

            res.status(200).json({
                success: true,
                message: 'Mutual invitations retrieved successfully',
                data: mutualInvitations
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
            console.error('Error fetching mutual invitations:', error);
        }
    }

    /**
     * Get all invitations (admin only)
     */
    static async getAllInvitations(req: Request, res: Response): Promise<void> {
        try {
            const limit = parseInt(req.query.limit as string) || 100;
            const skip = parseInt(req.query.skip as string) || 0;

            const [invitations, totalCount] = await Promise.all([
                InvitationService.getAllInvitations(limit, skip),
                InvitationService.getInvitationCount()
            ]);

            res.status(200).json({
                success: true,
                message: 'All invitations retrieved successfully',
                data: invitations,
                pagination: {
                    total: totalCount,
                    limit,
                    skip,
                    hasMore: skip + limit < totalCount
                }
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
            console.error('Error fetching all invitations:', error);
        }
    }

    /**
     * Clean up expired invitations
     */
    static async cleanupExpiredInvitations(req: Request, res: Response): Promise<void> {
        try {
            const days = parseInt(req.query.days as string) || 30;

            const removedCount = await InvitationService.removeExpiredInvitations(days);

            res.status(200).json({
                success: true,
                message: `Cleanup completed. ${removedCount} expired invitations removed.`,
                removedCount
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
            console.error('Error cleaning up expired invitations:', error);
        }
    }

    static async clearAllInvitations(req: Request, res: Response): Promise<void> {
        try {
            await InvitationService.clearAllInvitations();

            res.status(200).json({
                success: true,
                message: 'All invitations removed successfully'
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
            console.error('Error removing all invitations:', error);
        }
    }

    static async dropIndexes(req: Request, res: Response) {
        try {
            await InvitationService.dropIndexes();
            res.status(200).json({
                success: true,
                message: "Indexes dropped successfully"
            });
        } catch (error) {
            console.error('Error dropping indexes:', error);
            res.status(500).json({ error: "Failed to drop indexes" });
        }
    }
}