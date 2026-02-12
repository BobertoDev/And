import React, { useState, useEffect, useRef } from 'react';
import { Hash, Bell, Pin, Users, Search, PlusCircle, Gift, Sticker, Smile } from 'lucide-react';
import { Message, Channel, User } from '../types';
import { generateBotResponse } from '../services/geminiService';

interface ChatAreaProps {
  channel: Channel;
  currentUser: User;
  onSendMessage: (channelId: string, content: string) => void;
  messages: Message[];
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  channel,
  currentUser,
  onSendMessage,
  messages,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, channel.id]);

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!inputValue.trim()) return;

      const userMessage = inputValue;
      setInputValue('');
      onSendMessage(channel.id, userMessage);

      // Simple AI Integration check
      if (userMessage.toLowerCase().includes('@gemini')) {
         const prompt = userMessage.replace('@gemini', '').trim();
         // Simulate typing delay
         setTimeout(async () => {
             const aiResponse = await generateBotResponse(prompt);
             // We need a way to inject this message back up. 
             // Ideally we pass a special handler, but for this demo we'll use the loopback
             // We can't easily call onSendMessage from here as 'System' or 'Bot' without updating App state logic heavily.
             // We will emit a custom event or callback.
             // For this strict implementation, let's assume onSendMessage handles it if we pass a flag?
             // Actually, let's just trigger a broadcast event that the App listens to, 
             // OR, cleaner: we won't handle bot logic *inside* UI component usually.
             // But for simplicity in this file structure:
             window.dispatchEvent(new CustomEvent('gemini-response', { 
                 detail: { channelId: channel.id, content: aiResponse } 
             }));
         }, 500);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-discord-dark">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between shadow-sm border-b border-discord-darker flex-shrink-0">
        <div className="flex items-center text-white">
          <Hash size={24} className="text-discord-textMuted mr-2" />
          <span className="font-bold mr-4">{channel.name}</span>
          <span className="text-xs text-discord-textMuted hidden sm:block">
             This is the start of the #{channel.name} channel.
          </span>
        </div>
        
        <div className="flex items-center space-x-4 text-discord-textMuted">
           <Bell size={20} className="hover:text-discord-text cursor-pointer" />
           <Pin size={20} className="hover:text-discord-text cursor-pointer" />
           <Users size={20} className="hover:text-discord-text cursor-pointer" />
           <div className="relative">
              <input 
                type="text" 
                placeholder="Search" 
                className="bg-discord-darker text-sm px-2 py-1 rounded w-32 transition-all focus:w-48 text-white placeholder-discord-textMuted outline-none" 
              />
              <Search size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-discord-textMuted" />
           </div>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="mt-4 mb-8">
              <div className="w-16 h-16 bg-discord-active rounded-full flex items-center justify-center mb-4">
                  <Hash size={40} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Welcome to #{channel.name}!</h1>
              <p className="text-discord-textMuted">This is the start of the <span className="font-bold text-discord-text">#{channel.name}</span> channel.</p>
          </div>

          {messages.map((msg, index) => {
              const prevMsg = messages[index - 1];
              const isSequence = prevMsg && prevMsg.senderId === msg.senderId && (msg.timestamp - prevMsg.timestamp < 60000);
              const date = new Date(msg.timestamp);

              return (
                  <div key={msg.id} className={`group flex pr-4 ${isSequence ? 'mt-1 py-0.5' : 'mt-4 py-0.5 hover:bg-[#2e3035]'}`}>
                      {!isSequence ? (
                          <div className="w-10 h-10 rounded-full bg-gray-500 mr-4 mt-0.5 overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80">
                             <img src={msg.senderAvatar || `https://ui-avatars.com/api/?name=${msg.senderName}`} alt="avatar" className="w-full h-full object-cover"/>
                          </div>
                      ) : (
                          <div className="w-10 mr-4 text-xs text-discord-textMuted opacity-0 group-hover:opacity-100 text-right select-none pt-1">
                              {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                          {!isSequence && (
                              <div className="flex items-center space-x-2">
                                  <span className={`font-medium hover:underline cursor-pointer ${msg.senderName === 'Gemini' ? 'text-blue-400' : 'text-white'}`}>
                                    {msg.senderName}
                                  </span>
                                  {msg.senderName === 'Gemini' && (
                                     <span className="bg-discord-blurple text-white text-[10px] px-1.5 rounded font-bold uppercase py-[1px]">BOT</span>
                                  )}
                                  <span className="text-xs text-discord-textMuted ml-2">
                                      {date.toLocaleDateString()} at {date.toLocaleTimeString()}
                                  </span>
                              </div>
                          )}
                          <p className={`text-discord-text whitespace-pre-wrap leading-6 ${isSequence ? '' : ''}`}>
                              {msg.content}
                          </p>
                      </div>
                  </div>
              )
          })}
          <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-4 pb-6 pt-2">
         <div className="bg-discord-light rounded-lg p-2.5 flex items-center shadow-sm">
             <button className="text-discord-textMuted hover:text-discord-text p-1 mr-2"><PlusCircle size={20} /></button>
             <input 
                type="text"
                className="bg-transparent flex-1 text-discord-text outline-none placeholder-discord-textMuted"
                placeholder={`Message #${channel.name} (Type @Gemini to chat with AI)`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
             />
             <div className="flex items-center space-x-3 mx-2 text-discord-textMuted">
                 <Gift size={20} className="hover:text-discord-text cursor-pointer" />
                 <Sticker size={20} className="hover:text-discord-text cursor-pointer" />
                 <Smile size={20} className="hover:text-discord-text cursor-pointer" />
             </div>
         </div>
         {inputValue.includes('@gemini') && (
             <div className="text-xs text-discord-blurple mt-1 font-bold">
                 Gemini AI will reply to this message.
             </div>
         )}
      </div>
    </div>
  );
};
