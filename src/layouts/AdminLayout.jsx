import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import NotificationDrawer from '@/components/NotificationDrawer';
import { PageContainer } from '@/components/UI';

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
                onClose={() => setIsNotificationOpen(false)}
            />
        </div>
    );
}
