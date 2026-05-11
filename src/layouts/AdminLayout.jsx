import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import NotificationDrawer from '@/components/NotificationDrawer';
import { PageContainer } from '@/components/UI';
import { getNotifications, markAllAsRead, markNotificationAsRead } from '@/api/notificationApi';

export default function AdminLayout({ children, title }) {
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    // Restore collapsed state from localStorage on init
    const [isCollapsed, setIsCollapsed] = useState(() => {
        try {
            return localStorage.getItem('riden_sidebar_collapsed') === '1';
        } catch (e) {
            return false;
        }
    });

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const prevUnreadCountRef = React.useRef(0);

    // Generate a pleasant notification chime using Web Audio API (no file needed)
    const playNotificationSound = () => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();

            const playTone = (freq, startTime, duration, gainVal) => {
                const oscillator = ctx.createOscillator();
                const gainNode = ctx.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(ctx.destination);
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(freq, startTime);
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(gainVal, startTime + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
                oscillator.start(startTime);
                oscillator.stop(startTime + duration);
            };

            // Two-tone chime: E5 then G5
            const now = ctx.currentTime;
            playTone(659.25, now, 0.3, 0.3);
            playTone(783.99, now + 0.18, 0.4, 0.25);
        } catch (e) {
            // Silently fail if audio not supported
        }
    };

    const fetchNotifications = async () => {
        try {
            const res = await getNotifications();
            let list = [];
            if (Array.isArray(res)) {
                list = res;
            } else if (res?.data?.notifications && Array.isArray(res.data.notifications)) {
                list = res.data.notifications;
            } else if (res?.data && Array.isArray(res.data)) {
                list = res.data;
            } else if (res?.data?.data && Array.isArray(res.data.data)) {
                list = res.data.data;
            } else if (typeof res === 'object' && res !== null) {
                // Fallback for simple object wrappers
                list = res.data || [];
                if (!Array.isArray(list)) list = [];
            }

            setNotifications(list);
            const newCount = list.filter(n => !n.read_at).length;

            // Play sound only if new notifications arrived after the initial load
            if (prevUnreadCountRef.current > 0 && newCount > prevUnreadCountRef.current) {
                playNotificationSound();
            }

            prevUnreadCountRef.current = newCount;
            setUnreadCount(newCount);
        } catch (error) {
            console.error("Error fetching notifications:", error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleMarkAllRead = async () => {
        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
        setUnreadCount(0);

        try {
            await markAllAsRead();
        } catch (error) {
            console.error("Error marking all as read:", error);
            fetchNotifications(); // Sync back on error
        }
    };

    const handleMarkRead = async (id) => {
        // Optimistic update: instantly mark as read in local state
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));

        try {
            await markNotificationAsRead(id);
        } catch (error) {
            console.error("Error marking notification as read:", error);
            fetchNotifications(); // Sync back on error
        }
    };

    // Persist state to localStorage whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem('riden_sidebar_collapsed', isCollapsed ? '1' : '0');
        } catch (e) {
            // ignore
        }
    }, [isCollapsed]);

    return (
        <div className="min-h-screen bg-[#FDFDFD] font-sans">
            <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
            <div className={`transition-all duration-300 ${isCollapsed ? 'ml-[60px]' : 'ml-[260px]'}`}>
                <Header
                    title={title}
                    isCollapsed={isCollapsed}
                    unreadCount={unreadCount}
                    onNotificationClick={() => setIsNotificationOpen(true)}
                />
                <main className="pt-[72px]">
                    <div className="py-8 px-[30px]">
                        <PageContainer>
                            {children}
                        </PageContainer>
                    </div>
                </main>
            </div>
            <NotificationDrawer
                isOpen={isNotificationOpen}
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkAllRead={handleMarkAllRead}
                onMarkRead={handleMarkRead}
                onClose={() => setIsNotificationOpen(false)}
            />
        </div>
    );
}
