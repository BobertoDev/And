import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ServerList } from './components/ServerList';
import { ChannelList } from './components/ChannelList';
import { ChatArea } from './components/ChatArea';
import { VoiceStage } from './components/VoiceStage';
import { CreateServerModal, JoinServerModal, SettingsModal } from './components/Modals';
import { ServerSettingsModal } from './components/ServerSettingsModal';
import { LoginPage } from './components/LoginPage';
import { Server, Channel, User, Message, ServerMember } from './types';
import { initDB, saveServers, saveUser, getDefaultChannels, getDefaultRoles, PUBLIC_SERVER_ID, getSeedServers } from './services/db';

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

  // Broadcast Channel for Multi-Tab Syncing
  const [broadcastChannel] = useState(new BroadcastChannel('discord_clone_channel'));

  // Helper to ensure user is in Public Server
  const ensurePublicAccess = (currentUser: User, currentServers: Server[]) => {
      const publicId = PUBLIC_SERVER_ID;
      let updatedServers = [...currentServers];
      let changed = false;

      // 1. Check if public server exists, if not, add it from seed
      let publicServerIndex = updatedServers.findIndex(s => s.id === publicId);
      
      if (publicServerIndex === -1) {
          const seed = getSeedServers().find(s => s.id === publicId);
          if (seed) {
              updatedServers.push(seed);
              publicServerIndex = updatedServers.length - 1;
              changed = true;
          }
      }

      // 2. Add user to public server if not present
      if (publicServerIndex !== -1) {
          const publicServer = updatedServers[publicServerIndex];
          if (!publicServer.members.find(m => m.userId === currentUser.id)) {
              const newMember: ServerMember = {
                  userId: currentUser.id,
                  username: currentUser.username,
                  avatar: currentUser.avatar || '',
                  roles: ['r-everyone']
              };
              
              const updatedServer = {
                  ...publicServer,
                  members: [...publicServer.members, newMember]
              };
              updatedServers[publicServerIndex] = updatedServer;
              changed = true;
          }
      }

      if (changed) {
          setServers(updatedServers);
          saveServers(updatedServers);
          
          // If no active server set, set to public
          if (!activeServerId) {
             const pub = updatedServers.find(s => s.id === publicId);
             if (pub) {
                 setActiveServerId(pub.id);
                 setActiveChannelId(pub.channels[0].id);
             }
          }
      } else {
          // Servers didn't change, but we might just simply be setting state in init
          setServers(updatedServers); 
          if (!activeServerId && updatedServers.length > 0) {
              const pub = updatedServers.find(s => s.id === publicId) || updatedServers[0];
              setActiveServerId(pub.id);
              setActiveChannelId(pub.channels[0].id);
          }
      }
  };

  // Load Data from DB
  useEffect(() => {
    const loadData = async () => {
        try {
            const { user: dbUser, servers: dbServers } = await initDB();
            
            // Only set user if found in DB, otherwise it stays null (triggering Login Page)
            if (dbUser) {
                setUser(dbUser);
                ensurePublicAccess(dbUser, dbServers);
            } else {
                setServers(dbServers);
            }
        } catch (error) {
            console.error("Failed to load database:", error);
        } finally {
            setIsLoading(false);
        }
    };
    loadData();
  }, []);

  useEffect(() => {
    // Listen for messages from other tabs
    broadcastChannel.onmessage = (event) => {
        const { type, payload } = event.data;
        if (type === 'NEW_MESSAGE') {
            receiveMessage(payload);
        }
    };

    // Listen for Gemini Bot events dispatched from ChatArea
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
        addMessage(botMsg);
    };
    
    window.addEventListener('gemini-response', handleGeminiResponse);
    return () => window.removeEventListener('gemini-response', handleGeminiResponse);
  }, [servers]); 

  const handleLogin = (newUser: User) => {
      setUser(newUser);
      saveUser(newUser);
      ensurePublicAccess(newUser, servers);
  };

  const addMessage = (msg: Message, saveToDb: boolean = true) => {
      setServers(prevServers => {
          const newServers = prevServers.map(server => {
              const channelExists = server.channels.find(c => c.id === msg.channelId);
              if (!channelExists) return server;

              return {
                  ...server,
                  channels: server.channels.map(ch => {
                      if (ch.id === msg.channelId) {
                          if (ch.messages?.find(m => m.id === msg.id)) return ch;
                          return { ...ch, messages: [...(ch.messages || []), msg] };
                      }
                      return ch;
                  })
              };
          });
          
          if (saveToDb) {
              saveServers(newServers);
          }
          return newServers;
      });
  };

  const receiveMessage = (msg: Message) => {
      addMessage(msg, false);
  };

  const handleSendMessage = (channelId: string, content: string) => {
      if (!user) return;
      
      const newMessage: Message = {
          id: uuidv4(),
          channelId,
          content,
          senderId: user.id,
          senderName: user.username,
          senderAvatar: user.avatar,
          timestamp: Date.now()
      };

      addMessage(newMessage, true);

      broadcastChannel.postMessage({
          type: 'NEW_MESSAGE',
          payload: newMessage
      });
  };

  const handleCreateServer = ({ name, password }: any) => {
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
              roles: ['r-admin'] // Creator gets admin
          }]
      };

      const updatedServers = [...servers, newServer];
      setServers(updatedServers);
      saveServers(updatedServers);

      setActiveServerId(newServer.id);
      setActiveChannelId(newServer.channels[0].id);
  };

  const handleUpdateServer = (updatedServer: Server) => {
      const updatedServers = servers.map(s => s.id === updatedServer.id ? updatedServer : s);
      setServers(updatedServers);
      saveServers(updatedServers);
  };

  const handleJoinServer = ({ name, password }: any) => {
      if (!user) return;

      const target = servers.find(s => s.name === name);
      if (target) {
          if (target.password && target.password !== password) {
              alert("Incorrect password!");
              return;
          }
          // Add user to members if not already there
          if (!target.members.find(m => m.userId === user.id)) {
             const updatedServer = {
                 ...target,
                 members: [...target.members, {
                     userId: user.id,
                     username: user.username,
                     avatar: user.avatar || '',
                     roles: ['r-everyone']
                 }]
             };
             handleUpdateServer(updatedServer);
          }

          setActiveServerId(target.id);
          setActiveChannelId(target.channels[0].id);
      } else {
          alert("Server not found.");
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