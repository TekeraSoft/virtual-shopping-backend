import { VoicePeer } from '../types/voice/types';

export class VoiceService {
  private static voicePeers: Map<string, VoicePeer> = new Map();

  /**
   * Add a peer to voice chat
   */
  static addPeer(socketId: string, userId: string, roomId: string): VoicePeer {
    const peer: VoicePeer = {
      userId,
      socketId,
      roomId,
      isMuted: false
    };
    this.voicePeers.set(socketId, peer);
    return peer;
  }

  /**
   * Remove a peer from voice chat
   */
  static removePeer(socketId: string): void {
    this.voicePeers.delete(socketId);
  }

  /**
   * Get a peer by socket ID
   */
  static getPeer(socketId: string): VoicePeer | undefined {
    return this.voicePeers.get(socketId);
  }

  /**
   * Get all peers in a room
   */
  static getPeersInRoom(roomId: string): VoicePeer[] {
    return Array.from(this.voicePeers.values()).filter(
      peer => peer.roomId === roomId
    );
  }

  /**
   * Toggle mute status for a peer
   */
  static toggleMute(socketId: string, isMuted: boolean): VoicePeer | undefined {
    const peer = this.voicePeers.get(socketId);
    if (peer) {
      peer.isMuted = isMuted;
    }
    return peer;
  }

  /**
   * Get peer by user ID
   */
  static getPeerByUserId(userId: string): VoicePeer | undefined {
    return Array.from(this.voicePeers.values()).find(
      peer => peer.userId === userId
    );
  }

  /**
   * Remove all peers from a room
   */
  static removeAllPeersFromRoom(roomId: string): void {
    const peers = this.getPeersInRoom(roomId);
    peers.forEach(peer => {
      this.voicePeers.delete(peer.socketId);
    });
  }
}
