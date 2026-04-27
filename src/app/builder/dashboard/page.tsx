"use client";

import React, { useState } from 'react';
import AdminSidebar from '../../../components/admin/AdminSidebar';
import AdminNavbar from '../../../components/admin/AdminNavbar';
import ProblemConsole from '../../../components/admin/ProblemConsole';
import HardwareManager from '../../../components/admin/HardwareManager';
import ExperimentManager from '../../../components/admin/ExperimentManager';
import { useAuth } from '@/context/AuthContext';
import PasswordModal from '../../../components/admin/PasswordModal';

export default function BuilderDashboard() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('forms'); // Default to Problem Console
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    // Safety check: Ensure only builders can access this URL
    if (user && user.role !== 'builder' && user.role !== 'admin') {
        return (
            <div className="h-screen flex items-center justify-center bg-white text-[#0F172A]">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl font-bold">Access Denied</h1>
                    <p className="text-sm">This workspace is reserved for Quantum Builders.</p>
                    <button onClick={() => window.location.href = '/'} className="text-[rgb(27,176,206)] hover:underline">Return Home</button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full font-sans overflow-hidden bg-white text-slate-900">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] bg-black"
                    style={{ backgroundSize: '40px 40px', backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)' }}
                />
            </div>

            <AdminSidebar 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                isMobileMenuOpen={isMobileMenuOpen} 
                setIsMobileMenuOpen={setIsMobileMenuOpen} 
                role="builder"
            />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
                <AdminNavbar 
                    setIsMobileMenuOpen={setIsMobileMenuOpen} 
                    setShowPasswordModal={setShowPasswordModal} 
                />

                <div className="flex-1 overflow-auto p-4 md:p-8 bg-transparent">
                    {/* Only technical tabs are rendered here */}
                    {activeTab === 'forms' && <ProblemConsole />}
                    {activeTab === 'hardware' && <HardwareManager />}
                    {activeTab === 'experiments' && <ExperimentManager />}
                    
                    {/* Fallback if somehow an invalid tab is selected */}
                    {!['forms', 'hardware', 'experiments'].includes(activeTab) && (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <h3 className="text-xl font-semibold text-slate-900">Restricted Access</h3>
                            <p className="text-sm">This module is only available in the Admin Control Panel.</p>
                        </div>
                    )}
                </div>
            </div>

            {showPasswordModal && <PasswordModal setShowPasswordModal={setShowPasswordModal} />}
        </div>
    );
}
