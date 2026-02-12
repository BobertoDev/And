import React, { useState } from 'react';
import { X, Shield, Users, Plus, Trash2, Check, ChevronRight } from 'lucide-react';
import { Server, Role, Permission } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface ServerSettingsModalProps {
    isOpen: boolean;
    server: Server;
    onClose: () => void;
    onUpdateServer: (server: Server) => void;
}

const PERMISSIONS_LIST: { id: Permission; label: string; description: string }[] = [
    { id: 'ADMINISTRATOR', label: 'Administrator', description: 'Members with this permission have every permission and can bypass channel specific permissions.' },
    { id: 'MANAGE_CHANNELS', label: 'Manage Channels', description: 'Allows members to create, edit, or delete channels.' },
    { id: 'MANAGE_ROLES', label: 'Manage Roles', description: 'Allows members to create new roles and edit/delete roles lower than their highest role.' },
    { id: 'KICK_MEMBERS', label: 'Kick Members', description: 'Allows members to remove other members from this server.' },
    { id: 'SEND_MESSAGES', label: 'Send Messages', description: 'Allows members to send messages in text channels.' },
    { id: 'VIEW_CHANNELS', label: 'View Channels', description: 'Allows members to view channels by default.' },
];

const PRESET_COLORS = ['#99AAB5', '#1ABC9C', '#2ECC71', '#3498DB', '#9B59B6', '#E91E63', '#F1C40F', '#E67E22', '#E74C3C', '#95A5A6', '#607D8B'];

export const ServerSettingsModal: React.FC<ServerSettingsModalProps> = ({ isOpen, server, onClose, onUpdateServer }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'roles' | 'members'>('overview');
    const [selectedRole, setSelectedRole] = useState<Role | null>(server.roles[0] || null);
    
    if (!isOpen) return null;

    const handleCreateRole = () => {
        const newRole: Role = {
            id: uuidv4(),
            name: 'New Role',
            color: '#99AAB5',
            permissions: ['SEND_MESSAGES', 'VIEW_CHANNELS'],
            position: server.roles.length
        };
        const updatedRoles = [...server.roles, newRole];
        const updatedServer = { ...server, roles: updatedRoles };
        onUpdateServer(updatedServer);
        setSelectedRole(newRole);
    };

    const handleDeleteRole = (roleId: string) => {
        if (roleId === 'r-everyone') return; // Cannot delete @everyone
        const updatedRoles = server.roles.filter(r => r.id !== roleId);
        // Also remove this role from all members
        const updatedMembers = server.members.map(m => ({
            ...m,
            roles: m.roles.filter(r => r !== roleId)
        }));
        
        onUpdateServer({ ...server, roles: updatedRoles, members: updatedMembers });
        if (selectedRole?.id === roleId) {
            setSelectedRole(updatedRoles[0]);
        }
    };

    const handleUpdateRole = (roleId: string, updates: Partial<Role>) => {
        const updatedRoles = server.roles.map(r => r.id === roleId ? { ...r, ...updates } : r);
        onUpdateServer({ ...server, roles: updatedRoles });
        // Update local selection if needed
        if (selectedRole?.id === roleId) {
            setSelectedRole({ ...selectedRole, ...updates });
        }
    };

    const togglePermission = (role: Role, perm: Permission) => {
        const hasPerm = role.permissions.includes(perm);
        let newPerms;
        if (hasPerm) {
            newPerms = role.permissions.filter(p => p !== perm);
        } else {
            newPerms = [...role.permissions, perm];
        }
        handleUpdateRole(role.id, { permissions: newPerms });
    };

    const toggleMemberRole = (userId: string, roleId: string) => {
        const member = server.members.find(m => m.userId === userId);
        if (!member) return;

        const hasRole = member.roles.includes(roleId);
        let newRoles;
        if (hasRole) {
            newRoles = member.roles.filter(r => r !== roleId);
        } else {
            newRoles = [...member.roles, roleId];
        }

        const updatedMembers = server.members.map(m => m.userId === userId ? { ...m, roles: newRoles } : m);
        onUpdateServer({ ...server, members: updatedMembers });
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-discord-dark w-[800px] h-[600px] rounded-lg flex overflow-hidden shadow-2xl relative">
                
                {/* Sidebar */}
                <div className="w-[230px] bg-discord-sidebar flex flex-col pt-10 px-2 space-y-0.5">
                    <div className="px-2.5 py-1.5 text-xs font-bold text-discord-textMuted uppercase mb-1">{server.name}</div>
                    
                    <div 
                        onClick={() => setActiveTab('overview')}
                        className={`px-2.5 py-1.5 rounded font-medium cursor-pointer ${activeTab === 'overview' ? 'bg-discord-active text-white' : 'text-discord-textMuted hover:bg-discord-active hover:text-discord-text'}`}
                    >
                        Overview
                    </div>
                    <div 
                        onClick={() => setActiveTab('roles')}
                        className={`px-2.5 py-1.5 rounded font-medium cursor-pointer flex justify-between items-center ${activeTab === 'roles' ? 'bg-discord-active text-white' : 'text-discord-textMuted hover:bg-discord-active hover:text-discord-text'}`}
                    >
                        Roles
                        <Shield size={14} />
                    </div>
                    <div 
                        onClick={() => setActiveTab('members')}
                        className={`px-2.5 py-1.5 rounded font-medium cursor-pointer flex justify-between items-center ${activeTab === 'members' ? 'bg-discord-active text-white' : 'text-discord-textMuted hover:bg-discord-active hover:text-discord-text'}`}
                    >
                        Members
                        <Users size={14} />
                    </div>

                    <div className="my-2 border-b border-discord-divider"></div>
                    
                    <div onClick={onClose} className="px-2.5 py-1.5 rounded text-discord-textMuted hover:bg-discord-active hover:text-discord-text cursor-pointer font-medium flex justify-between items-center group">
                        Exit
                        <X size={14} />
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-discord-dark flex flex-col min-w-0">
                    
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div className="p-10">
                            <h2 className="text-xl font-bold text-white mb-6">Server Overview</h2>
                            <div className="flex space-x-8">
                                <div className="w-24 h-24 rounded-full bg-discord-active flex-shrink-0 overflow-hidden relative group cursor-pointer">
                                    {server.icon ? <img src={server.icon} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">{server.name.substring(0,2)}</div>}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-bold text-white uppercase">Change Icon</div>
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-discord-textMuted uppercase mb-1.5 block">Server Name</label>
                                        <input 
                                            value={server.name}
                                            onChange={(e) => onUpdateServer({...server, name: e.target.value})}
                                            className="w-full bg-discord-darker p-2.5 rounded text-white outline-none focus:ring-2 focus:ring-indigo-500 border border-black/20"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Roles Tab */}
                    {activeTab === 'roles' && (
                        <div className="flex h-full">
                            {/* Role List */}
                            <div className="w-48 bg-discord-darker flex flex-col border-r border-discord-divider">
                                <div className="p-3 border-b border-discord-divider flex justify-between items-center">
                                    <span className="text-xs font-bold text-discord-textMuted uppercase">Roles</span>
                                    <button onClick={handleCreateRole} className="text-discord-textMuted hover:text-white"><Plus size={16} /></button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                    {server.roles.map(role => (
                                        <div 
                                            key={role.id}
                                            onClick={() => setSelectedRole(role)}
                                            className={`px-2 py-1.5 rounded cursor-pointer flex items-center justify-between group ${selectedRole?.id === role.id ? 'bg-discord-active' : 'hover:bg-discord-active/50'}`}
                                        >
                                            <div className="flex items-center truncate">
                                                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: role.color }}></div>
                                                <span className={`text-sm font-medium truncate ${selectedRole?.id === role.id ? 'text-white' : 'text-discord-textMuted'}`}>{role.name}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Role Editor */}
                            {selectedRole && (
                                <div className="flex-1 overflow-y-auto p-6">
                                    <div className="flex justify-between items-start mb-6">
                                        <h2 className="text-xl font-bold text-white">Edit Role - {selectedRole.name}</h2>
                                        {selectedRole.id !== 'r-everyone' && (
                                            <button 
                                                onClick={() => handleDeleteRole(selectedRole.id)}
                                                className="text-discord-red hover:bg-discord-red/10 px-3 py-1.5 rounded text-xs font-bold border border-discord-red"
                                            >
                                                Delete Role
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-6">
                                        {/* Name & Color */}
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs font-bold text-discord-textMuted uppercase mb-1.5 block">Role Name</label>
                                                <input 
                                                    value={selectedRole.name}
                                                    onChange={(e) => handleUpdateRole(selectedRole.id, { name: e.target.value })}
                                                    className="w-full bg-discord-darker p-2.5 rounded text-white outline-none border border-black/20"
                                                    disabled={selectedRole.id === 'r-everyone'}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-discord-textMuted uppercase mb-1.5 block">Role Color</label>
                                                <div className="flex flex-wrap gap-2">
                                                    <div 
                                                        onClick={() => handleUpdateRole(selectedRole.id, { color: '#99AAB5' })}
                                                        className={`w-8 h-8 rounded-full cursor-pointer border-2 flex items-center justify-center bg-[#99AAB5] ${selectedRole.color === '#99AAB5' ? 'border-white' : 'border-transparent'}`}
                                                    ></div>
                                                    {PRESET_COLORS.filter(c => c !== '#99AAB5').map(color => (
                                                        <div 
                                                            key={color}
                                                            onClick={() => handleUpdateRole(selectedRole.id, { color })}
                                                            className={`w-8 h-8 rounded-full cursor-pointer border-2 flex items-center justify-center ${selectedRole.color === color ? 'border-white' : 'border-transparent'}`}
                                                            style={{ backgroundColor: color }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-b border-discord-divider"></div>

                                        {/* Permissions */}
                                        <div>
                                            <h3 className="text-white font-bold mb-4">Permissions</h3>
                                            <div className="space-y-4">
                                                {(() => {
                                                    const isAdmin = selectedRole.permissions.includes('ADMINISTRATOR');
                                                    
                                                    return PERMISSIONS_LIST.map(perm => {
                                                        const isPermAdmin = perm.id === 'ADMINISTRATOR';
                                                        const isSelected = selectedRole.permissions.includes(perm.id);
                                                        
                                                        // If Admin is active, all other permissions are disabled for toggling (locked)
                                                        const isDisabled = isAdmin && !isPermAdmin;
                                                        
                                                        // If Admin is active, show other permissions as ON (active color) because they are granted by default
                                                        const showActive = isPermAdmin ? isSelected : (isAdmin || isSelected);

                                                        return (
                                                            <div key={perm.id} className={`flex items-center justify-between ${isDisabled ? 'opacity-50' : ''}`}>
                                                                <div className="pr-4">
                                                                    <div className="text-white font-medium">{perm.label}</div>
                                                                    <div className="text-sm text-discord-textMuted">{perm.description}</div>
                                                                </div>
                                                                <div 
                                                                    onClick={() => !isDisabled && togglePermission(selectedRole, perm.id)}
                                                                    className={`w-10 h-6 rounded-full relative transition-colors flex-shrink-0 
                                                                        ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'} 
                                                                        ${showActive ? 'bg-discord-green' : 'bg-gray-500'}`}
                                                                >
                                                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${showActive ? 'left-5' : 'left-1'}`} />
                                                                </div>
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Members Tab */}
                    {activeTab === 'members' && (
                        <div className="p-6 h-full overflow-hidden flex flex-col">
                            <h2 className="text-xl font-bold text-white mb-4">Members</h2>
                            <div className="flex-1 overflow-y-auto space-y-2">
                                {server.members.map(member => (
                                    <div key={member.userId} className="flex items-center justify-between p-3 bg-discord-light rounded hover:bg-discord-active/50 group">
                                        <div className="flex items-center">
                                            <img src={member.avatar} className="w-10 h-10 rounded-full mr-3" />
                                            <div>
                                                <div className="text-white font-medium flex items-center">
                                                    {member.username}
                                                    {server.ownerId === member.userId && <CrownIcon />}
                                                </div>
                                                <div className="text-xs text-discord-textMuted flex items-center gap-1 mt-0.5">
                                                    {member.roles.map(rId => {
                                                        const r = server.roles.find(role => role.id === rId);
                                                        if (!r || r.name === '@everyone') return null;
                                                        return (
                                                            <span key={r.id} className="flex items-center px-1.5 rounded bg-discord-darker text-[10px]" style={{ color: r.color }}>
                                                                <div className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: r.color }}></div>
                                                                {r.name}
                                                            </span>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Role Assignment Dropdown (Simplified as visible toggles for now for UX speed) */}
                                        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {server.roles.filter(r => r.name !== '@everyone').map(role => (
                                                <div 
                                                    key={role.id}
                                                    onClick={() => toggleMemberRole(member.userId, role.id)}
                                                    className={`w-6 h-6 rounded-full border border-gray-600 flex items-center justify-center cursor-pointer ${member.roles.includes(role.id) ? 'bg-discord-blurple border-discord-blurple' : 'bg-transparent'}`}
                                                    title={`Toggle ${role.name}`}
                                                >
                                                    {member.roles.includes(role.id) && <Check size={14} className="text-white" />}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 text-xs text-discord-textMuted">
                                * Hover over a member to assign roles using the circles on the right.
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const CrownIcon = () => (
    <svg className="w-3 h-3 text-[#F1C40F] ml-1" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 2l2.5 5h5L15 10l2 6h-14l2-6-2.5-3h5L10 2z" />
    </svg>
);