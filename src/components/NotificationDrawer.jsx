import React from 'react';

export default function NotificationDrawer({ isOpen, onClose }) {
    const notifications = [
        { id: 1, title: 'New Driver Request', time: '5 mins ago', icon: 'bi-person-plus-fill', color: 'bg-blue-100 text-blue-600' },
        { id: 2, title: 'New Booking Created', time: '12 mins ago', icon: 'bi-calendar-check-fill', color: 'bg-green-100 text-green-600' },
        { id: 3, title: 'Vehicle License Expiring', time: '1 hour ago', icon: 'bi-exclamation-triangle-fill', color: 'bg-amber-100 text-amber-600' },
        { id: 4, title: 'Support Ticket #124', time: '2 hours ago', icon: 'bi-ticket-detailed-fill', color: 'bg-purple-100 text-purple-600' },
        { id: 5, title: 'Payout Processed', time: 'Yesterday', icon: 'bi-cash-stack', color: 'bg-emerald-100 text-emerald-600' },
    ];

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[2000] transition-opacity duration-300"
                    onClick={onClose}
                />
            )}

            {/* Drawer */}
            <div className={`fixed top-0 right-0 h-full w-[350px] bg-white shadow-2xl z-[2001] transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} rounded-l-[30px] overflow-hidden`}>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-[#D10000]">
                        <div className="flex items-center gap-2">
                            <i className="bi bi-bell-fill text-white"></i>
                            <h3 className="text-white font-bold text-lg">Notifications</h3>
                            <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded-full font-black ml-1">5 NEW</span>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-white">
                            <i className="bi bi-x-lg text-lg"></i>
                        </button>
                    </div>

                    {/* Notification List */}
                    <div className="flex-1 overflow-y-auto py-2 riden-scrollbar">
                        {notifications.map((notif) => (
                            <div key={notif.id} className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-50 flex gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-red-100 text-red-600`}>
                                    <i className={`bi ${notif.icon} text-lg`}></i>
                                </div>
                                <div className="flex flex-col">
                                    <h4 className="text-sm font-bold text-gray-900 leading-snug">{notif.title}</h4>
                                    <span className="text-[11px] font-semibold text-gray-400 mt-1 uppercase tracking-wider italic flex items-center gap-1">
                                        <i className="bi bi-clock text-[10px]"></i>
                                        {notif.time}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t flex justify-end border-gray-100">
                        <button className="w-fit  py-2 px-4 rounded-full bg-[#D10000] hover:bg-[#D10000]/90 text-white font-bold text-xs uppercase transition-colors">
                            Mark all as read
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
