"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface User {
    _id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    isApproved?: boolean;
    phone?: string;
    plan?: string;
    role: string;
    tokenLimit?: number;
    tokensUsed?: number;
    simMinutesLimit?: number;
    simMinutesUsed?: number;
    apiKey?: string;
    apiEnabled?: boolean;
    createdAt: string;
}

export default function UserManager() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Modal States
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // Form States
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [phone, setPhone] = useState("");
    const [plan, setPlan] = useState<'Guest' | 'Pro' | 'Enterprise'>('Guest');
    const [tokenLimit, setTokenLimit] = useState<number>(100000);
    const [simMinutesLimit, setSimMinutesLimit] = useState<number>(5);
    const [simMinutesUsed, setSimMinutesUsed] = useState<number>(0);
    const [apiKey, setApiKey] = useState("");
    const [apiEnabled, setApiEnabled] = useState(false);
    const [role, setRole] = useState<'user' | 'admin' | 'enterprise' | 'builder'>('user');
    const [formError, setFormError] = useState("");
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await axios.get('/api/admin/users');
            if (Array.isArray(res.data)) {
                setUsers(res.data);
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setEmail("");
        setPassword("");
        setFirstName("");
        setLastName("");
        setPhone("");
        setPlan('Guest');
        setTokenLimit(100000);
        setSimMinutesLimit(5);
        setSimMinutesUsed(0);
        setApiKey("");
        setApiEnabled(false);
        setRole('user');
        setFormError("");
        setSelectedUser(null);
    };

    const handleAddUser = async () => {
        if (!email || !password) {
            setFormError("Email and password are required");
            return;
        }
        setActionLoading(true);
        setFormError("");

        try {
            const res = await axios.post('/api/admin/users', {
                email,
                password,
                firstName,
                lastName,
                phone,
                plan,
                role,
                apiKey: "",
                apiEnabled: false
            });

            setUsers([res.data, ...users]);
            setShowAddModal(false);
            resetForm();
        } catch (error: any) {
            setFormError(error.response?.data?.error || "Failed to create user");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!confirm("Are you sure you want to delete this user? Action cannot be undone.")) return;

        try {
            await axios.delete(`/api/admin/users?id=${id}`);
            setUsers(users.filter(u => u._id !== id));
        } catch (error) {
            console.error("Delete failed", error);
        }
    };

    const handleEditUser = async () => {
        if (!selectedUser) return;
        setActionLoading(true);

        const updates: any = {
            id: selectedUser._id,
            email,
            firstName,
            lastName,
            phone,
            plan,
            role,
            tokenLimit,
            simMinutesLimit,
            simMinutesUsed,
            apiKey,
            apiEnabled
        };

        if (password) {
            updates.password = password;
        }

        try {
            const res = await axios.put('/api/admin/users', updates);
            setUsers(users.map(u => u._id === selectedUser._id ? res.data : u));
            setShowEditModal(false);
            resetForm();
        } catch (error: any) {
            alert(error.response?.data?.error || "Failed to update user");
        } finally {
            setActionLoading(false);
        }
    };

    const handleToggleApproval = async (user: User) => {
        const newStatus = !user.isApproved;
        try {
            const res = await axios.put('/api/admin/users', {
                id: user._id,
                isApproved: newStatus
            });
            setUsers(users.map(u => u._id === user._id ? { ...u, isApproved: newStatus } : u));
        } catch (error) {
            console.error("Status update failed", error);
        }
    };

    const generateNewApiKey = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = 'pb_'; // Prime Blazar prefix
        for (let i = 0; i < 32; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setApiKey(result);
    };

    const filteredUsers = users.filter(u =>
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-xl font-semibold text-slate-900">User accounts</h2>
                <button
                    onClick={() => { resetForm(); setShowAddModal(true); }}
                    className="bg-[#3066bb] hover:bg-[#255299] text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm"
                >
                    Add new user
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <input
                    type="text"
                    placeholder="Search users by email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-5 py-3 bg-white border border-[#3066bb]/30 rounded-xl focus:ring-1 focus:ring-[#3066bb] outline-none transition-all placeholder:text-slate-400 text-sm text-slate-900"
                />
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl border border-[#3066bb]/30 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-[#3066bb]/5 text-slate-900 border-b border-[#3066bb]/30 font-semibold">
                            <tr>
                                <th className="px-5 py-4">User</th>
                                <th className="px-5 py-4">Status</th>
                                <th className="px-5 py-4">Tokens</th>
                                <th className="px-5 py-4">Sim Minutes</th>
                                <th className="px-5 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                                        Loading users...
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                                        No users found.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map(user => (
                                    <tr key={user._id} className="hover:bg-[#3066bb]/5 transition-colors group">
                                        <td className="px-5 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-900">{user.email}</span>
                                                {(user.firstName || user.lastName) && (
                                                    <span className="text-xs text-slate-400">{user.firstName} {user.lastName}</span>
                                                )}
                                                <span className="text-[10px] text-slate-400">{user.role} • {user.plan}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            {user.role === 'admin' ? (
                                                <span className="px-2 py-0.5 bg-[#3066bb]/5 text-[#3066bb] rounded text-[10px] font-bold border border-[#3066bb]/20">Admin</span>
                                            ) : user.role === 'enterprise' ? (
                                                <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-[10px] font-bold border border-purple-100">Enterprise</span>
                                            ) : user.role === 'builder' ? (
                                                <span className="px-2 py-0.5 bg-[#3066bb]/5 text-[#3066bb] rounded text-[10px] font-bold border border-[#3066bb]/20">Builder</span>
                                            ) : user.isApproved ? (
                                                <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded text-[10px] font-bold border border-green-100">Active</span>
                                            ) : (
                                                <span className="px-2 py-0.5 bg-[#3066bb]/10 text-slate-500 rounded text-[10px] font-bold border border-[#3066bb]/30">Pending</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                                    <span className={((user.tokensUsed || 0) >= (user.tokenLimit || 100000)) ? "text-red-500 font-bold" : "text-slate-900 font-semibold"}>
                                                        {(user.tokensUsed || 0).toLocaleString()}
                                                    </span>
                                                    <span>/</span>
                                                    <span>{(user.tokenLimit || 100000).toLocaleString()}</span>
                                                </div>
                                                <div className="w-24 h-1 rounded-full bg-[#3066bb]/10 overflow-hidden">
                                                    <div
                                                        className={`h-full ${((user.tokensUsed || 0) >= (user.tokenLimit || 100000)) ? 'bg-red-500' : 'bg-[#3066bb]'}`}
                                                        style={{ width: `${Math.min(((user.tokensUsed || 0) / (user.tokenLimit || 100000)) * 100, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                                    <span className={((user.simMinutesUsed || 0) >= (user.simMinutesLimit || 5)) ? "text-red-500 font-bold" : "text-slate-900 font-semibold"}>
                                                        {(user.simMinutesUsed || 0).toFixed(1)}
                                                    </span>
                                                    <span>/</span>
                                                    <span>{(user.simMinutesLimit || 5).toFixed(0)}</span>
                                                </div>
                                                <div className="w-24 h-1 rounded-full bg-[#3066bb]/10 overflow-hidden">
                                                    <div
                                                        className={`h-full ${((user.simMinutesUsed || 0) >= (user.simMinutesLimit || 5)) ? 'bg-red-500' : 'bg-[#3066bb]'}`}
                                                        style={{ width: `${Math.min(((user.simMinutesUsed || 0) / (user.simMinutesLimit || 5)) * 100, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex justify-end gap-3 items-center">
                                                {user.role !== 'admin' && (
                                                    <button
                                                        onClick={() => handleToggleApproval(user)}
                                                        className={`text-xs font-semibold ${user.isApproved ? 'text-slate-400 hover:text-red-500' : 'text-[#3066bb] hover:underline'}`}
                                                    >
                                                        {user.isApproved ? "Revoke" : "Approve"}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setFirstName(user.firstName || "");
                                                        setLastName(user.lastName || "");
                                                        setEmail(user.email || "");
                                                        setPhone(user.phone || "");
                                                        setPlan(user.plan as any || 'Guest');
                                                        setTokenLimit(user.tokenLimit || 100000);
                                                        setSimMinutesLimit(user.simMinutesLimit || 5);
                                                        setSimMinutesUsed(user.simMinutesUsed || 0);
                                                        setApiKey(user.apiKey || "");
                                                        setApiEnabled(user.apiEnabled || false);
                                                        setRole(user.role as any || 'user');
                                                        setPassword("");
                                                        setShowEditModal(true);
                                                    }}
                                                    className="text-slate-600 hover:text-slate-900 font-semibold text-xs"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user._id)}
                                                    className="text-red-500 hover:text-red-600 font-semibold text-xs"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ADD USER MODAL */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-2xl border border-[#3066bb]/30 shadow-xl p-6 relative animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-slate-900 mb-6">New user account</h3>
                        
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">First name</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 bg-[#3066bb]/5 border border-[#3066bb]/30 rounded-lg outline-none focus:ring-1 focus:ring-[#3066bb] text-sm"
                                        placeholder="Jane"
                                        value={firstName}
                                        onChange={e => setFirstName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Last name</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 bg-[#3066bb]/5 border border-[#3066bb]/30 rounded-lg outline-none focus:ring-1 focus:ring-[#3066bb] text-sm"
                                        placeholder="Doe"
                                        value={lastName}
                                        onChange={e => setLastName(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Email address</label>
                                <input
                                    type="email"
                                    className="w-full p-2.5 bg-[#3066bb]/5 border border-[#3066bb]/30 rounded-lg outline-none focus:ring-1 focus:ring-[#3066bb] text-sm"
                                    placeholder="user@example.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Initial password</label>
                                <input
                                    type="text"
                                    className="w-full p-2.5 bg-[#3066bb]/5 border border-[#3066bb]/30 rounded-lg outline-none focus:ring-1 focus:ring-[#3066bb] text-sm font-mono"
                                    placeholder="Enter secure password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Plan tier</label>
                                <select
                                    className="w-full p-2.5 bg-[#3066bb]/5 border border-[#3066bb]/30 rounded-lg outline-none focus:ring-1 focus:ring-[#3066bb] text-sm"
                                    value={plan}
                                    onChange={e => setPlan(e.target.value as any)}
                                >
                                    <option value="Guest">Guest</option>
                                    <option value="Pro">Pro</option>
                                    <option value="Enterprise">Enterprise</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">System Role</label>
                                <select
                                    className="w-full p-2.5 bg-[#3066bb]/5 border border-[#3066bb]/30 rounded-lg outline-none focus:ring-1 focus:ring-[#3066bb] text-sm font-semibold"
                                    value={role}
                                    onChange={e => setRole(e.target.value as any)}
                                >
                                    <option value="user">Standard User</option>
                                    <option value="builder">Quantum Builder</option>
                                    <option value="enterprise">Enterprise Partner</option>
                                    <option value="admin">Administrator</option>
                                </select>
                            </div>

                            {formError && (
                                <p className="text-xs text-red-500 bg-red-50 p-2 rounded border border-red-100">{formError}</p>
                            )}

                            <div className="pt-4 flex justify-end gap-3">
                                <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">
                                    Cancel
                                </button>
                                <button onClick={handleAddUser} disabled={actionLoading} className="px-6 py-2 bg-[#3066bb] hover:bg-[#255299] text-white rounded-xl text-sm font-semibold shadow-sm disabled:opacity-50">
                                    {actionLoading ? 'Creating...' : 'Create account'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT USER MODAL */}
            {showEditModal && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white w-full max-w-xl rounded-2xl border border-[#3066bb]/30 shadow-xl p-8 relative animate-in zoom-in-95 duration-200 my-8">
                        <h3 className="text-xl font-bold text-slate-900 mb-8">Edit user account</h3>
                        
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">First name</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 bg-[#3066bb]/5 border border-[#3066bb]/30 rounded-xl outline-none focus:ring-1 focus:ring-[#3066bb] text-sm"
                                        value={firstName}
                                        onChange={e => setFirstName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Last name</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 bg-[#3066bb]/5 border border-[#3066bb]/30 rounded-xl outline-none focus:ring-1 focus:ring-[#3066bb] text-sm"
                                        value={lastName}
                                        onChange={e => setLastName(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Email address</label>
                                    <input
                                        type="email"
                                        className="w-full p-3 bg-[#3066bb]/5 border border-[#3066bb]/30 rounded-xl outline-none focus:ring-1 focus:ring-[#3066bb] text-sm"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Phone number</label>
                                    <input
                                        type="tel"
                                        className="w-full p-3 bg-[#3066bb]/5 border border-[#3066bb]/30 rounded-xl outline-none focus:ring-1 focus:ring-[#3066bb] text-sm"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Plan tier</label>
                                    <select
                                        className="w-full p-3 bg-[#3066bb]/5 border border-[#3066bb]/30 rounded-xl outline-none focus:ring-1 focus:ring-[#3066bb] text-sm"
                                        value={plan}
                                        onChange={e => setPlan(e.target.value as any)}
                                    >
                                        <option value="Guest">Guest</option>
                                        <option value="Pro">Pro</option>
                                        <option value="Enterprise">Enterprise</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">System Role</label>
                                    <select
                                        className="w-full p-3 bg-[#3066bb]/5 border border-[#3066bb]/30 rounded-xl outline-none focus:ring-1 focus:ring-[#3066bb] text-sm font-semibold"
                                        value={role}
                                        onChange={e => setRole(e.target.value as any)}
                                    >
                                        <option value="user">Standard User</option>
                                        <option value="builder">Quantum Builder</option>
                                        <option value="enterprise">Enterprise Partner</option>
                                        <option value="admin">Administrator</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Token limit</label>
                                    <input
                                        type="number"
                                        className="w-full p-3 bg-[#3066bb]/5 border border-[#3066bb]/30 rounded-xl outline-none focus:ring-1 focus:ring-[#3066bb] text-sm font-mono"
                                        value={tokenLimit}
                                        onChange={e => setTokenLimit(Number(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Sim minutes limit</label>
                                    <input
                                        type="number"
                                        className="w-full p-3 bg-[#3066bb]/5 border border-[#3066bb]/30 rounded-xl outline-none focus:ring-1 focus:ring-[#3066bb] text-sm font-mono"
                                        value={simMinutesLimit}
                                        onChange={e => setSimMinutesLimit(Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Sim minutes used</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        className="w-full p-3 bg-[#3066bb]/5 border border-[#3066bb]/30 rounded-xl outline-none focus:ring-1 focus:ring-[#3066bb] text-sm font-mono"
                                        value={simMinutesUsed}
                                        onChange={e => setSimMinutesUsed(Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-[#3066bb]/20 space-y-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">API Access & Key</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-400 font-semibold">{apiEnabled ? 'ENABLED' : 'DISABLED'}</span>
                                        <button 
                                            onClick={() => setApiEnabled(!apiEnabled)}
                                            className={`w-8 h-4 rounded-full transition-colors relative ${apiEnabled ? 'bg-green-500' : 'bg-slate-300'}`}
                                        >
                                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${apiEnabled ? 'left-4.5' : 'left-0.5'}`} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className="flex-1 p-3 bg-[#3066bb]/5 border border-[#3066bb]/30 rounded-xl outline-none focus:ring-1 focus:ring-[#3066bb] text-xs font-mono placeholder:text-slate-300"
                                        placeholder="No API Key generated"
                                        value={apiKey}
                                        readOnly
                                    />
                                    <button 
                                        onClick={generateNewApiKey}
                                        className="px-4 bg-[#3066bb]/10 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-bold transition-colors"
                                    >
                                        GENERATE
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400">API Key allows users to bypass the dashboard and run simulations programmatically.</p>
                            </div>

                            <div className="pt-4 border-t border-[#3066bb]/20">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">New password (optional)</label>
                                <input
                                    type="text"
                                    className="w-full p-3 bg-[#3066bb]/5 border border-[#3066bb]/30 rounded-xl outline-none focus:ring-1 focus:ring-[#3066bb] text-sm font-mono placeholder:text-slate-300"
                                    placeholder="Leave blank to keep current"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>

                            <div className="pt-6 flex justify-end gap-3">
                                <button
                                    onClick={() => { setShowEditModal(false); setSelectedUser(null); }}
                                    className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleEditUser}
                                    disabled={actionLoading}
                                    className="px-8 py-2.5 bg-[#3066bb] hover:bg-[#255299] text-white rounded-xl text-sm font-semibold shadow-sm disabled:opacity-50"
                                >
                                    {actionLoading ? 'Saving...' : 'Save changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
