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
  videoTitle?: string;
  lastUpdatedAt: number;
  updatedBy?: string | null;
  isLocked?: boolean;
  isOpenControl?: boolean;
  queueCount?: number;
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

export interface QueueItem {
  id: string;
  videoId: string;
  title: string;
  addedBy: string;
  addedByRole: Role | string;
  createdAt: number;
}

export interface SuggestedItem {
  id: string;
  videoId: string;
  title: string;
  suggestedBy: string;
  suggestedById: string;
  createdAt: number;
}

export interface QueueState {
  queue: QueueItem[];
  suggestedQueue: SuggestedItem[];
}

export interface RoomSettings {
  isLocked: boolean;
  isOpenControl: boolean;
}

export interface LiveReaction {
  id: string;
  emoji: string;
  username: string;
  timestamp: number;
}
