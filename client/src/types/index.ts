export type Role = 'host' | 'moderator' | 'participant' | 'viewer';

export interface Participant {
  userId: string;
  socketId: string;
  username: string;
  role: Role;
  joinedAt: number;
}

export interface SyncState {
  roomId: string;
  playState: 'playing' | 'paused';
  currentTime: number;
  videoId: string;
  lastUpdatedAt: number;
  updatedBy?: string | null;
}

export interface ControlRequest {
  requestId: string;
  roomId: string;
  requesterId: string;
  requesterName: string;
  action: 'play' | 'pause' | 'seek' | 'change_video' | 'request_moderator';
  payload?: any;
  label?: string;
  createdAt: number;
  status: 'pending' | 'approved' | 'rejected';
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  role: Role;
  text: string;
  timestamp: number;
}
