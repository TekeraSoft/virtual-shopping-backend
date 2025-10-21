import { Router } from 'express';
import { UserService } from '@services/user.service';
import { RoomService } from '@services/room.service';
import { responseTypes } from 'src/lib/responseTypes';
import { PlayerService } from '@services/player.service';

const roomRouter = Router();

// Add item to wishlist
roomRouter.post('/invite-friend', async (req, res) => {
    const { email, roomId, userId } = req.body;
    const io = req.io;
    if (!io) {
        res.status(500).json({ responseType: responseTypes.onlineStatusCannotChanged, message: 'Socket IO server not available.' });
        return;
    }

    const invitedUser = UserService.getUserInfoWithEmail(email);
    if (invitedUser) {
        const room = RoomService.getRoom(roomId);
        if (room) {
            if (room.invitedPlayers.has(invitedUser.userId)) {
                res.status(409).json({ responseType: responseTypes.userAlreadyInvitedToRoom, message: 'User already invited to room' });
                return;
            }
            if (room.players.has(invitedUser.userId)) {
                res.status(409).json({ responseType: responseTypes.userAlreadyInRoom, message: 'User already in room' });
                return;
            }
            room.invitedPlayers.set(invitedUser.userId, { nameSurname: invitedUser.nameSurname });
            const isPlayerOnline = PlayerService.getPlayer(invitedUser.userId);
            if (isPlayerOnline && isPlayerOnline.socketId) {
                io.to(isPlayerOnline.socketId).emit('room:invitation-received', {
                    roomId: roomId,
                    inviterName: UserService.getUserInfoWithId(userId)?.nameSurname,
                    message: `${UserService.getUserInfoWithId(userId)?.nameSurname} sizi odaya davet etti!`,
                    timestamp: Date.now()
                });
            }
            res.status(200).json({ responseType: responseTypes.roomInvitationSent, message: 'User invited to room' });
            return;
        } else {
            res.status(404).json({ responseType: responseTypes.roomNotFound, message: 'Room not found' });
            return;
        }
    } else {
        res.status(404).json({ responseType: responseTypes.userNotFound, message: 'User not found' });
        return;
    }
});



export default roomRouter;
