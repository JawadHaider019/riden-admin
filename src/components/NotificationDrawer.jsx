import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationDrawer({ isOpen, onClose, notifications, unreadCount, onMarkRead, onMarkAllRead }) {
    const unreadNotifications = notifications.filter(n => !n.read_at);

    return (
        <>
            {/* Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[2000]"
                        onClick={onClose}
                    />
                )}
            </AnimatePresence>

            {/* Drawer */}
            <div className={`fixed top-0 right-0 h-full w-[350px] bg-white shadow-2xl z-[2001] transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} rounded-l-[30px] overflow-hidden`}>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-[#D10000]">
                        <div className="flex items-center gap-2">
                            <i className="bi bi-bell-fill text-white"></i>
                            <h3 className="text-white font-[600] text-lg">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full font-[600] ml-1 uppercase">{unreadCount} NEW</span>
                            )}
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-white">
                            <i className="bi bi-x-lg text-lg"></i>
                        </button>
                    </div>

                    {/* Notification List */}
                    <div className="flex-1 overflow-y-auto pt-2 pb-10 riden-scrollbar overflow-x-hidden">
                        <AnimatePresence mode="popLayout" initial={false}>
                            {unreadNotifications.length === 0 ? (
                                <motion.div
                                    key="empty-state"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex flex-col items-center justify-center h-48 text-gray-400"
                                >
                                    <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                                        <i className="bi bi-bell-slash text-3xl"></i>
                                    </div>
                                    <p className="text-sm font-[600] text-gray-400">All caught up!</p>
                                    <p className="text-[11px] font-medium mt-1">No new notifications</p>
                                </motion.div>
                            ) : (
                                unreadNotifications.map((notif) => {
                                    const icon = notif.data?.icon;
                                    const iconClass = icon === 'user-plus' ? 'bi-person-plus-fill' :
                                        icon === 'user-edit' ? 'bi-person-gear' :
                                            icon?.startsWith('bi-') ? icon : `bi-${icon || 'bell-fill'}`;

                                    return (
                                        <motion.div
                                            key={notif.id}
                                            layout
                                            initial={{ opacity: 0, x: 50 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -100, height: 0, marginBottom: 0, transition: { duration: 0.3 } }}
                                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                            className="px-6 py-5 border-b border-gray-50 flex gap-4 bg-red-50/10 relative group"
                                        >
                                            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-[#D10000] text-white shadow-sm ring-4 ring-red-50/50">
                                                <i className={`bi ${iconClass} text-xl`}></i>
                                            </div>
                                            <div className="flex flex-col flex-1 min-w-0">
                                                <h4 className="text-sm font-[700] text-gray-900 leading-snug group-hover:text-[#D10000] transition-colors">{notif.data?.title || notif.data?.message || 'New Notification'}</h4>
                                                <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                                                    {notif.data?.message}
                                                </p>
                                                <div className="flex items-center justify-between mt-3">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] flex items-center gap-1.5 bg-gray-50 px-2 py-0.5 rounded-md">
                                                        <i className="bi bi-clock-history"></i>
                                                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                                                    </span>
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onMarkRead(notif.id);
                                                            }}
                                                            className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-[#D10000] hover:border-[#D10000] hover:text-white transition-all shadow-sm group/btn active:scale-90"
                                                            title="Mark as read"
                                                        >
                                                            <i className="bi bi-check2 text-base font-bold"></i>
                                                        </button>
                                                        <span className="w-2 h-2 rounded-full bg-[#D10000] animate-pulse"></span>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer */}
                    <AnimatePresence>
                        {unreadCount > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 50 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 50 }}
                                className="p-5 border-t flex justify-center border-gray-100 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.02)]"
                            >
                                <button
                                    onClick={onMarkAllRead}
                                    className="w-full py-3.5 px-6 rounded-2xl bg-[#D10000] hover:bg-[#b00000] text-white font-[700] text-[11px] uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <i className="bi bi-check-all text-lg"></i>
                                    Mark all as read
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </>
    );
}
