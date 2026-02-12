import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, Video, Headphones, VolumeX, MoreHorizontal, AlertCircle, Monitor, MonitorOff } from 'lucide-react';
import { User, Channel } from '../types';

interface VoiceStageProps {
    channel: Channel;
    currentUser: User;
    channelUsers: Array<{ userId: string; username: string; avatar: string }>;
    onLeave: () => void;
    isMuted: boolean;
    toggleMute: () => void;
    isDeafened: boolean;
    toggleDeafen: () => void;
    noiseSuppression: boolean;
    inputVolume: number;
    outputVolume: number;
}

export const VoiceStage: React.FC<VoiceStageProps> = ({
    channel,
    currentUser,
    channelUsers,
    onLeave,
    isMuted,
    toggleMute,
    isDeafened,
    toggleDeafen,
    noiseSuppression,
    inputVolume,
    outputVolume
}) => {
    const [volume, setVolume] = useState(0);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const inputGainRef = useRef<GainNode | null>(null);
    const requestRef = useRef<number | null>(null);
    const screenVideoRef = useRef<HTMLVideoElement>(null);

    // Initial Audio Setup
    useEffect(() => {
        const initAudio = async () => {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setError("Audio not supported in this browser.");
                return;
            }

            try {
                // Initial Constraints
                const constraints = {
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: noiseSuppression, // Use initial prop
                        autoGainControl: true
                    },
                    video: false
                };

                const audioStream = await navigator.mediaDevices.getUserMedia(constraints);
                setStream(audioStream);
                setError(null);

                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                analyserRef.current = audioContextRef.current.createAnalyser();
                inputGainRef.current = audioContextRef.current.createGain();
                
                // Initial Volume from props
                inputGainRef.current.gain.value = inputVolume / 100;

                const source = audioContextRef.current.createMediaStreamSource(audioStream);
                
                // Chain: Source -> Gain -> Analyser
                source.connect(inputGainRef.current);
                inputGainRef.current.connect(analyserRef.current);
                
                analyserRef.current.fftSize = 256;
                
                const bufferLength = analyserRef.current.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);

                const updateVolume = () => {
                    if (analyserRef.current) {
                        analyserRef.current.getByteFrequencyData(dataArray);
                        // Calculate average volume
                        let sum = 0;
                        for(let i = 0; i < bufferLength; i++) {
                            sum += dataArray[i];
                        }
                        const average = sum / bufferLength;
                        setVolume(average);
                    }
                    requestRef.current = requestAnimationFrame(updateVolume);
                };

                updateVolume();

            } catch (err) {
                console.error("Error accessing microphone", err);
                setError("Microphone access denied. You are in listener mode.");
            }
        };

        initAudio();

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (screenStream) {
                screenStream.getTracks().forEach(track => track.stop());
            }
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close().catch(e => console.error("Error closing audio context", e));
            }
        };
    }, []); // Run once on mount

    // Handle Input Volume Changes
    useEffect(() => {
        if (inputGainRef.current) {
            // Volume is 0-200, so map to 0.0 - 2.0 gain
            inputGainRef.current.gain.value = inputVolume / 100;
        }
    }, [inputVolume]);

    // Handle Mute / Deafen Changes on the stream
    useEffect(() => {
        if (stream) {
            stream.getAudioTracks().forEach(track => {
                // If muted OR deafened, the mic should be disabled
                track.enabled = !isMuted;
            });
        }
    }, [isMuted, stream]);

    // Handle Noise Suppression updates
    useEffect(() => {
        if (stream) {
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack && audioTrack.getCapabilities().noiseSuppression) {
                audioTrack.applyConstraints({
                    noiseSuppression: noiseSuppression
                }).catch(e => console.warn("Failed to apply noise suppression", e));
            }
        }
    }, [noiseSuppression, stream]);

    // Handle Screen Share Stream attachment
    useEffect(() => {
        if (screenVideoRef.current && screenStream) {
            screenVideoRef.current.srcObject = screenStream;
        }
    }, [screenStream]);

    const toggleScreenShare = async () => {
        if (screenStream) {
            // Stop sharing
            screenStream.getTracks().forEach(track => track.stop());
            setScreenStream(null);
        } else {
            // Start sharing
            try {
                // @ts-ignore - getDisplayMedia might not be in all TS definitions
                if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
                     setError("Screen sharing not supported.");
                     return;
                }

                const displayStream = await navigator.mediaDevices.getDisplayMedia({ 
                    video: true,
                    audio: true 
                });
                
                setScreenStream(displayStream);
                setError(null); // Clear previous errors

                // Handle if user clicks "Stop Sharing" in the browser's built-in UI
                displayStream.getVideoTracks()[0].onended = () => {
                    setScreenStream(null);
                };
            } catch (err: any) {
                console.error("Error sharing screen:", err);
                if (err.name === 'NotAllowedError') {
                    setError("Screen share permission denied.");
                } else {
                    setError("Failed to share screen. " + (err.message || ""));
                }
            }
        }
    };

    return (
        <div className="flex-1 bg-black flex flex-col items-center justify-between p-4 h-full relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-discord-dark opacity-50 z-0"></div>

            <div className="w-full flex justify-between items-center z-10">
                <div className="text-discord-textMuted text-sm font-bold flex items-center">
                    <span className="text-discord-green mr-2">●</span> Connected to <span className="text-white ml-1">{channel.name}</span>
                    <span className="ml-2 px-2 py-0.5 bg-discord-blurple rounded text-xs text-white">Gemini Voice Compatible</span>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="w-full max-w-md bg-discord-red/90 text-white px-4 py-2 rounded mb-4 z-20 flex items-center shadow-lg absolute top-16 transition-all animate-bounce">
                    <AlertCircle size={20} className="mr-2" />
                    <span className="text-sm font-medium">{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto hover:text-black/50">
                         <div className="text-xs font-bold border border-white/50 px-1 rounded">X</div>
                    </button>
                </div>
            )}

            {/* Main Stage (Users & Screen Share) */}
            <div className="flex-1 w-full flex flex-col items-center justify-center z-10 gap-4 overflow-y-auto">
                
                {/* Screen Share View (if active) */}
                {screenStream && (
                    <div className="w-full max-w-4xl aspect-video bg-black rounded-xl border border-discord-darker shadow-2xl relative overflow-hidden group mb-4 shrink-0">
                        <video 
                            ref={screenVideoRef}
                            autoPlay 
                            playsInline 
                            muted // Mute local preview to prevent echo
                            className="w-full h-full object-contain"
                        />
                        <div className="absolute top-4 left-4 bg-discord-red px-2 py-1 rounded text-white text-xs font-bold uppercase shadow-sm flex items-center animate-pulse">
                            <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
                            Live
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white font-bold">{currentUser.username}'s Screen</span>
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-center gap-4">
                    {/* Current User Card */}
                    <div className={`relative w-48 h-48 rounded-2xl bg-discord-dark border-2 transition-all duration-100 flex flex-col items-center justify-center
                        ${volume > 10 && !isMuted ? 'border-discord-green shadow-[0_0_15px_rgba(35,165,89,0.5)]' : 'border-transparent'}
                    `}>
                        <div className="w-24 h-24 rounded-full overflow-hidden mb-4 relative">
                            <img src={currentUser.avatar} alt="Me" className="w-full h-full object-cover" />
                            {(isMuted || error || isDeafened) && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    {isDeafened ? (
                                        <VolumeX className="text-red-500 w-10 h-10" />
                                    ) : (
                                        <MicOff className="text-red-500 w-10 h-10" />
                                    )}
                                </div>
                            )}
                        </div>
                        <span className="text-white font-bold text-lg">{currentUser.username}</span>
                        {volume > 10 && !isMuted && <span className="text-discord-green text-xs font-bold animate-pulse">Speaking...</span>}
                        {(error && !screenStream) && <span className="text-discord-red text-[10px] font-bold mt-1">NO MIC</span>}
                        {screenStream && <span className="text-discord-blurple text-[10px] font-bold mt-1 uppercase">Streaming</span>}
                    </div>

                    {/* Other Users in Channel */}
                    {channelUsers
                        .filter(u => u.userId !== currentUser.id)
                        .map(user => (
                            <div key={user.userId} className="relative w-48 h-48 rounded-2xl bg-discord-dark border-2 border-transparent flex flex-col items-center justify-center">
                                <div className="w-24 h-24 rounded-full overflow-hidden mb-4 relative">
                                    <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                                    {isDeafened && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <VolumeX className="text-red-500 w-10 h-10" />
                                        </div>
                                    )}
                                </div>
                                <span className="text-white font-bold text-lg">{user.username}</span>
                            </div>
                        ))
                    }

                    {/* Waiting message if no other users */}
                    {channelUsers.filter(u => u.userId !== currentUser.id).length === 0 && (
                        <div className="relative w-48 h-48 rounded-2xl bg-discord-dark border-2 border-transparent flex flex-col items-center justify-center opacity-50">
                            <div className="w-24 h-24 rounded-full overflow-hidden mb-4 bg-gray-600 relative">
                                {isDeafened && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <div className="text-white text-xs font-bold px-2 text-center">You are deafened</div>
                                    </div>
                                )}
                            </div>
                            <span className="text-discord-textMuted font-bold">Waiting for friends...</span>
                        </div>
                    )}
                </div>

            </div>

            {/* Controls Bar */}
            <div className="w-full max-w-2xl bg-[#1e1f22] rounded-xl p-3 flex items-center justify-between z-20 shadow-2xl mb-4">
                 <div className="flex items-center space-x-2">
                     <div className="text-white font-bold text-sm px-3">Voice Connected</div>
                     <div className="text-discord-textMuted text-xs">/ RTC Connected</div>
                     {noiseSuppression && (
                         <div className="px-2 py-0.5 bg-discord-green text-white text-[10px] rounded uppercase font-bold ml-2">Noise Supp. On</div>
                     )}
                 </div>

                 <div className="flex items-center space-x-4">
                     <button 
                        onClick={toggleMute}
                        disabled={!!error && !screenStream} // Allow interacting if just mic failed but screen works, though error state might be tricky
                        title={isMuted ? "Unmute" : "Mute"}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors 
                        ${(error && error.includes("Microphone")) ? 'bg-discord-dark opacity-50 cursor-not-allowed' : 
                          isMuted ? 'bg-white text-black' : 'bg-discord-dark hover:bg-discord-active text-white'}`}
                    >
                        {isMuted || (error && error.includes("Microphone")) ? <MicOff size={24} /> : <Mic size={24} />}
                     </button>
                     
                     {/* Deafen Button */}
                     <button 
                         onClick={toggleDeafen}
                         title={isDeafened ? "Undeafen" : "Deafen"}
                         className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors 
                            ${isDeafened ? 'bg-white text-black' : 'bg-discord-dark hover:bg-discord-active text-white'}`}
                     >
                         {isDeafened ? <VolumeX size={24} /> : <Headphones size={24} />} 
                     </button>

                     <button className="w-12 h-12 rounded-full bg-discord-dark hover:bg-discord-active text-white flex items-center justify-center transition-colors">
                         <Video size={24} />
                     </button>
                     
                     {/* Screen Share Button */}
                     <button 
                         onClick={toggleScreenShare}
                         title={screenStream ? "Stop Streaming" : "Share Screen"}
                         className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors 
                         ${screenStream ? 'bg-discord-green text-white' : 'bg-discord-dark hover:bg-discord-active text-white'}`}
                     >
                         {screenStream ? <MonitorOff size={24} /> : <Monitor size={24} />}
                     </button>
                     
                     <button 
                        onClick={onLeave}
                        className="w-14 h-12 rounded-full bg-discord-red hover:bg-red-700 text-white flex items-center justify-center transition-colors"
                     >
                         <PhoneOff size={28} />
                     </button>
                 </div>

                 <div className="flex items-center">
                    <button className="p-2 text-white hover:bg-discord-active rounded-full">
                        <MoreHorizontal />
                    </button>
                 </div>
            </div>
            
            <div className="absolute bottom-2 right-4 text-xs text-discord-textMuted opacity-50 z-0">
                Peer-to-Peer Audio Demo (Simulated)
            </div>
        </div>
    );
};