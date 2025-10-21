import { Router } from 'express';
import { InvitationController } from '../controllers/invitation.controller';
import { authenticate } from '../middlewares/authtenticate.checker';

const invitationRouter = Router();

// Create a new invitation
invitationRouter.post('/create', authenticate, InvitationController.createInvitation);

// Get sent invitations
invitationRouter.get('/sent/:userId', authenticate, InvitationController.getSentInvitations);

// Get received invitations
invitationRouter.get('/received/:userId', authenticate, InvitationController.getReceivedInvitations);

// Accept invitation
invitationRouter.post('/accept', authenticate, InvitationController.acceptInvitation);

// Reject invitation
invitationRouter.post('/reject', authenticate, InvitationController.rejectInvitation);

// Get mutual invitations between two users
invitationRouter.get('/mutual/:userId1/:userId2', authenticate, InvitationController.getMutualInvitations);

// Admin routes
invitationRouter.get('/all', authenticate, InvitationController.getAllInvitations);
invitationRouter.delete('/cleanup', authenticate, InvitationController.cleanupExpiredInvitations);

export default invitationRouter;