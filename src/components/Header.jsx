import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAdminProfile } from '../api/auth';
import api, { getImageUrl } from '../api/api';
import { Avatar } from './UI';

export default function Header({ title, isCollapsed, onNotificationClick, unreadCount }) {
    // 💡 Initialize from storage to prevent "flicker" on reload/navigation
    const [admin, setAdmin] = useState(() => {
        try {
            const saved = localStorage.getItem('admin');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await getAdminProfile();
                const userData = res.data?.data || res.data;
                setAdmin(userData);
                // Persist for next mount
                localStorage.setItem('admin', JSON.stringify(userData));
            } catch (err) {
                // ignore
            }
        };
        fetchProfile();
    }, []);

    const name = admin?.name || 'Admin';
    const truncatedName = name.split(' ').slice(0, 2).join(' ');

    return (
        <div className={`fixed top-0 ${isCollapsed ? 'left-[60px]' : 'left-[260px]'} right-0 h-[72px] bg-white border-bottom border-gray-100 z-[1040] shadow-sm transition-all duration-300`}>

            <div className="absolute top-[-10px] left-0 w-full h-full bg-[#D10000] clip-path-header "></div>

            <div className="h-full flex items-center justify-between px-8 relative">
                <div className="flex items-center gap-3">
                    <div className="text-[20px] lg:text-[24px] font-[600] text-gray-900 leading-none tracking-tighter uppercase italic">
                        {title || 'Dashboard'}
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Notification Button */}
                    <button
                        onClick={onNotificationClick}
                        type="button"
                        className="relative w-[44px] h-[44px] rounded-xl flex items-center justify-center text-[#D10000] text-xl hover:bg-red-50 transition-all group active:scale-90"
                        aria-label="Notifications"
                    >
                        <i className="bi bi-bell transition-transform group-hover:rotate-12"></i>
                        {unreadCount > 0 && (
                            <span className="absolute top-2 right-2 min-w-[16px] h-4 px-1 bg-[#D10000] border-2 border-white rounded-full flex items-center justify-center text-[8px] font-[700] text-white shadow-sm animate-pulse">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* User Profile */}
                    <Link to="/profile" className="flex items-center gap-3 group px-2 py-1.5 rounded-2xl hover:bg-gray-50 transition-all">
                        <div className="hidden md:flex flex-col text-right">
                            <span className="text-xs font-[600] text-gray-900 tracking-tighter uppercase mb-0.5">{truncatedName}</span>
                            <span className="text-[10px] font-[600] text-[#D10000] uppercase tracking-widest">{admin?.is_super ? 'Super Admin' : 'Admin'}</span>
                        </div>
                        <div className="relative">
                            <Avatar
                                src={admin?.avatar ? getImageUrl(admin.avatar) : null}
                                fullName={name}
                                size="w-[40px] h-[40px]"
                                className="border-2 border-white shadow-md group-hover:border-[#D10000] transition-all"
                            />
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
                        </div>
                    </Link>
                </div>
            </div >
        </div >
    );
}
