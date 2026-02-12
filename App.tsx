import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { RealtimeChannel } from '@supabase/supabase-js';
import { ServerList } from './components/ServerList';
import { ChannelList } from './components/ChannelList';
import { ChatArea } from './components/ChatArea';
import { VoiceStage } from './components/VoiceStage';
import { CreateServerModal, JoinServerModal, SettingsModal } from './components/Modals';
import { ServerSettingsModal } from './components/ServerSettingsModal';
import { LoginPage } from './components/LoginPage';
import { Server, Channel, User, Message, ServerMember } from './types';
import { getDefaultChannels, getDefaultRoles } from './services/db';
import {
  upsertUser,
  createServer as createServerInDB,
  getServersForUser,
  sendMessage as sendMessageToDB,
  subscribeToChannel,
  unsubscribeFromChannel,
  joinServer as joinServerInDB,
  findServerByName,
  subscribeToServerMembers,
  joinChannelPresence,
  leaveChannelPresence,
  getChannelPresence,
  subscribeToChannelPresence
} from './services/supabase';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [servers, setServers] = useState<Server[]>([]);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Audio State
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [inputVolume, setInputVolume] = useState(100); // 0-200%
  const [outputVolume, setOutputVolume] = useState(100); // 0-200%
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showServerSettingsModal, setShowServerSettingsModal] = useState(false);

  const realtimeChannelsRef = useRef<Map<string, RealtimeChannel>>(new Map());
  const realtimeServerMembersRef = useRef<Map<string, RealtimeChannel>>(new Map());
  const realtimeChannelPresenceRef = useRef<Map<string, RealtimeChannel>>(new Map());

  const [channelUsers, setChannelUsers] = useState<Array<{ userId: string; username: string; avatar: string }>>([]);

  const loadUserServers = async (userId: string) => {
    try {
      const userServers = await getServersForUser(userId);
      setServers(userServers);

      if (userServers.length > 0 && !activeServerId) {
        setActiveServerId(userServers[0].id);
        setActiveChannelId(userServers[0].channels[0].id);
      }
    } catch (error) {
      console.error("Failed to load servers:", error);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('discordia_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      loadUserServers(parsedUser.id);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const handleGeminiResponse = (e: any) => {
      const { channelId, content } = e.detail;
      const botMsg: Message = {
        id: uuidv4(),
        channelId,
        content,
        senderId: 'gemini-bot',
        senderName: 'Gemini',
        senderAvatar: 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg',
        timestamp: Date.now(),
        isSystem: true
      };
      handleSendMessage(channelId, content, botMsg.id, true);
    };

    window.addEventListener('gemini-response', handleGeminiResponse);
    return () => window.removeEventListener('gemini-response', handleGeminiResponse);
  }, [user]);

  useEffect(() => {
    if (!activeChannelId) return;

    console.log(`Subscribing to channel: ${activeChannelId}`);

    const existingChannel = realtimeChannelsRef.current.get(activeChannelId);
    if (existingChannel) {
      console.log(`Already subscribed to channel: ${activeChannelId}`);
      return;
    }

    const channel = subscribeToChannel(activeChannelId, (newMessage) => {
      console.log('New message received:', newMessage);
      setServers(prevServers => {
        return prevServers.map(server => {
          const channelExists = server.channels.find(c => c.id === newMessage.channelId);
          if (!channelExists) return server;

          return {
            ...server,
            channels: server.channels.map(ch => {
              if (ch.id === newMessage.channelId) {
                if (ch.messages?.find(m => m.id === newMessage.id)) return ch;
                return { ...ch, messages: [...(ch.messages || []), newMessage] };
              }
              return ch;
            })
          };
        });
      });
    });

    realtimeChannelsRef.current.set(activeChannelId, channel);

    return () => {
      console.log(`Unsubscribing from channel: ${activeChannelId}`);
      if (channel) {
        unsubscribeFromChannel(channel);
        realtimeChannelsRef.current.delete(activeChannelId);
      }
    };
  }, [activeChannelId]);

  useEffect(() => {
    if (!activeServerId) return;

    console.log(`Subscribing to server members: ${activeServerId}`);

    const existingChannel = realtimeServerMembersRef.current.get(activeServerId);
    if (existingChannel) {
      console.log(`Already subscribed to server members: ${activeServerId}`);
      return;
    }

    const channel = subscribeToServerMembers(activeServerId, (newMember) => {
      console.log('New member joined:', newMember);
      setServers(prevServers => {
        return prevServers.map(server => {
          if (server.id !== activeServerId) return server;

          if (server.members.find(m => m.userId === newMember.userId)) return server;

          return {
            ...server,
            members: [...server.members, newMember]
          };
        });
      });
    });

    realtimeServerMembersRef.current.set(activeServerId, channel);

    return () => {
      console.log(`Unsubscribing from server members: ${activeServerId}`);
      if (channel) {
        unsubscribeFromChannel(channel);
        realtimeServerMembersRef.current.delete(activeServerId);
      }
    };
  }, [activeServerId]);

  useEffect(() => {
    if (!activeChannelId || !user) return;

    const setupPresence = async () => {
      try {
        console.log(`Joining channel presence: ${activeChannelId}`);
        await joinChannelPresence(activeChannelId, user.id);

        const existingUsers = await getChannelPresence(activeChannelId);
        console.log('Existing users in channel:', existingUsers);
        setChannelUsers(existingUsers);

        const existingPresenceChannel = realtimeChannelPresenceRef.current.get(activeChannelId);
        if (!existingPresenceChannel) {
          const presenceChannel = subscribeToChannelPresence(
            activeChannelId,
            (userId, joined, userData) => {
              console.log(`User ${userId} ${joined ? 'joined' : 'left'} channel`);
              setChannelUsers(prev => {
                if (joined && userData) {
                  if (prev.find(u => u.userId === userId)) return prev;
                  return [...prev, { userId, username: userData.username, avatar: userData.avatar }];
                } else {
                  return prev.filter(u => u.userId !== userId);
                }
              });
            }
          );
          realtimeChannelPresenceRef.current.set(activeChannelId, presenceChannel);
        }
      } catch (error) {
        console.error('Failed to setup channel presence:', error);
      }
    };

    setupPresence();

    return () => {
      if (user && activeChannelId) {
        console.log(`Leaving channel presence: ${activeChannelId}`);
        leaveChannelPresence(activeChannelId, user.id).catch(console.error);

        const presenceChannel = realtimeChannelPresenceRef.current.get(activeChannelId);
        if (presenceChannel) {
          unsubscribeFromChannel(presenceChannel);
          realtimeChannelPresenceRef.current.delete(activeChannelId);
        }
      }
    };
  }, [activeChannelId, user]);

  const handleLogin = async (newUser: User) => {
    try {
      await upsertUser(newUser);
      setUser(newUser);
      localStorage.setItem('discordia_user', JSON.stringify(newUser));
      await loadUserServers(newUser.id);
    } catch (error) {
      console.error("Failed to login:", error);
      alert("Login failed. Please try again.");
    }
  };

  const handleSendMessage = async (channelId: string, content: string, messageId?: string, isSystem?: boolean) => {
    if (!user) return;

    const newMessage: Message = {
      id: messageId || uuidv4(),
      channelId,
      content,
      senderId: user.id,
      senderName: user.username,
      senderAvatar: user.avatar,
      timestamp: Date.now(),
      isSystem: isSystem || false
    };

    try {
      await sendMessageToDB(newMessage);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleCreateServer = async ({ name, password }: any) => {
    if (!user) return;

    const newServer: Server = {
      id: uuidv4(),
      name,
      password,
      ownerId: user.id,
      channels: getDefaultChannels().map(c => ({...c, id: uuidv4(), messages: []})),
      roles: getDefaultRoles(),
      members: [{
        userId: user.id,
        username: user.username,
        avatar: user.avatar || '',
        roles: ['r-admin']
      }]
    };

    try {
      await createServerInDB(newServer, user.id);
      await loadUserServers(user.id);
      setActiveServerId(newServer.id);
      setActiveChannelId(newServer.channels[0].id);
    } catch (error) {
      console.error("Failed to create server:", error);
      alert("Failed to create server. Please try again.");
    }
  };

  const handleUpdateServer = (updatedServer: Server) => {
    const updatedServers = servers.map(s => s.id === updatedServer.id ? updatedServer : s);
    setServers(updatedServers);
  };

  const handleJoinServer = async ({ name, password }: any) => {
    if (!user) return;

    try {
      const target = await findServerByName(name);

      if (!target) {
        alert("Server not found.");
        return;
      }

      if (target.password && target.password !== password) {
        alert("Incorrect password!");
        return;
      }

      if (!target.members.find(m => m.userId === user.id)) {
        await joinServerInDB(target.id, user.id);
        await loadUserServers(user.id);
      }

      setActiveServerId(target.id);
      setActiveChannelId(target.channels[0].id);
    } catch (error) {
      console.error("Failed to join server:", error);
      alert("Failed to join server. Please try again.");
    }
  };

  // Audio Toggles
  const toggleMute = () => {
      // If we are unmuting, ensure deafen is off
      if (isMuted) {
          setIsMuted(false);
      } else {
          setIsMuted(true);
      }
  };

  const toggleDeafen = () => {
      if (isDeafened) {
          // Undeafen: Just turn off deafen, mute stays as is (usually in Discord it restores previous state, but we'll assume unmuted)
          setIsDeafened(false);
          setIsMuted(false);
      } else {
          // Deafen: Turn on deafen AND mute
          setIsDeafened(true);
          setIsMuted(true);
      }
  };

  if (isLoading) {
      return (
          <div className="w-full h-screen bg-discord-dark flex flex-col items-center justify-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-discord-blurple mb-4"></div>
              <p className="font-bold text-lg animate-pulse">Loading Discordia...</p>
          </div>
      )
  }

  // Show Login Page if not authenticated
  if (!user) {
      return <LoginPage onLogin={handleLogin} />;
  }

  const activeServer = servers.find(s => s.id === activeServerId);
  const activeChannel = activeServer?.channels.find(c => c.id === activeChannelId);

  return (
    <div className="flex w-full h-screen overflow-hidden">
      <ServerList 
        servers={servers} 
        activeServerId={activeServerId} 
        onSelectServer={(id) => {
            setActiveServerId(id);
            const server = servers.find(s => s.id === id);
            if (server) setActiveChannelId(server.channels[0].id);
            setIsVoiceConnected(false); 
        }}
        onCreateServer={() => setShowCreateModal(true)}
        onJoinServer={() => setShowJoinModal(true)}
      />

      {activeServer ? (
          <ChannelList
             server={activeServer}
             activeChannelId={activeChannelId}
             currentUser={user}
             channelUsers={channelUsers}
             onSelectChannel={(id) => {
                 const ch = activeServer.channels.find(c => c.id === id);
                 setActiveChannelId(id);
                 if (ch?.type === 'voice') {
                     setIsVoiceConnected(true);
                 } else {
                     setIsVoiceConnected(false);
                 }
             }}
             isMuted={isMuted}
             toggleMute={toggleMute}
             isDeafened={isDeafened}
             toggleDeafen={toggleDeafen}
             onOpenSettings={() => setShowSettingsModal(true)}
             onOpenServerSettings={() => setShowServerSettingsModal(true)}
          />
      ) : (
          <div className="w-60 bg-discord-light border-r border-discord-darker"></div>
      )}

      <div className="flex-1 flex flex-col min-w-0 bg-discord-dark">
         {activeChannel && !isVoiceConnected && activeChannel.type === 'text' && (
             <ChatArea 
                channel={activeChannel}
                currentUser={user}
                onSendMessage={handleSendMessage}
                messages={activeChannel.messages || []}
             />
         )}
         
         {activeChannel && isVoiceConnected && activeChannel.type === 'voice' && (
             <VoiceStage
                channel={activeChannel}
                currentUser={user}
                channelUsers={channelUsers}
                onLeave={() => {
                   setIsVoiceConnected(false);
                   const txt = activeServer?.channels.find(c => c.type === 'text');
                   if (txt) setActiveChannelId(txt.id);
                }}
                isMuted={isMuted}
                toggleMute={toggleMute}
                isDeafened={isDeafened}
                toggleDeafen={toggleDeafen}
                noiseSuppression={noiseSuppression}
                inputVolume={inputVolume}
                outputVolume={outputVolume}
             />
         )}

         {!activeServer && (
             <div className="flex-1 flex items-center justify-center text-discord-textMuted">
                 Select a server to start chatting.
             </div>
         )}
      </div>

      <CreateServerModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateServer}
      />
      
      <JoinServerModal 
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onSubmit={handleJoinServer}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        noiseSuppression={noiseSuppression}
        onToggleNoiseSuppression={setNoiseSuppression}
        inputVolume={inputVolume}
        setInputVolume={setInputVolume}
        outputVolume={outputVolume}
        setOutputVolume={setOutputVolume}
      />
      
      {activeServer && (
          <ServerSettingsModal 
            isOpen={showServerSettingsModal}
            server={activeServer}
            onClose={() => setShowServerSettingsModal(false)}
            onUpdateServer={handleUpdateServer}
          />
      )}

    </div>
  );
}

export default App;