import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Server, Channel, Message, User, ServerMember } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface SupabaseUser {
  id: string;
  username: string;
  avatar?: string;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  created_at?: string;
}

export interface SupabaseServer {
  id: string;
  name: string;
  icon?: string;
  password?: string;
  owner_id: string;
  created_at?: string;
}

export interface SupabaseChannel {
  id: string;
  server_id: string;
  name: string;
  type: 'text' | 'voice';
  position: number;
  created_at?: string;
}

export interface SupabaseMessage {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  is_system: boolean;
  created_at?: string;
  users?: {
    username: string;
    avatar?: string;
  };
}

export interface SupabaseServerMember {
  server_id: string;
  user_id: string;
  roles: string[];
  joined_at?: string;
  users?: {
    username: string;
    avatar?: string;
  };
}

export interface SupabaseRole {
  id: string;
  server_id: string;
  name: string;
  color: string;
  permissions: string[];
  position: number;
  created_at?: string;
}

export const upsertUser = async (user: User) => {
  const { data, error } = await supabase
    .from('users')
    .upsert({
      id: user.id,
      username: user.username,
      avatar: user.avatar || null,
      status: user.status
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const createServer = async (server: Server, userId: string) => {
  const { data: serverData, error: serverError } = await supabase
    .from('servers')
    .insert({
      id: server.id,
      name: server.name,
      icon: server.icon || null,
      password: server.password || null,
      owner_id: userId
    })
    .select()
    .single();

  if (serverError) throw serverError;

  for (const role of server.roles) {
    await supabase.from('roles').insert({
      id: role.id,
      server_id: server.id,
      name: role.name,
      color: role.color,
      permissions: role.permissions,
      position: role.position
    });
  }

  for (const channel of server.channels) {
    await supabase.from('channels').insert({
      id: channel.id,
      server_id: server.id,
      name: channel.name,
      type: channel.type,
      position: server.channels.indexOf(channel)
    });
  }

  await supabase.from('server_members').insert({
    server_id: server.id,
    user_id: userId,
    roles: server.members[0].roles
  });

  return serverData;
};

export const findServerByName = async (serverName: string): Promise<Server | null> => {
  const { data: serverData, error: serverError } = await supabase
    .from('servers')
    .select('*')
    .eq('name', serverName)
    .maybeSingle();

  if (serverError) throw serverError;
  if (!serverData) return null;

  const { data: channelsData } = await supabase
    .from('channels')
    .select('*')
    .eq('server_id', serverData.id)
    .order('position');

  const { data: rolesData } = await supabase
    .from('roles')
    .select('*')
    .eq('server_id', serverData.id)
    .order('position');

  const { data: membersData } = await supabase
    .from('server_members')
    .select('*, users(username, avatar)')
    .eq('server_id', serverData.id);

  const channels: Channel[] = (channelsData || []).map(c => ({
    id: c.id,
    name: c.name,
    type: c.type,
    messages: []
  }));

  const roles = (rolesData || []).map(r => ({
    id: r.id,
    name: r.name,
    color: r.color,
    permissions: r.permissions,
    position: r.position
  }));

  const members: ServerMember[] = (membersData || []).map(m => ({
    userId: m.user_id,
    username: m.users?.username || 'Unknown',
    avatar: m.users?.avatar || '',
    roles: m.roles
  }));

  return {
    id: serverData.id,
    name: serverData.name,
    icon: serverData.icon,
    password: serverData.password,
    ownerId: serverData.owner_id,
    channels,
    roles,
    members
  };
};

export const joinServer = async (serverId: string, userId: string, roles: string[] = ['r-everyone']) => {
  const { data, error } = await supabase
    .from('server_members')
    .insert({
      server_id: serverId,
      user_id: userId,
      roles
    })
    .select();

  if (error) throw error;
  return data;
};

export const getServersForUser = async (userId: string): Promise<Server[]> => {
  const { data: memberData, error: memberError } = await supabase
    .from('server_members')
    .select('server_id')
    .eq('user_id', userId);

  if (memberError) throw memberError;
  if (!memberData || memberData.length === 0) return [];

  const serverIds = memberData.map(m => m.server_id);

  const { data: serversData, error: serversError } = await supabase
    .from('servers')
    .select('*')
    .in('id', serverIds);

  if (serversError) throw serversError;
  if (!serversData) return [];

  const servers: Server[] = [];

  for (const serverData of serversData) {
    const { data: channelsData } = await supabase
      .from('channels')
      .select('*')
      .eq('server_id', serverData.id)
      .order('position');

    const { data: rolesData } = await supabase
      .from('roles')
      .select('*')
      .eq('server_id', serverData.id)
      .order('position');

    const { data: membersData } = await supabase
      .from('server_members')
      .select('*, users(username, avatar)')
      .eq('server_id', serverData.id);

    const channels: Channel[] = (channelsData || []).map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
      messages: []
    }));

    for (const channel of channels) {
      if (channel.type === 'text') {
        const { data: messagesData } = await supabase
          .from('messages')
          .select('*, users(username, avatar)')
          .eq('channel_id', channel.id)
          .order('created_at', { ascending: true })
          .limit(100);

        channel.messages = (messagesData || []).map(m => ({
          id: m.id,
          channelId: m.channel_id,
          content: m.content,
          senderId: m.user_id,
          senderName: m.users?.username || 'Unknown',
          senderAvatar: m.users?.avatar,
          timestamp: new Date(m.created_at).getTime(),
          isSystem: m.is_system
        }));
      }
    }

    const roles = (rolesData || []).map(r => ({
      id: r.id,
      name: r.name,
      color: r.color,
      permissions: r.permissions,
      position: r.position
    }));

    const members: ServerMember[] = (membersData || []).map(m => ({
      userId: m.user_id,
      username: m.users?.username || 'Unknown',
      avatar: m.users?.avatar || '',
      roles: m.roles
    }));

    servers.push({
      id: serverData.id,
      name: serverData.name,
      icon: serverData.icon,
      password: serverData.password,
      ownerId: serverData.owner_id,
      channels,
      roles,
      members
    });
  }

  return servers;
};

export const sendMessage = async (message: Message) => {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      id: message.id,
      channel_id: message.channelId,
      user_id: message.senderId,
      content: message.content,
      is_system: message.isSystem || false
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const subscribeToChannel = (
  channelId: string,
  onMessage: (message: Message) => void
): RealtimeChannel => {
  const channel = supabase
    .channel(`channel-${channelId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${channelId}`
      },
      async (payload) => {
        const newMessage = payload.new as SupabaseMessage;

        const { data: userData } = await supabase
          .from('users')
          .select('username, avatar')
          .eq('id', newMessage.user_id)
          .maybeSingle();

        const message: Message = {
          id: newMessage.id,
          channelId: newMessage.channel_id,
          content: newMessage.content,
          senderId: newMessage.user_id,
          senderName: userData?.username || 'Unknown',
          senderAvatar: userData?.avatar,
          timestamp: new Date(newMessage.created_at || Date.now()).getTime(),
          isSystem: newMessage.is_system
        };

        onMessage(message);
      }
    )
    .subscribe();

  return channel;
};

export const unsubscribeFromChannel = (channel: RealtimeChannel) => {
  supabase.removeChannel(channel);
};

export const subscribeToServerMembers = (
  serverId: string,
  onMemberJoin: (member: ServerMember) => void
): RealtimeChannel => {
  const channel = supabase
    .channel(`server-members-${serverId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'server_members',
        filter: `server_id=eq.${serverId}`
      },
      async (payload) => {
        const newMember = payload.new as SupabaseServerMember;

        const { data: userData } = await supabase
          .from('users')
          .select('username, avatar')
          .eq('id', newMember.user_id)
          .maybeSingle();

        const member: ServerMember = {
          userId: newMember.user_id,
          username: userData?.username || 'Unknown',
          avatar: userData?.avatar || '',
          roles: newMember.roles
        };

        onMemberJoin(member);
      }
    )
    .subscribe();

  return channel;
};

export const joinChannelPresence = async (channelId: string, userId: string) => {
  const { error } = await supabase
    .from('channel_presence')
    .upsert({
      channel_id: channelId,
      user_id: userId,
      last_seen_at: new Date().toISOString()
    }, {
      onConflict: 'channel_id,user_id'
    });

  if (error) throw error;
};

export const leaveChannelPresence = async (channelId: string, userId: string) => {
  const { error } = await supabase
    .from('channel_presence')
    .delete()
    .eq('channel_id', channelId)
    .eq('user_id', userId);

  if (error) throw error;
};

export const getChannelPresence = async (channelId: string) => {
  const { data, error } = await supabase
    .from('channel_presence')
    .select(`
      user_id,
      users:user_id (username, avatar)
    `)
    .eq('channel_id', channelId);

  if (error) throw error;

  return data?.map(p => ({
    userId: p.user_id,
    username: (p.users as any)?.username || 'Unknown',
    avatar: (p.users as any)?.avatar || ''
  })) || [];
};

export const subscribeToChannelPresence = (
  channelId: string,
  onPresenceChange: (userId: string, joined: boolean, userData?: { username: string; avatar: string }) => void
): RealtimeChannel => {
  const channel = supabase
    .channel(`channel-presence-${channelId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'channel_presence',
        filter: `channel_id=eq.${channelId}`
      },
      async (payload) => {
        const presence = payload.new as any;
        const { data: userData } = await supabase
          .from('users')
          .select('username, avatar')
          .eq('id', presence.user_id)
          .maybeSingle();

        onPresenceChange(
          presence.user_id,
          true,
          userData || undefined
        );
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'channel_presence',
        filter: `channel_id=eq.${channelId}`
      },
      (payload) => {
        const presence = payload.old as any;
        onPresenceChange(presence.user_id, false);
      }
    )
    .subscribe();

  return channel;
};

export const updateServerDetails = async (serverId: string, updates: Partial<SupabaseServer>) => {
  const { data, error } = await supabase
    .from('servers')
    .update(updates)
    .eq('id', serverId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const createChannel = async (serverId: string, channel: Channel) => {
  const { data, error } = await supabase
    .from('channels')
    .insert({
      id: channel.id,
      server_id: serverId,
      name: channel.name,
      type: channel.type,
      position: 0
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteChannel = async (channelId: string) => {
  const { error } = await supabase
    .from('channels')
    .delete()
    .eq('id', channelId);

  if (error) throw error;
};
