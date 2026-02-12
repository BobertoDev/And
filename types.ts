export interface User {
  id: string;
  username: string;
  avatar?: string;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  isBot?: boolean;
}

export interface Message {
  id: string;
  channelId: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: number;
  isSystem?: boolean;
  attachments?: string[];
}

export type ChannelType = 'text' | 'voice';

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  messages?: Message[]; // Only for text channels
}

export type Permission = 'ADMINISTRATOR' | 'MANAGE_CHANNELS' | 'MANAGE_ROLES' | 'KICK_MEMBERS' | 'SEND_MESSAGES' | 'VIEW_CHANNELS';

export interface Role {
  id: string;
  name: string;
  color: string;
  permissions: Permission[];
  position: number;
}

export interface ServerMember {
  userId: string;
  username: string;
  avatar: string;
  roles: string[]; // Role IDs
}

export interface Server {
  id: string;
  name: string;
  icon?: string;
  password?: string; // Optional for public servers, required if set
  ownerId: string;
  channels: Channel[];
  roles: Role[];
  members: ServerMember[];
}

// For local storage persistence
export interface AppState {
  servers: Server[];
  currentServerId: string | null;
  currentChannelId: string | null;
  user: User;
}