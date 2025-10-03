export interface VoicePeer {
  userId: string;
  socketId: string;
  roomId: string;
  isMuted: boolean;
}

export interface VoiceOffer {
  roomId: string;
  userId: string;
  targetUserId: string;
  offer: RTCSessionDescriptionInit;
}

export interface VoiceAnswer {
  roomId: string;
  userId: string;
  targetUserId: string;
  answer: RTCSessionDescriptionInit;
}

export interface VoiceIceCandidate {
  roomId: string;
  userId: string;
  targetUserId: string;
  candidate: RTCIceCandidateInit;
}

export interface VoiceToggleMute {
  roomId: string;
  userId: string;
  isMuted: boolean;
}
