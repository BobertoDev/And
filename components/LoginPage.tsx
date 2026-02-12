import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../types';

interface LoginPageProps {
    onLogin: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [guestName, setGuestName] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const handleGoogleLogin = () => {
        setIsLoggingIn(true);
        // Simulate network delay for Google Auth
        setTimeout(() => {
            const googleUser: User = {
                id: uuidv4(),
                username: "Alex from Google",
                avatar: "https://lh3.googleusercontent.com/a/default-user=s100", // Generic Google-like avatar
                status: 'online',
                isBot: false
            };
            onLogin(googleUser);
        }, 1500);
    };

    const handleGuestLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!guestName.trim()) return;

        const guestUser: User = {
            id: uuidv4(),
            username: guestName,
            avatar: `https://ui-avatars.com/api/?background=random&name=${guestName}`,
            status: 'online',
            isBot: false
        };
        onLogin(guestUser);
    };

    return (
        <div className="w-full h-screen flex items-center justify-center bg-[url('https://cdn.discordapp.com/attachments/886981320491069480/1094017586071060591/Login_Background.png')] bg-cover bg-center relative">
            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

            <div className="bg-discord-dark p-8 rounded shadow-2xl w-full max-w-[480px] z-10 animate-fade-in-up">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-white mb-2">Welcome back!</h2>
                    <p className="text-discord-textMuted">We're so excited to see you again!</p>
                </div>

                <div className="space-y-4">
                    {/* Google Login Button */}
                    <button 
                        onClick={handleGoogleLogin}
                        disabled={isLoggingIn}
                        className="w-full bg-white hover:bg-gray-100 text-[#3c4043] font-medium py-2.5 px-4 rounded transition-colors flex items-center justify-center relative overflow-hidden group"
                    >
                        {isLoggingIn ? (
                            <div className="w-5 h-5 border-2 border-gray-400 border-t-blue-500 rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <div className="absolute left-4">
                                    <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                                        <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                                        <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                                        <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.464 63.239 -14.754 63.239 Z" />
                                        <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.734 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                                        <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.799 L -6.734 42.379 C -8.804 40.449 -11.514 39.239 -14.754 39.239 C -19.464 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                                        </g>
                                    </svg>
                                </div>
                                <span>Sign in with Google</span>
                            </>
                        )}
                    </button>

                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-gray-600"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-500 text-xs font-bold uppercase">Or</span>
                        <div className="flex-grow border-t border-gray-600"></div>
                    </div>

                    {/* Guest Login Form */}
                    <form onSubmit={handleGuestLogin}>
                        <div className="mb-4">
                            <label className="block text-discord-textMuted text-xs font-bold uppercase mb-2">
                                Display Name
                            </label>
                            <input 
                                type="text"
                                value={guestName}
                                onChange={(e) => setGuestName(e.target.value)}
                                className="w-full bg-discord-darker text-white p-2.5 rounded border border-transparent focus:border-discord-blurple outline-none transition-colors"
                                placeholder="How should we call you?"
                            />
                        </div>
                        <button 
                            type="submit"
                            className="w-full bg-discord-blurple hover:bg-discord-blurpleHover text-white font-medium py-2.5 px-4 rounded transition-colors"
                        >
                            Continue as Guest
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
