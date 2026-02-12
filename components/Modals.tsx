import React, { useState } from 'react';
import { X, Upload, ChevronRight, Volume2, Mic, Sliders } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
}

// Added SettingsModal specific props interface
interface SettingsModalProps extends Omit<ModalProps, 'onSubmit'> {
    noiseSuppression: boolean;
    onToggleNoiseSuppression: (enabled: boolean) => void;
    inputVolume: number;
    setInputVolume: (val: number) => void;
    outputVolume: number;
    setOutputVolume: (val: number) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, 
    onClose, 
    noiseSuppression, 
    onToggleNoiseSuppression,
    inputVolume,
    setInputVolume,
    outputVolume,
    setOutputVolume
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in">
             <div className="bg-discord-dark w-[800px] h-[600px] rounded-lg flex overflow-hidden shadow-2xl relative">
                {/* Sidebar */}
                <div className="w-[230px] bg-discord-sidebar flex flex-col pt-10 px-2 space-y-0.5">
                    <div className="px-2.5 py-1.5 text-xs font-bold text-discord-textMuted uppercase mb-1">User Settings</div>
                    <div className="px-2.5 py-1.5 rounded bg-discord-active text-white font-medium cursor-pointer">Voice & Video</div>
                    <div className="px-2.5 py-1.5 rounded text-discord-textMuted hover:bg-discord-active hover:text-discord-text cursor-pointer">Appearance</div>
                    <div className="px-2.5 py-1.5 rounded text-discord-textMuted hover:bg-discord-active hover:text-discord-text cursor-pointer">Keybinds</div>
                    <div className="my-2 border-b border-discord-divider"></div>
                    <div onClick={onClose} className="px-2.5 py-1.5 rounded text-discord-red hover:bg-discord-active cursor-pointer font-medium flex justify-between items-center group">
                        Log Out
                        <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 bg-discord-dark p-10 overflow-y-auto relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-discord-textMuted hover:text-discord-text flex flex-col items-center">
                        <div className="w-9 h-9 border-2 border-discord-textMuted rounded-full flex items-center justify-center mb-1">
                            <X size={20} />
                        </div>
                        <span className="text-xs font-bold uppercase">ESC</span>
                    </button>

                    <h2 className="text-xl font-bold text-white mb-6">Voice Settings</h2>

                    {/* Noise Suppression Section */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-discord-textMuted uppercase">Advanced</label>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-discord-light rounded mb-4">
                            <div>
                                <div className="text-white font-medium mb-1 flex items-center">
                                    Noise Suppression
                                    <span className="ml-2 bg-discord-blurple text-[10px] text-white px-1.5 rounded font-bold uppercase">Beta</span>
                                </div>
                                <div className="text-sm text-discord-textMuted">
                                    Suppress background noise from your microphone.
                                </div>
                            </div>
                            <div 
                                onClick={() => onToggleNoiseSuppression(!noiseSuppression)}
                                className={`w-10 h-6 rounded-full cursor-pointer relative transition-colors ${noiseSuppression ? 'bg-discord-green' : 'bg-gray-500'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${noiseSuppression ? 'left-5' : 'left-1'}`} />
                            </div>
                        </div>

                        {/* Input/Output Sliders */}
                        <div className="space-y-8 mt-8">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-bold text-discord-textMuted uppercase block">Input Volume</label>
                                    <span className="text-xs font-bold text-white">{inputVolume}%</span>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <Mic size={20} className="text-discord-textMuted" />
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="200" 
                                        value={inputVolume} 
                                        onChange={(e) => setInputVolume(Number(e.target.value))}
                                        className="w-full h-2 bg-discord-light rounded-lg appearance-none cursor-pointer accent-discord-blurple"
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-bold text-discord-textMuted uppercase block">Output Volume</label>
                                    <span className="text-xs font-bold text-white">{outputVolume}%</span>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <Volume2 size={20} className="text-discord-textMuted" />
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="200" 
                                        value={outputVolume} 
                                        onChange={(e) => setOutputVolume(Number(e.target.value))}
                                        className="w-full h-2 bg-discord-light rounded-lg appearance-none cursor-pointer accent-discord-blurple"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
             </div>
        </div>
    )
}

export const CreateServerModal: React.FC<ModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-white text-black rounded-lg w-[440px] overflow-hidden flex flex-col transition-all animate-fade-in-up">
                <div className="p-6 text-center">
                    <h2 className="text-2xl font-bold text-[#060607] mb-2">Customize Your Server</h2>
                    <p className="text-gray-600 text-sm mb-6">Give your new server a personality with a name and an icon. You can always change it later.</p>
                    
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50">
                             <Upload size={24} className="text-gray-400 mb-1" />
                             <span className="text-[10px] font-bold text-gray-500 uppercase">Upload</span>
                        </div>
                    </div>

                    <div className="text-left mb-4">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Server Name</label>
                        <input 
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-[#E3E5E8] p-2.5 rounded text-black outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="My Awesome Server"
                        />
                    </div>

                    <div className="text-left">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Password (Optional)</label>
                        <input 
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            type="password"
                            className="w-full bg-[#E3E5E8] p-2.5 rounded text-black outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Secret key"
                        />
                    </div>
                </div>

                <div className="bg-[#F2F3F5] p-4 flex justify-between items-center">
                    <button onClick={onClose} className="text-sm font-medium hover:underline px-4">Back</button>
                    <button 
                        onClick={() => {
                            if (name) {
                                onSubmit({ name, password });
                                onClose();
                                setName('');
                                setPassword('');
                            }
                        }}
                        className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-8 py-2.5 rounded text-sm font-medium transition-colors"
                    >
                        Create
                    </button>
                </div>
            </div>
        </div>
    );
}

export const JoinServerModal: React.FC<ModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-discord-dark rounded-lg w-[440px] overflow-hidden flex flex-col shadow-2xl">
                 <div className="p-6">
                    <h2 className="text-2xl font-bold text-white mb-2 text-center">Join a Server</h2>
                    <p className="text-discord-textMuted text-sm mb-6 text-center">Enter the name and password of the server you want to join.</p>

                    <div className="text-left mb-4">
                        <label className="text-xs font-bold text-discord-textMuted uppercase mb-1.5 block">Server Name</label>
                        <input 
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-discord-darker p-2.5 rounded text-white outline-none focus:ring-2 focus:ring-indigo-500 border border-black/20"
                        />
                    </div>

                    <div className="text-left">
                        <label className="text-xs font-bold text-discord-textMuted uppercase mb-1.5 block">Password</label>
                        <input 
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            type="password"
                            className="w-full bg-discord-darker p-2.5 rounded text-white outline-none focus:ring-2 focus:ring-indigo-500 border border-black/20"
                        />
                    </div>
                 </div>

                 <div className="bg-discord-light p-4 flex justify-between items-center">
                    <button onClick={onClose} className="text-sm font-medium text-white hover:underline px-4">Back</button>
                    <button 
                        onClick={() => {
                            onSubmit({ name, password });
                            onClose();
                        }}
                        className="bg-discord-green hover:bg-emerald-600 text-white px-6 py-2.5 rounded text-sm font-medium transition-colors"
                    >
                        Join Server
                    </button>
                </div>
            </div>
        </div>
    )
}