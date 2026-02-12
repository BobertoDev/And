import { openDB } from 'idb';
import { Server, User, Channel, Role, ServerMember } from '../types';
import { v4 as uuidv4 } from 'uuid';

const DB_NAME = 'discordia-db';
const DB_VERSION = 1;
const STORE_NAME = 'app-state';

export const PUBLIC_SERVER_ID = 'server-community-public-01';

// Default Seed Data
const DEFAULT_CHANNELS: Channel[] = [
    { id: 'c-gen', name: 'general', type: 'text', messages: [] },
    { id: 'c-meme', name: 'memes', type: 'text', messages: [] },
    { id: 'c-voice-1', name: 'General Voice', type: 'voice' },
    { id: 'c-voice-2', name: 'Gaming', type: 'voice' }
];

const DEFAULT_ROLES: Role[] = [
    {
        id: 'r-everyone',
        name: '@everyone',
        color: '#99AAB5',
        permissions: ['SEND_MESSAGES', 'VIEW_CHANNELS'],
        position: 0
    },
    {
        id: 'r-admin',
        name: 'Admin',
        color: '#E91E63',
        permissions: ['ADMINISTRATOR', 'MANAGE_CHANNELS', 'MANAGE_ROLES', 'KICK_MEMBERS', 'SEND_MESSAGES', 'VIEW_CHANNELS'],
        position: 1
    }
];

const SEED_SERVERS: Server[] = [
    {
        id: PUBLIC_SERVER_ID,
        name: 'Discordia Community',
        icon: 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?q=80&w=200&h=200&auto=format&fit=crop',
        ownerId: 'system',
        channels: [
            { 
                id: 'c-welcome', 
                name: 'welcome', 
                type: 'text', 
                messages: [
                    {
                        id: 'msg-welcome',
                        channelId: 'c-welcome',
                        content: 'Welcome to the public community server! Feel free to chat and test the features.',
                        senderId: 'system',
                        senderName: 'System',
                        timestamp: Date.now()
                    }
                ] 
            },
            { id: 'c-general', name: 'general', type: 'text', messages: [] },
            { id: 'c-voice-lounge', name: 'Lounge', type: 'voice' }
        ],
        roles: DEFAULT_ROLES,
        members: [
            {
                userId: 'user-gemini-bot',
                username: 'Gemini',
                avatar: 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg',
                roles: ['r-admin']
            }
        ]
    }
];

export const getDatabase = async () => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        },
    });
};

export const initDB = async (): Promise<{ user: User | null, servers: Server[] }> => {
    const db = await getDatabase();
    const user = await db.get(STORE_NAME, 'user');
    const servers = await db.get(STORE_NAME, 'servers');

    let finalServers = servers;
    
    // Seed servers if they don't exist
    if (!finalServers || finalServers.length === 0) {
        finalServers = JSON.parse(JSON.stringify(SEED_SERVERS));
        await db.put(STORE_NAME, finalServers, 'servers');
    }

    // Return user as found (or null)
    return { user: user || null, servers: finalServers };
};

export const saveServers = async (servers: Server[]) => {
    const db = await getDatabase();
    await db.put(STORE_NAME, servers, 'servers');
};

export const saveUser = async (user: User) => {
    const db = await getDatabase();
    await db.put(STORE_NAME, user, 'user');
};

export const getDefaultChannels = (): Channel[] => {
    return JSON.parse(JSON.stringify(DEFAULT_CHANNELS));
}

export const getDefaultRoles = (): Role[] => {
    return JSON.parse(JSON.stringify(DEFAULT_ROLES));
}

export const getSeedServers = (): Server[] => {
    return JSON.parse(JSON.stringify(SEED_SERVERS));
}