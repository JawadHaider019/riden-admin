import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import AdminLayout from '@/layouts/AdminLayout';
import { Table, Badge, SearchBar, Pagination, DateRangePicker, DatePickerStyles, Tabs, ImageModal, useToast, Button, Loader } from '@/components/UI';
import { getSupportTickets, updateSupportTicketStatus, replyToSupportTicket } from '@/api/supportApi';
import { format } from 'date-fns';

export default function SupportTicket() {
    const { showToast } = useToast();
    const location = useLocation();
    const navigate = useNavigate();
    const isReportPath = location.pathname === '/support/report';

    const [view, setView] = useState('list'); // 'list', 'detail'
    const [tab, setTab] = useState('driver');
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [isReplying, setIsReplying] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [replyText, setReplyText] = useState('');

    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        current_page: 1,
        total: 0,
        per_page: 15,
        last_page: 1
    });

    // Preview State
    const [previewImage, setPreviewImage] = useState(null);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);

    const openImagePreview = (url) => {
        setPreviewImage(url);
        setIsImageModalOpen(true);
    };

    const fetchTickets = async (page = 1) => {
        try {
            setLoading(true);
            const params = {
                page,
                user_type: tab,
                search: searchTerm,
                start_date: startDate ? format(startDate, 'yyyy-MM-dd') : null,
                end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
            };
            const response = await getSupportTickets(params);
            if (response.status === 'success') {
                setTickets(response.data.data);
                setPagination({
                    current_page: response.data.current_page,
                    total: response.data.total,
                    per_page: response.data.per_page,
                    last_page: response.data.last_page
                });
            }
        } catch (error) {
            console.error("Error fetching tickets:", error);
            showToast("Failed to load support tickets", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets(1);
    }, [tab, searchTerm, startDate, endDate]);

    const handleStatusUpdate = async (id, status) => {
        try {
            const response = await updateSupportTicketStatus(id, status);
            if (response.status === 'success') {
                showToast(`Status updated to ${status}`, "success");
                if (selectedTicket) {
                    setSelectedTicket({ ...selectedTicket, status });
                }
                fetchTickets(pagination.current_page);
            }
        } catch (error) {
            showToast("Failed to update status", "error");
        }
    };

    const handleReply = async () => {
        if (!replyText.trim()) return;
        try {
            // Get admin details for validation
            const adminStr = localStorage.getItem('admin');
            const admin = adminStr ? JSON.parse(adminStr) : null;

            const payload = {
                message: replyText,
                admin_id: admin?.id // Send the current admin's ID
            };

            const response = await replyToSupportTicket(selectedTicket.id, payload);
            if (response.status === 'success') {
                showToast("Reply sent successfully", "success");
                setReplyText('');
                setIsReplying(false);
                fetchTickets(pagination.current_page);
            }
        } catch (error) {
            showToast("Failed to send reply", "error");
        }
    };

    const openTicket = (ticket) => {
        setSelectedTicket(ticket);
        setView('detail');
    };

    const getUserName = (ticket) => {
        const user = ticket.user_type === 'driver' ? ticket.driver : ticket.passenger;
        return user ? `${user.first_name} ${user.last_name || ''}` : 'N/A';
    };

    const getUserAvatar = (ticket) => {
        const user = ticket.user_type === 'driver' ? ticket.driver : ticket.passenger;
        return user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(getUserName(ticket))}&background=random&color=fff`;
    };

    return (
        <AdminLayout title={"Support Tickets"}>
            <DatePickerStyles />

            {view === 'list' ? (
                <>
                    <div className="flex flex-col lg:flex-row justify-between items-center lg:items-center gap-4 mb-4 pr-1">
                        <SearchBar
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search tickets..."
                            className="w-full lg:w-[350px]"
                        />
                        <DateRangePicker
                            startDate={startDate}
                            endDate={endDate}
                            onStartDateChange={setStartDate}
                            onEndDateChange={setEndDate}
                        />
                        {/* Report issue is usually for user side, but keeping it as per original mock if needed */}
                        <Link to="/support/report">
                            <Button className="px-8 py-3 rounded-full font-[600] uppercase tracking-widest shadow-xl shadow-red-100">
                                <i className="bi bi-plus-lg mr-2"></i> Report Issue
                            </Button>
                        </Link>
                    </div>

                    <Tabs
                        activeTab={tab}
                        onTabChange={setTab}
                        options={[
                            { id: 'driver', label: 'Driver Complaints' },
                            { id: 'passenger', label: 'Passenger Complaints' }
                        ]}
                    />

                    <Table headers={['ID', 'Date & Time', 'Booking ID', `${tab === 'driver' ? 'Driver' : 'Passenger'} Name`, 'Type', 'Status']} headerBg="bg-[#FFF1F2]" headerAlign="text-center">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="py-20 text-center">
                                    <Loader />
                                </td>
                            </tr>
                        ) : tickets.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-20 text-center text-gray-500 font-medium">
                                    No support tickets found
                                </td>
                            </tr>
                        ) : tickets.map((c) => (
                            <tr key={c.id} className="group hover:bg-black/[0.03] transition-colors cursor-pointer border-b border-[#F3F4F6]" onClick={() => openTicket(c)}>
                                <td className="py-[18px] px-[30px] text-[14px] font-[600] text-[#111] text-center">{c.ticket_id?.replace('#', '')}</td>
                                <td className="py-[18px] px-[30px] text-[14px] font-[600] text-[#4B5563] text-center">
                                    {c.created_at ? format(new Date(c.created_at), 'dd MMM yyyy hh:mm a') : 'N/A'}
                                </td>
                                <td className="py-[18px] px-[30px] text-[14px] font-[600] text-[#4B5563] font-mono text-center">{c.booking_id || 'N/A'}</td>
                                <td className="py-[18px] px-[30px] text-[14px] font-[600] text-[#111] text-center">{getUserName(c)}</td>
                                <td className="py-[18px] px-[30px] text-[14px] font-[600] text-[#4B5563] text-center">{c.complaint_type}</td>
                                <td className="py-[18px] px-[30px] text-center">
                                    <Badge variant={c.status === 'closed' ? 'active' : 'danger'}>
                                        {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                                    </Badge>
                                </td>
                            </tr>
                        ))}
                    </Table>

                    {pagination.total > pagination.per_page && (
                        <div className="mt-6">
                            <Pagination
                                totalItems={pagination.total}
                                itemsPerPage={pagination.per_page}
                                currentPage={pagination.current_page}
                                onPageChange={fetchTickets}
                            />
                        </div>
                    )}
                </>
            ) : (
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setView('list')}
                                className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                <i className="bi bi-chevron-left text-sm"></i>
                            </button>
                            <h2 className="text-2xl font-[600] text-gray-900 tracking-tight">
                                {selectedTicket?.complaint_type}
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center justify-between mb-8">
                        <div className="px-5 py-2 border-2 border-gray-200 rounded-xl text-[14px] font-[600] text-[#111]">
                            ID {selectedTicket?.ticket_id?.replace('#', '')}
                        </div>
                        {selectedTicket?.status !== 'closed' && (
                            <button
                                onClick={() => handleStatusUpdate(selectedTicket.id, 'closed')}
                                className="px-6 py-2.5 bg-[#D10000] text-white text-[13px] font-[600] rounded-xl hover:bg-black transition-all shadow-lg shadow-red-100"
                            >
                                Mark as Closed
                            </button>
                        )}
                    </div>

                    <div className="bg-white border border-[#E5E7EB] rounded-[30px] overflow-hidden mb-6 shadow-sm">
                        <div className="bg-[#D10000] px-6 py-4 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full border-2 border-white/50 overflow-hidden bg-gray-200">
                                    <img src={selectedTicket ? getUserAvatar(selectedTicket) : ''} className="w-full h-full object-cover" alt="User" />
                                </div>
                                <span className="text-white font-[600] text-[15px]">{selectedTicket ? getUserName(selectedTicket) : 'N/A'}</span>
                            </div>
                            <span className="text-white/80 text-[13px] font-[500]">
                                {selectedTicket?.created_at ? format(new Date(selectedTicket.created_at), 'dd MMM yyyy hh:mm a') : 'N/A'}
                            </span>
                        </div>
                        <div className="p-8">
                            <h3 className="text-lg font-[700] text-[#111] mb-2">{selectedTicket?.subject}</h3>
                            <p className="text-[#4B5563] text-[15px] leading-relaxed mb-6 font-[500]">
                                {selectedTicket?.description}
                            </p>
                            {/* Assuming images might come in future or were part of requirement */}
                            {selectedTicket?.images && selectedTicket.images.length > 0 && (
                                <div className="flex gap-4">
                                    {selectedTicket.images.map((img, idx) => (
                                        <div
                                            key={idx}
                                            className="w-[180px] h-[120px] rounded-2xl overflow-hidden border border-gray-100 shadow-sm cursor-pointer hover:scale-[1.02] transition-transform"
                                            onClick={() => openImagePreview(img)}
                                        >
                                            <img src={img} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {!isReplying ? (
                        <div className="flex justify-end mb-4">
                            <button
                                onClick={() => setIsReplying(true)}
                                className="px-12 py-4 bg-[#D10000] text-white text-[16px] font-[600] rounded-2xl hover:bg-black transition-all shadow-xl shadow-red-100"
                            >
                                Reply
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white border border-[#E5E7EB] rounded-[30px] overflow-hidden mb-10 shadow-sm animate-fade-in">
                            <div className="bg-[#D10000] px-6 py-4 flex items-center gap-3">
                                <i className="bi bi-reply-fill text-white text-xl"></i>
                                <span className="text-white font-[600] text-[15px]">
                                    Reply to {getUserName(selectedTicket)}
                                </span>
                            </div>
                            <div className="p-8">
                                <label className="block text-sm font-[600] text-gray-700 mb-2 uppercase tracking-wide">
                                    Message
                                </label>
                                <textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Write your message here..."
                                    className="w-full min-h-[150px] text-[15px] text-[#4B5563] outline-none resize-none mb-4 font-[500] p-4 border border-gray-100 rounded-xl focus:border-[#D10000]"
                                ></textarea>
                            </div>
                            <div className='flex justify-end gap-3 p-8 bg-gray-50/50'>
                                <button
                                    onClick={() => {
                                        setIsReplying(false);
                                        setReplyText('');
                                    }}
                                    className="px-10 py-3 border-2 border-black rounded-3xl text-[14px] font-[600] text-black hover:bg-gray-100 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReply}
                                    disabled={!replyText.trim()}
                                    className="px-10 py-3 bg-[#D10000] text-white text-[14px] font-[600] rounded-3xl hover:bg-[#D10000]/90 transition-all shadow-lg shadow-red-100 uppercase disabled:opacity-50"
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
            <ImageModal
                isOpen={isImageModalOpen}
                onClose={() => setIsImageModalOpen(false)}
                imageUrl={previewImage}
            />
        </AdminLayout>
    );
}
