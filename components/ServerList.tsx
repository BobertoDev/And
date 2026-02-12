import React from 'react';
import { Plus, Compass, Disc } from 'lucide-react';
import { Server } from '../types';

interface ServerListProps {
  servers: Server[];
  activeServerId: string | null;
  onSelectServer: (id: string) => void;
  onCreateServer: () => void;
  onJoinServer: () => void;
}

export const ServerList: React.FC<ServerListProps> = ({
  servers,
  activeServerId,
  onSelectServer,
  onCreateServer,
  onJoinServer,
}) => {
  return (
    <div className="w-[72px] bg-discord-sidebar flex flex-col items-center py-3 space-y-2 h-full overflow-y-auto no-scrollbar">
      {/* Home / DM placeholder */}
      <div 
        className="w-12 h-12 bg-discord-active rounded-[24px] hover:rounded-[16px] transition-all duration-300 flex items-center justify-center cursor-pointer text-discord-text hover:bg-discord-blurple group relative"
      >
        <Disc size={28} />
         <div className="absolute left-0 w-1 h-2 bg-white rounded-r-full -ml-4 opacity-0 transition-all" />
      </div>

      <div className="w-8 h-[2px] bg-discord-dark rounded-lg mx-auto opacity-50" />

      {/* Server Items */}
      {servers.map((server) => {
        const isActive = activeServerId === server.id;
        return (
          <div key={server.id} className="relative group w-full flex justify-center">
            {/* Active Indicator */}
            <div 
              className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 bg-white rounded-r-full transition-all duration-200 
              ${isActive ? 'h-10' : 'h-2 opacity-0 group-hover:opacity-100 group-hover:h-5'}`}
            />
            
            <button
              onClick={() => onSelectServer(server.id)}
              className={`w-12 h-12 rounded-[24px] transition-all duration-200 flex items-center justify-center overflow-hidden group-hover:rounded-[16px]
              ${isActive ? 'bg-discord-blurple rounded-[16px]' : 'bg-discord-dark hover:bg-discord-blurple'}`}
            >
              {server.icon ? (
                <img src={server.icon} alt={server.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-medium text-white">
                  {server.name.substring(0, 2).toUpperCase()}
                </span>
              )}
            </button>
            
            {/* Tooltip */}
            <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-2 bg-black text-white text-xs font-bold rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
               {server.name}
               <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-1 border-4 border-transparent border-r-black" />
            </div>
          </div>
        );
      })}

      <div className="w-8 h-[2px] bg-discord-dark rounded-lg mx-auto opacity-50" />

      {/* Add Server Button */}
      <button
        onClick={onCreateServer}
        className="group w-12 h-12 bg-discord-dark rounded-[24px] hover:rounded-[16px] hover:bg-discord-green transition-all duration-300 flex items-center justify-center cursor-pointer text-discord-green hover:text-white"
        title="Add a Server"
      >
        <Plus size={24} />
      </button>

      {/* Join Server Button */}
      <button
        onClick={onJoinServer}
        className="group w-12 h-12 bg-discord-dark rounded-[24px] hover:rounded-[16px] hover:bg-discord-active transition-all duration-300 flex items-center justify-center cursor-pointer text-discord-text hover:text-white"
        title="Join a Server"
      >
        <Compass size={24} />
      </button>
    </div>
  );
};
