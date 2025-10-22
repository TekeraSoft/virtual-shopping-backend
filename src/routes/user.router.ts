import { Router } from 'express';
import { PlayerService } from '@services/player.service';
import { UserService } from '@services/user.service';
import { responseTypes } from 'src/lib/responseTypes';
import { authenticate } from '@middlewares/authtenticate.checker';

const userRouter = Router();

// Add item to wishlist
userRouter.post('/invite-friend', authenticate, async (req, res) => {
    const { email } = req.body;
    const user = req.user;
    if (!user || !user.userId) {
        res.status(401).json({ responseType: "Unauthorized", message: 'Unauthorized' });
        return;
    }
    const io = req.io;
    if (!io) {
        res.status(500).json({ responseType: responseTypes.onlineStatusCannotChanged, message: 'Socket IO server not available.' });
        return;
    }

    const metaUser = UserService.getUserInfoWithId(user.userId);
    if (!metaUser) {
        res.status(422).json({ responseType: responseTypes.userNotFound, message: 'Kullanıcı bulunamadı.' });
        return;
    }
    const myFriends = await UserService.getUserFriends(user.userId) || [];

    if (myFriends.find(friend => friend.email === email)) {
        res.status(403).json({ responseType: responseTypes.userAlreadyFriend, message: 'User is already your friend' });
        return;
    }
    const invitedUser = UserService.getUserInfoWithEmail(email);
    if (!invitedUser) {
        res.status(404).json({ responseType: responseTypes.invitedUserNotFound, message: 'Davet edilen kullanıcı bulunamadı.' });
        return;
    }
    const invitedUserInviteMe = await UserService.hasUserInvited(metaUser.userId, invitedUser.userId);
    if (invitedUserInviteMe) {
        console.log("inviteduser invite me")
        await UserService.addUserToFriendList(user.userId, invitedUser);
        await UserService.addUserToFriendList(invitedUser.userId, metaUser);
        const inviterPlayer = PlayerService.getPlayer(invitedUser.userId);
        const invitedPlayer = PlayerService.getPlayer(user.userId);
        if (inviterPlayer) {
            console.log("inviterPlayer.socketId", inviterPlayer.socketId)
            const playerFriends = await UserService.getUserFriends(inviterPlayer.userId);
            const playerFriendList = playerFriends.map((friend) => {
                const player = {
                    userId: friend.userId,
                    email: friend.email,
                    nameSurname: friend.nameSurname,
                    online: PlayerService.getPlayer(friend.userId)?.online || false
                };
                return player;
            });

            console.log("playerFriendList invitedPlayer", playerFriendList)
            io.to(inviterPlayer.socketId || '').emit('friend:added', playerFriendList);
        }
        if (invitedPlayer) {
            console.log("invitedPlayer.socketId", invitedPlayer.socketId)
            const playerFriends = await UserService.getUserFriends(invitedPlayer.userId) || [];
            const playerFriendList = playerFriends.map((friend) => {
                const player = {
                    userId: friend.userId,
                    email: friend.email,
                    nameSurname: friend.nameSurname,
                    online: PlayerService.getPlayer(friend.userId)?.online || false
                };
                return player;
            });

            console.log("playerFriendList invitedPlayer", playerFriendList)
            io.to(invitedPlayer.socketId || '').emit('friend:added', playerFriendList);
        }


        res.status(201).json({ responseType: responseTypes.invitationTwoDirectional, message: 'Bu kullanıcı sizi zaten davet etti. Davet otomatik olarak kabul edildi.', });
        return;
    }
    const hasInvited = await UserService.hasUserInvited(invitedUser.userId, metaUser.userId);
    if (hasInvited) {
        res.status(409).json({ responseType: responseTypes.friendRequestAlreadySent, message: 'You have already invited this user' });
        return;
    }

    const userInvited = UserService.getUserInfoWithEmail(email)
    const userInviter = UserService.getUserInfoWithId(user.userId);
    if (userInvited && userInviter) {
        console.log("userInvited ve inviter var")
        await UserService.inviteUserFriend(userInvited.userId, userInviter);

        // Check if invited user is online and send socket notification
        const invitedPlayer = PlayerService.getPlayer(userInvited.userId);
        console.log("invitedPlayer", invitedPlayer)
        if (invitedPlayer) {
            console.log("invited player var ve online")
            const invitedSocketId = invitedPlayer.socketId;
            if (invitedSocketId) {
                io.to(invitedSocketId).emit('friend:invitation-received', {
                    inviterId: userInviter.userId,
                    inviterName: userInviter.nameSurname,
                    message: `${userInviter.nameSurname} sizi arkadaş olarak ekledi!`,
                    timestamp: Date.now()
                });
            }

        }

        res.status(200).json({ responseType: responseTypes.invitationSent, message: 'Invitation sent' });
    } else {
        res.status(404).json({ responseType: responseTypes.userNotFound, message: 'User not found' });
    }
});

userRouter.post("/reject-friend", authenticate, async (req, res) => {
    const { inviterId } = req.body;
    const user = req.user;
    if (!user || !user.userId) {
        res.status(401).json({ responseType: "Unauthorized", message: 'Unauthorized' });
        return;
    }

    try {
        await UserService.removeUserFriendInvitation(user.userId, inviterId);
        res.status(200).json({ responseType: responseTypes.invitationRejected, message: 'Invitation rejected successfully' });
    } catch (error) {
        res.status(403).json({ responseType: responseTypes.invitationCannotRejected, message: 'Invitation cannot be rejected' });
    }

});

userRouter.post('/accept-friend', authenticate, async (req, res) => {
    const { inviterId } = req.body;
    const user = req.user;
    if (!user || !user.userId) {
        res.status(401).json({ responseType: "Unauthorized", message: 'Unauthorized' });
        return;
    }
    const io = req.io;
    if (!io) {
        res.status(500).json({ responseType: responseTypes.onlineStatusCannotChanged, message: 'Socket IO server not available.' });
        return;
    }

    console.log("inviterId, userId", inviterId, user.userId)
    const myInvitations = await UserService.getUserFriendInvitations(user.userId);

    console.log("myInvitations:", myInvitations);
    const inviter = myInvitations.find(invite => invite.userId === inviterId);
    if (inviter) {
        console.log("inviter:", inviter);

        const inviterPlayer = PlayerService.getPlayer(inviterId);
        const invitedPlayer = PlayerService.getPlayer(user.userId);

        if (!user) {
            res.status(404).json({ responseType: responseTypes.userNotFound, message: 'User not found' });
            return;
        }


        await UserService.addUserToFriendList(user.userId, inviter);
        await UserService.addUserToFriendList(inviterId, user);

        if (inviterPlayer) {
            console.log("inviterPlayer.socketId", inviterPlayer.socketId)
            const playerFriends = await UserService.getUserFriends(inviterId);
            io.to(inviterPlayer.socketId || '').emit('friend:added', playerFriends.map((friend) => {
                const player = {
                    userId: friend.userId,
                    email: friend.email,
                    nameSurname: friend.nameSurname,
                    online: PlayerService.getPlayer(friend.userId)?.online || false
                };
                return player;
            }));
        }
        if (invitedPlayer) {
            console.log("invitedPlayer.socketId", invitedPlayer.socketId)
            const playerFriends = await UserService.getUserFriends(invitedPlayer.userId);

            io.to(invitedPlayer.socketId || '').emit('friend:added', playerFriends.map((friend) => {
                const player = {
                    userId: friend.userId,
                    email: friend.email,
                    nameSurname: friend.nameSurname,
                    online: PlayerService.getPlayer(friend.userId)?.online || false
                };
                return player;
            }));
        }

        res.status(200).json({ responseType: responseTypes.friendAdded, message: 'Friend added successfully' });
    } else {
        res.status(403).json({ responseType: responseTypes.invitationNotFound, message: 'Invitation not found' });
    }
});

userRouter.delete('/remove-friend', authenticate, async (req, res) => {
    const friendId = req.query.friendId as string;
    const user = req.user;
    if (!user || !user.userId) {
        res.status(401).json({ responseType: "Unauthorized", message: 'Unauthorized' });
        return;
    }
    const io = req.io;
    if (!io) {
        res.status(500).json({ responseType: responseTypes.onlineStatusCannotChanged, message: 'Socket IO server not available.' });
        return;
    }

    try {
        await UserService.removeFriend(user.userId, friendId);
        res.status(200).json({ responseType: responseTypes.friendRemoved, message: 'Friend removed successfully.' });
        return;
    } catch (error) {
        console.error('Error removing friend:', error);
        res.status(500).json({ responseType: responseTypes.friendRemoveFailed, message: 'Friend could not be removed.' });
        return;
    }

});

userRouter.post('/change-online-status', authenticate, async (req, res) => {
    const { online } = req.body;
    const user = req.user;
    if (!user || !user.userId) {
        res.status(401).json({ responseType: "Unauthorized", message: 'Unauthorized' });
        return;
    }
    const io = req.io;
    if (!io) {
        res.status(500).json({ responseType: responseTypes.onlineStatusCannotChanged, message: 'Socket IO server not available.' });
        return;
    }

    console.log("userId, online", user.userId, online)
    try {
        PlayerService.setPlayerOnlineStatus(user.userId, online);


        // Notify friends about status change
        const userFriends = await UserService.getUserFriends(user.userId);
        userFriends.forEach(friend => {
            const friendPlayer = PlayerService.getPlayer(friend.userId);
            if (friendPlayer && friendPlayer.socketId) {
                io.to(friendPlayer.socketId).emit('friend:status-changed', {
                    userId: user.userId,
                    online: online,
                });
            }
        });


        res.status(200).json({ responseType: responseTypes.onlineStatusChanged, message: 'Online status changed successfully' });
    } catch (error) {
        console.error('Error changing online status:', error);
        res.status(500).json({ responseType: responseTypes.onlineStatusCannotChanged, message: 'Error changing online status' });
    }
});





export default userRouter;
