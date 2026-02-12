import React, { useState } from 'react';
import { Hash, Volume2, Mic, MicOff, Headphones, VolumeX, Settings, UserPlus, ChevronDown, X } from 'lucide-react';
import { Server, Channel, User } from '../types';

interface ChannelListProps {
  server: Server;
  activeChannelId: string | null;
  currentUser: User;
  channelUsers: Array<{ userId: string; username: string; avatar: string }>;
  onSelectChannel: (id: string) => void;
  isMuted: boolean;
  toggleMute: () => void;
  isDeafened: boolean;
  toggleDeafen: () => void;
  onOpenSettings: () => void;
  onOpenServerSettings: () => void;
}

export const ChannelList: React.FC<ChannelListProps> = ({
  server,
  activeChannelId,
  currentUser,
  channelUsers,
  onSelectChannel,
  isMuted,
  toggleMute,
  isDeafened,
  toggleDeafen,
  onOpenSettings,
  onOpenServerSettings
}) => {
  const [showServerDropdown, setShowServerDropdown] = useState(false);
  const textChannels = server.channels.filter((c) => c.type === 'text');
  const voiceChannels = server.channels.filter((c) => c.type === 'voice');

  return (
    <div className="w-60 bg-discord-light flex flex-col h-full border-r border-discord-darker relative">
      {/* Server Header */}
      <div 
        onClick={() => setShowServerDropdown(!showServerDropdown)}
        className="h-12 px-4 flex items-center justify-between shadow-sm hover:bg-discord-active cursor-pointer transition-colors border-b border-discord-darker relative z-20"
      >
        <h1 className="font-bold text-white truncate">{server.name}</h1>
        {showServerDropdown ? <X size={16} /> : <ChevronDown size={16} />}
      </div>

      {/* Server Dropdown Menu */}
      {showServerDropdown && (
          <div className="absolute top-14 left-2 w-56 bg-black rounded-lg shadow-xl z-30 overflow-hidden border border-discord-darker p-1.5 space-y-1">
             <div 
                className="px-2 py-1.5 rounded hover:bg-discord-blurple text-discord-textMuted hover:text-white cursor-pointer flex items-center justify-between text-sm"
                onClick={() => { setShowServerDropdown(false); onOpenServerSettings(); }}
             >
                 Server Settings
                 <Settings size={14} />
             </div>
             <div className="px-2 py-1.5 rounded hover:bg-discord-active text-discord-textMuted hover:text-white cursor-pointer flex items-center justify-between text-sm">
                 Create Channel
                 <PlusIcon />
             </div>
             <div className="h-[1px] bg-discord-darker my-1"></div>
             <div className="px-2 py-1.5 rounded hover:bg-discord-red text-discord-red hover:text-white cursor-pointer flex items-center justify-between text-sm">
                 Leave Server
             </div>
          </div>
      )}

      {/* Backdrop for Dropdown */}
      {showServerDropdown && (
          <div className="fixed inset-0 z-10" onClick={() => setShowServerDropdown(false)}></div>
      )}

      {/* Channels Scroll Area */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        
        {/* Text Channels */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1 group text-discord-textMuted hover:text-discord-text cursor-pointer">
            <span className="text-xs font-bold uppercase tracking-wide">Text Channels</span>
            <PlusIcon />
          </div>
          <div className="space-y-[2px]">
            {textChannels.map((channel) => (
              <div
                key={channel.id}
                onClick={() => onSelectChannel(channel.id)}
                className={`flex items-center px-2 py-1.5 rounded bg-transparent cursor-pointer group
                  ${activeChannelId === channel.id ? 'bg-discord-active text-white' : 'text-discord-textMuted hover:bg-discord-active/50 hover:text-discord-text'}
                `}
              >
                <Hash size={18} className="mr-1.5 text-discord-textMuted" />
                <span className={`truncate font-medium ${activeChannelId === channel.id ? 'text-white' : ''}`}>
                    {channel.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Voice Channels */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1 group text-discord-textMuted hover:text-discord-text cursor-pointer">
            <span className="text-xs font-bold uppercase tracking-wide">Voice Channels</span>
            <PlusIcon />
          </div>
          <div className="space-y-[2px]">
            {voiceChannels.map((channel) => {
               const isActive = activeChannelId === channel.id;
               return (
                <div key={channel.id} className="flex flex-col">
                  <div
                    onClick={() => onSelectChannel(channel.id)}
                    className={`flex items-center px-2 py-1.5 rounded cursor-pointer group
                      ${isActive ? 'bg-discord-active text-white' : 'text-discord-textMuted hover:bg-discord-active/50 hover:text-discord-text'}
                    `}
                  >
                    <Volume2 size={18} className="mr-1.5 text-discord-textMuted" />
                    <span className={`truncate font-medium ${isActive ? 'text-white' : ''}`}>
                        {channel.name}
                    </span>
                  </div>
                  {/* Simple User List in Voice */}
                  {isActive && (
                      <div className="ml-8 mt-1 mb-2 space-y-1">
                          {channelUsers.map(user => {
                            const isCurrentUser = user.userId === currentUser.id;
                            return (
                              <div key={user.userId} className="flex items-center space-x-2">
                                  <img src={user.avatar} className="w-6 h-6 rounded-full border border-discord-dark" />
                                  <span className="text-sm text-white font-medium truncate">{user.username}</span>
                                  {isCurrentUser && (
                                    <div className="flex space-x-1">
                                      {isMuted && <MicOff size={12} className="text-discord-red" />}
                                      {isDeafened && <VolumeX size={12} className="text-discord-red" />}
                                    </div>
                                  )}
                              </div>
                            );
                          })}
                      </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* User Area Footer */}
      <div className="bg-discord-darker px-2 py-1.5 flex items-center justify-between">
        <div className="flex items-center hover:bg-discord-active p-1 rounded cursor-pointer min-w-0 mr-1 flex-1">
          <div className="relative">
             <img src={currentUser.avatar} alt="User" className="w-8 h-8 rounded-full" />
             <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-discord-darker ${isDeafened ? 'bg-discord-red' : 'bg-discord-green'}`}>
                {isDeafened && <div className="absolute inset-0 flex items-center justify-center"><div className="w-1.5 h-[1.5px] bg-discord-darker"></div></div>}
             </div>
          </div>
          <div className="ml-2 min-w-0">
            <div className="text-sm font-bold text-white truncate">{currentUser.username}</div>
            <div className="text-xs text-discord-textMuted truncate">
                {isDeafened ? 'Deafened' : 'Online'}
            </div>
          </div>
        </div>
        <div className="flex items-center">
            <button 
                onClick={toggleMute}
                className="p-1.5 hover:bg-discord-active rounded text-discord-text hover:text-white relative group"
            >
                {isMuted ? <MicOff size={18} className="text-discord-red" /> : <Mic size={18} />}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded mb-1 opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                    {isMuted ? "Unmute" : "Mute"}
                </span>
            </button>
            <button 
                onClick={toggleDeafen}
                className="p-1.5 hover:bg-discord-active rounded text-discord-text hover:text-white relative group"
            >
                {isDeafened ? <VolumeX size={18} className="text-discord-red" /> : <Headphones size={18} />}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded mb-1 opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                    {isDeafened ? "Undeafen" : "Deafen"}
                </span>
            </button>
            <button 
                onClick={onOpenSettings}
                className="p-1.5 hover:bg-discord-active rounded text-discord-text hover:text-white relative group"
            >
                <Settings size={18} />
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded mb-1 opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                    User Settings
                </span>
            </button>
        </div>
      </div>
    </div>
  );
};

const PlusIcon = () => (
    <svg className="w-4 h-4 cursor-pointer" viewBox="0 0 24 24" fill="currentColor">
       <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
    </svg>
)