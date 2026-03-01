import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Key, User as UserIcon, Loader2, Save, X, Search } from 'lucide-react';

interface User {
    _id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    plan?: string;
    role: string;
    tokenLimit?: number;
    tokensUsed?: number;
    createdAt: string;
}

export default function UserManager() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Modal States
    const [showAddModal, setShowAddModal] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // Form States
    const [newEmail, setNewEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newFirstName, setNewFirstName] = useState("");
    const [newLastName, setNewLastName] = useState("");
    const [newPhone, setNewPhone] = useState("");
    const [newPlan, setNewPlan] = useState<'Guest' | 'Pro' | 'Enterprise'>('Guest');
    const [resetPassword, setResetPassword] = useState("");
    const [editTokenLimit, setEditTokenLimit] = useState<number>(100000);
    const [formError, setFormError] = useState("");
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users', { cache: 'no-store' });
            const data = await res.json();
            if (Array.isArray(data)) {
                setUsers(data);
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async () => {
        if (!newEmail || !newPassword) {
            setFormError("Email and password are required");
            return;
        }
        setActionLoading(true);
        setFormError("");

        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: newEmail,
                    password: newPassword,
                    firstName: newFirstName,
                    lastName: newLastName,
                    phone: newPhone,
                    plan: newPlan,
                }),
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to create user");
            }

            setUsers([data, ...users]);
            setShowAddModal(false);
            setNewEmail(""); setNewPassword(""); setNewFirstName(""); setNewLastName(""); setNewPhone(""); setNewPlan('Guest');
        } catch (error: any) {
            setFormError(error.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!confirm("Are you sure you want to delete this user? Action cannot be undone.")) return;

        try {
            const res = await fetch(`/api/admin/users?id=${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                setUsers(users.filter(u => u._id !== id));
            } else {
                alert("Failed to delete user");
            }
        } catch (error) {
            console.error("Delete failed", error);
        }
    };

    const handleEditUser = async () => {
        if (!selectedUser) return;
        setActionLoading(true);

        const updates: any = {
            id: selectedUser._id,
            email: newEmail,
            firstName: newFirstName,
            lastName: newLastName,
            phone: newPhone,
            plan: newPlan,
            tokenLimit: editTokenLimit
        };

        if (resetPassword) {
            updates.password = resetPassword;
        }

        try {
            const res = await fetch('/api/admin/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });

            if (res.ok) {
                await fetchUsers();
                setShowResetModal(false);
                setResetPassword("");
                setSelectedUser(null);
            } else {
                const data = await res.json();
                alert(data.error || "Failed to update user");
            }
        } catch (error) {
            console.error("Update failed", error);
        } finally {
            setActionLoading(false);
        }
    };

    const filteredUsers = users.filter(u =>
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <UserIcon className="text-[#3066bb]" /> User Management
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">Manage platform access and user accounts.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-[#3066bb] hover:bg-[#255299] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95"
                >
                    <Plus size={18} /> Add User
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-3.5 text-muted-foreground w-5 h-5" />
                <input
                    type="text"
                    placeholder="Search users by email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-secondary/30 border border-border rounded-xl focus:ring-2 focus:ring-[#3066bb]/20 focus:border-[#3066bb] outline-none transition-all placeholder:text-muted-foreground"
                />
            </div>

            {/* Users Table */}
            <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-secondary/30 border-b border-border">
                            <tr className="text-muted-foreground font-bold text-xs uppercase tracking-wider">
                                <th className="p-4">User</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Created At</th>
                                <th className="p-4">Tokens</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-muted-foreground">
                                        No users found.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map(user => (
                                    <tr key={user._id} className="hover:bg-secondary/10 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-[#3066bb]/10 text-[#3066bb] flex items-center justify-center border border-[#3066bb]/20">
                                                    <UserIcon size={14} />
                                                </div>
                                                <span className="font-medium text-foreground">{user.email}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 rounded-md bg-secondary text-xs font-bold uppercase text-muted-foreground border border-border">
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-muted-foreground font-mono">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                                                    <span className={((user.tokensUsed || 0) >= (user.tokenLimit || 100000)) ? "text-red-500 font-bold" : "text-foreground"}>
                                                        {(user.tokensUsed || 0).toLocaleString()}
                                                    </span>
                                                    <span>/</span>
                                                    <span>{(user.tokenLimit || 100000).toLocaleString()}</span>
                                                </div>
                                                <div className="w-24 h-1.5 rounded-full bg-secondary overflow-hidden">
                                                    <div
                                                        className={`h-full ${((user.tokensUsed || 0) >= (user.tokenLimit || 100000)) ? 'bg-red-500' : 'bg-[#3066bb]'}`}
                                                        style={{ width: `${Math.min(((user.tokensUsed || 0) / (user.tokenLimit || 100000)) * 100, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setNewFirstName(user.firstName || "");
                                                        setNewLastName(user.lastName || "");
                                                        setNewEmail(user.email || "");
                                                        setNewPhone(user.phone || "");
                                                        setNewPlan(user.plan as any || 'Guest');
                                                        setEditTokenLimit(user.tokenLimit || 100000);
                                                        setResetPassword("");
                                                        setShowResetModal(true);
                                                    }}
                                                    className="p-2 text-muted-foreground hover:text-[#3066bb] hover:bg-[#3066bb]/10 rounded-lg transition-colors"
                                                    title="Edit User"
                                                >
                                                    <Key size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user._id)}
                                                    className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Remove User"
                                                >
                                                    <Trash2 size={18} />
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setShowAddModal(false)}
                            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-[#3066bb]" /> New User
                        </h3>

                        <div className="space-y-4">
                            {/* Row: First & Last Name */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">First Name</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 bg-secondary/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-[#3066bb]/20 focus:border-[#3066bb]"
                                        placeholder="Jane"
                                        value={newFirstName}
                                        onChange={e => setNewFirstName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Last Name</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 bg-secondary/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-[#3066bb]/20 focus:border-[#3066bb]"
                                        placeholder="Doe"
                                        value={newLastName}
                                        onChange={e => setNewLastName(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Email Address</label>
                                <input
                                    type="email"
                                    className="w-full p-3 bg-secondary/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-[#3066bb]/20 focus:border-[#3066bb]"
                                    placeholder="user@example.com"
                                    value={newEmail}
                                    onChange={e => setNewEmail(e.target.value)}
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Phone Number</label>
                                <input
                                    type="tel"
                                    className="w-full p-3 bg-secondary/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-[#3066bb]/20 focus:border-[#3066bb]"
                                    placeholder="+1 234 567 8900"
                                    value={newPhone}
                                    onChange={e => setNewPhone(e.target.value)}
                                />
                            </div>

                            {/* Plan */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Plan Tier</label>
                                <select
                                    className="w-full p-3 bg-secondary/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-[#3066bb]/20 focus:border-[#3066bb]"
                                    value={newPlan}
                                    onChange={e => setNewPlan(e.target.value as any)}
                                >
                                    <option value="Guest">Guest</option>
                                    <option value="Pro">Pro</option>
                                    <option value="Enterprise">Enterprise</option>
                                </select>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Initial Password</label>
                                <input
                                    type="text"
                                    className="w-full p-3 bg-secondary/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-[#3066bb]/20 focus:border-[#3066bb] font-mono"
                                    placeholder="Enter secure password"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                />
                            </div>

                            {formError && (
                                <p className="text-sm text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/20">{formError}</p>
                            )}

                            <div className="pt-2 flex justify-end gap-3">
                                <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-secondary rounded-lg">
                                    Cancel
                                </button>
                                <button onClick={handleAddUser} disabled={actionLoading} className="px-6 py-2 bg-[#3066bb] hover:bg-[#255299] text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-50">
                                    {actionLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Save size={16} />}
                                    Create User
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* RESET PASSWORD MODAL */}
            {showResetModal && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-card w-full max-w-xl rounded-2xl border border-border shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 my-8">
                        <button
                            onClick={() => { setShowResetModal(false); setSelectedUser(null); }}
                            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Key className="w-5 h-5 text-orange-400" /> Edit User
                        </h3>

                        <div className="space-y-4">
                            {/* Row: First & Last Name */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">First Name</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 bg-secondary/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
                                        value={newFirstName}
                                        onChange={e => setNewFirstName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Last Name</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 bg-secondary/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
                                        value={newLastName}
                                        onChange={e => setNewLastName(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Row: Email & Phone */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Email Address</label>
                                    <input
                                        type="email"
                                        className="w-full p-3 bg-secondary/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
                                        value={newEmail}
                                        onChange={e => setNewEmail(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Phone Number</label>
                                    <input
                                        type="tel"
                                        className="w-full p-3 bg-secondary/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
                                        value={newPhone}
                                        onChange={e => setNewPhone(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Row: Plan & Token Limit */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Plan Tier</label>
                                    <select
                                        className="w-full p-3 bg-secondary/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
                                        value={newPlan}
                                        onChange={e => setNewPlan(e.target.value as any)}
                                    >
                                        <option value="Guest">Guest</option>
                                        <option value="Pro">Pro</option>
                                        <option value="Enterprise">Enterprise</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Token Limit</label>
                                    <input
                                        type="number"
                                        className="w-full p-3 bg-secondary/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 font-mono"
                                        value={editTokenLimit}
                                        onChange={e => setEditTokenLimit(Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            {/* Password Override */}
                            <div className="pt-2 border-t border-border mt-4">
                                <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Override Password (Optional)</label>
                                <input
                                    type="text"
                                    className="w-full p-3 bg-secondary/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-mono placeholder:text-muted-foreground/50"
                                    placeholder="Leave blank to keep current password"
                                    value={resetPassword}
                                    onChange={e => setResetPassword(e.target.value)}
                                />
                                <p className="text-[10px] text-muted-foreground mt-1">Only fill this if you want to force a password change for this user.</p>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    onClick={() => { setShowResetModal(false); setSelectedUser(null); }}
                                    className="px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-secondary rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleEditUser}
                                    disabled={actionLoading}
                                    className="px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
                                >
                                    {actionLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Save size={16} />}
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
