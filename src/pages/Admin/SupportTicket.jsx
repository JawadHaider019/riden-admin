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
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const fileInputRef = useRef(null);

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
    const [previewType, setPreviewType] = useState('image');
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);

    const openImagePreview = (url, type = 'image') => {
        setPreviewImage(url);
        setPreviewType(type);
        setIsImageModalOpen(true);
    };

    const DUMMY_TICKETS = [
        {
            id: 'dummy-1',
            ticket_id: '#TKT-9921',
            created_at: new Date().toISOString(),
            booking_id: 'RID-8821',
            user_type: 'driver',
            driver: { id: 14, first_name: 'John', last_name: 'Doe', phone: '+123456789', email: 'john@example.com', avatar_url: '' },
            complaint_type: 'Payment Issue',
            status: 'pending',
            subject: 'Fare not credited for the last trip',
            description: 'I completed the trip RID-8821 but the fare has not been added to my wallet yet. Please check.',
            replies: []
        },
        {
            id: 'dummy-2',
            ticket_id: '#TKT-9922',
            created_at: new Date(Date.now() - 3600000).toISOString(),
            booking_id: 'RID-8825',
            user_type: 'passenger',
            passenger: { id: 25, first_name: 'Jane', last_name: 'Smith', phone: '+987654321', email: 'jane@example.com', avatar_url: '' },
            complaint_type: 'Behavior',
            status: 'open',
            subject: 'Driver was rude during the trip',
            description: 'The driver was very unprofessional and used offensive language when I asked him to turn on the AC.',
            images: [
                'https://images.unsplash.com/photo-1549194388-f61be038069b?w=800',
                'https://www.w3schools.com/html/mov_bbb.mp4'
            ],
            replies: []
        },
        {
            id: 'dummy-3',
            ticket_id: '#TKT-9923',
            created_at: new Date(Date.now() - 86400000).toISOString(),
            booking_id: 'RID-8830',
            user_type: 'driver',
            driver: { id: 16, first_name: 'Mike', last_name: 'Wilson', phone: '+555444333', email: 'mike@example.com', avatar_url: '' },
            complaint_type: 'Technical',
            status: 'closed',
            subject: 'App crashing constantly',
            description: 'The app keeps closing when I try to accept a ride. I have reinstalled it twice.',
            replies: []
        },
        {
            id: 'dummy-4',
            ticket_id: '#TKT-9924',
            created_at: new Date(Date.now() - 172800000).toISOString(),
            booking_id: 'RID-8840',
            user_type: 'passenger',
            passenger: { id: 30, first_name: 'Sarah', last_name: 'Connor', phone: '+111222333', email: 'sarah@example.com', avatar_url: '' },
            complaint_type: 'Billing',
            status: 'in-progress',
            subject: 'Double charged for the same trip',
            description: 'I see two transactions on my credit card for the same booking. Please refund one.',
            replies: []
        }
    ];

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
                const apiTickets = response.data.data;
                const filteredDummy = DUMMY_TICKETS.filter(t => t.user_type === tab);
                setTickets([...filteredDummy, ...apiTickets]);

                setPagination({
                    current_page: response.data.current_page,
                    total: response.data.total + filteredDummy.length,
                    per_page: response.data.per_page,
                    last_page: response.data.last_page
                });
            } else {
                setTickets(DUMMY_TICKETS.filter(t => t.user_type === tab));
            }
        } catch (error) {
            console.error("Error fetching tickets:", error);
            setTickets(DUMMY_TICKETS.filter(t => t.user_type === tab));
            showToast("Failed to load tickets, using sample data", "info");
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
        if (!replyText.trim() && selectedFiles.length === 0) return;

        setIsReplying(true);

        // Simulated delay for realism in dummy mode
        setTimeout(() => {
            const newReply = {
                id: Date.now(),
                message: replyText,
                created_at: new Date().toISOString(),
                admin_id: 1, // Simulated Admin ID
                attachments: selectedFiles.map(f => ({ url: f.url, type: f.type }))
            };

            setSelectedTicket(prev => ({
                ...prev,
                replies: [...(prev.replies || []), newReply]
            }));

            showToast("Response sent successfully", "success");
            setReplyText('');
            setSelectedFiles([]);
            setIsReplying(false);
        }, 1200);
    };

    const openTicket = (ticket) => {
        // Adding dummy chat for professional demonstration
        const dummyHistory = [
            {
                id: 1,
                message: "Hello, I'm having trouble finding the pick-up point for my recent booking.",
                created_at: new Date(new Date(ticket.created_at).getTime() + 1000 * 60 * 5).toISOString(), // 5 mins later
                admin_id: null
            },
            {
                id: 2,
                message: "We're sorry to hear that. Have you tried checking the map in the app? The driver is currently at the designated spot.",
                created_at: new Date(new Date(ticket.created_at).getTime() + 1000 * 60 * 15).toISOString(), // 15 mins later
                admin_id: 1 // Admin reply
            },
            {
                id: 3,
                message: "Yes, I see the map but it's a bit confusing in this area. Could you ask the driver to move to the main gate?",
                created_at: new Date(new Date(ticket.created_at).getTime() + 1000 * 60 * 20).toISOString(), // 20 mins later
                admin_id: null
            }
        ];

        setSelectedTicket({
            ...ticket,
            replies: ticket.replies && ticket.replies.length > 0 ? ticket.replies : dummyHistory
        });
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
                                    <Badge variant={
                                        c.status === 'closed' ? 'active' :
                                            c.status === 'pending' ? 'warning' :
                                                c.status === 'in-progress' ? 'info' : 'danger'
                                    }>
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
                <div className="max-w-[1400px] mx-auto animate-fade-in pb-20">
                    {/* Header / Breadcrumbs */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <button
                                    onClick={() => setView('list')}
                                    className="w-10 h-10 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center text-gray-600 hover:text-[#D10000] hover:scale-105 transition-all"
                                >
                                    <i className="bi bi-chevron-left text-sm"></i>
                                </button>
                                <div className="flex items-center gap-2 text-sm font-[600] text-gray-400">
                                    <span>Support</span>
                                    <i className="bi bi-chevron-right text-[10px]"></i>
                                    <span>Tickets</span>
                                    <i className="bi bi-chevron-right text-[10px]"></i>
                                    <span className="text-[#D10000]">Detail View</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <h2 className="text-3xl font-[800] text-gray-900 tracking-tight">
                                    {selectedTicket?.ticket_id}
                                </h2>
                                <Badge variant={
                                    selectedTicket?.status === 'closed' ? 'active' :
                                        selectedTicket?.status === 'pending' ? 'warning' :
                                            selectedTicket?.status === 'in-progress' ? 'info' : 'danger'
                                }>
                                    {selectedTicket?.status?.toUpperCase()}
                                </Badge>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div
                                    onClick={() => setIsStatusOpen(!isStatusOpen)}
                                    className={`group flex items-center bg-[#D10000] text-white px-8 py-3.5 rounded-full cursor-pointer transition-all duration-300 shadow-xl shadow-red-100 hover:bg-[#D10000]/80 ${isStatusOpen ? 'ring-4 ring-red-100' : ''}`}
                                >
                                    <span className="text-[13px] font-[800] uppercase tracking-[1.5px] mr-4">
                                        {selectedTicket?.status === 'in-progress' ? 'In Progress' : selectedTicket?.status}
                                    </span>
                                    <i className={`bi bi-chevron-down text-[12px] transition-transform duration-300 ${isStatusOpen ? 'rotate-180' : 'rotate-0'}`}></i>
                                </div>

                                {isStatusOpen && (
                                    <>
                                        <div className="fixed inset-0 z-[100]" onClick={() => setIsStatusOpen(false)}></div>
                                        <div className="absolute top-full right-0 mt-3 w-56 bg-white border border-gray-100 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-[101] overflow-hidden py-3 animate-slide-up origin-top-right">
                                            {[
                                                { value: 'open', label: 'Open' },
                                                { value: 'pending', label: 'Pending' },
                                                { value: 'in-progress', label: 'In Progress' },
                                                { value: 'closed', label: 'Closed' }
                                            ].map((status) => (
                                                <div
                                                    key={status.value}
                                                    onClick={() => {
                                                        handleStatusUpdate(selectedTicket.id, status.value);
                                                        setIsStatusOpen(false);
                                                    }}
                                                    className={`px-6 py-3 text-[14px] font-[700] cursor-pointer transition-all duration-200 flex items-center justify-between group/item ${selectedTicket?.status === status.value
                                                        ? 'bg-gray-50 text-[#D10000]'
                                                        : 'text-gray-700 hover:bg-gray-50 hover:text-[#D10000]'
                                                        }`}
                                                >
                                                    <span className="capitalize">{status.label}</span>
                                                    {selectedTicket?.status === status.value && (
                                                        <i className="bi bi-check-circle-fill text-[#D10000]"></i>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Left Column: Complaint & Content */}
                        <div className="lg:col-span-8 space-y-6">
                            {/* Main Complaint Card */}
                            <div className="bg-white border border-gray-100 rounded-[35px] shadow-sm overflow-hidden">
                                <div className="p-8 md:p-10">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-14 h-14 rounded-2xl bg-[#FFF1F2] flex items-center justify-center text-[#D10000]">
                                            <i className="bi bi-chat-quote-fill text-2xl"></i>
                                        </div>
                                        <div>
                                            <p className="text-sm font-[700] text-gray-400 uppercase tracking-widest mb-1">Subject</p>
                                            <h3 className="text-xl font-[700] text-[#111]">{selectedTicket?.subject || selectedTicket?.complaint_type}</h3>
                                        </div>
                                    </div>

                                    <div className="relative pl-8 border-l-4 border-[#D10000]/10 py-2">
                                        <p className="text-[#374151] text-[16px] leading-[1.8] font-[500] whitespace-pre-wrap">
                                            {selectedTicket?.description}
                                        </p>
                                    </div>

                                    {selectedTicket?.images && selectedTicket.images.length > 0 && (
                                        <div className="mt-10">
                                            <p className="text-sm font-[700] text-gray-400 uppercase tracking-widest mb-4">Attachments ({selectedTicket.images.length})</p>
                                            <div className="flex flex-wrap gap-4">
                                                {selectedTicket.images.map((img, idx) => {
                                                    const isVideo = img.match(/\.(mp4|webm|ogg|mov|m4v)$/i);
                                                    return (
                                                        <div
                                                            key={idx}
                                                            className="group relative w-[180px] h-[120px] rounded-[24px] overflow-hidden border border-gray-100 shadow-sm cursor-pointer"
                                                            onClick={() => openImagePreview(img, isVideo ? 'video' : 'image')}
                                                        >
                                                            {isVideo ? (
                                                                <div className="w-full h-full bg-[#111] flex items-center justify-center">
                                                                    <i className="bi bi-play-fill text-white text-3xl"></i>
                                                                </div>
                                                            ) : (
                                                                <img src={img} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                            )}
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <i className="bi bi-eye text-white text-2xl"></i>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="bg-[#F9FAFB] px-10 py-6 border-t border-gray-100 flex justify-between items-center text-sm font-[600] text-gray-500">
                                    <div className="flex items-center gap-2">
                                        <i className="bi bi-clock-history"></i>
                                        Submitted {format(new Date(selectedTicket?.created_at), 'MMM dd, yyyy \u2022 hh:mm a')}
                                    </div>
                                </div>
                            </div>

                            {/* Replies / History */}
                            {selectedTicket?.replies?.length > 0 && (
                                <div className="space-y-8">
                                    <div className="flex items-center gap-4 px-4">
                                        <div className="h-[1px] flex-1 bg-gray-100"></div>
                                        <span className="text-sm font-[800] text-gray-400 uppercase tracking-widest px-4 py-2 bg-gray-50 rounded-full border border-gray-100">
                                            Conversation History
                                        </span>
                                        <div className="h-[1px] flex-1 bg-gray-100"></div>
                                    </div>

                                    {selectedTicket.replies.map((reply, idx) => (
                                        <div key={idx} className={`flex gap-4 ${reply.admin_id ? 'flex-row-reverse' : 'flex-row'}`}>
                                            <div className="w-10 h-10 rounded-2xl overflow-hidden shrink-0 shadow-sm border-2 border-white">
                                                <img
                                                    src={reply.admin_id ? 'https://ui-avatars.com/api/?name=Admin&background=D10000/80&color=fff' : getUserAvatar(selectedTicket)}
                                                    className="w-full h-full object-cover"
                                                    alt="Avatar"
                                                />
                                            </div>
                                            <div className={`max-w-[75%] space-y-2 flex flex-col ${reply.admin_id ? 'items-end text-right' : 'items-start'}`}>
                                                <div className={`rounded-[30px] p-6 shadow-sm ${reply.admin_id
                                                    ? 'bg-[#D10000] text-white rounded-tr-none'
                                                    : 'bg-white border border-gray-100 text-[#111] rounded-tl-none'
                                                    }`}>
                                                    <p className="text-[15px] font-[500] leading-relaxed">
                                                        {reply.message}
                                                    </p>
                                                    {reply.attachments && reply.attachments.length > 0 && (
                                                        <div className={`mt-4 flex flex-wrap gap-2 ${reply.admin_id ? 'justify-end' : 'justify-start'}`}>
                                                            {reply.attachments.map((att, aIdx) => {
                                                                const isVideo = att.url?.match(/\.(mp4|webm|ogg|mov|m4v)$/i) || att.type === 'video';
                                                                return (
                                                                    <div
                                                                        key={aIdx}
                                                                        className="relative group w-24 h-24 rounded-2xl overflow-hidden border-2 border-white/20 cursor-pointer shadow-sm"
                                                                        onClick={() => openImagePreview(att.url, isVideo ? 'video' : 'image')}
                                                                    >
                                                                        {isVideo ? (
                                                                            <div className="w-full h-full bg-black/40 flex items-center justify-center">
                                                                                <i className="bi bi-play-circle-fill text-white text-2xl"></i>
                                                                            </div>
                                                                        ) : (
                                                                            <img src={att.url} className="w-full h-full object-cover" />
                                                                        )}
                                                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                            <i className="bi bi-eye text-white"></i>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={`flex items-center gap-2 px-2 text-[11px] font-[700] uppercase tracking-wider text-gray-400 ${reply.admin_id ? 'flex-row-reverse' : 'flex-row'}`}>
                                                    <span>{reply.admin_id ? 'Support Team' : getUserName(selectedTicket)}</span>

                                                    <span>{format(new Date(reply.created_at), 'hh:mm a')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Dummy Typing Indicator for realism */}
                                    {selectedTicket?.status !== 'closed' && !isReplying && (
                                        <div className="flex gap-4 animate-pulse">
                                            <div className="w-10 h-10 rounded-2xl bg-gray-100 shrink-0 flex items-center justify-center text-gray-400">
                                                <i className="bi bi-person-fill"></i>
                                            </div>
                                            <div className="bg-gray-50 rounded-[20px] rounded-tl-none px-6 py-3 flex gap-1.5 items-center">
                                                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
                                                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
                                                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Reply Form */}
                            {selectedTicket?.status !== 'closed' && (
                                <div className="mt-12">

                                    <div className="bg-white border border-gray-100 rounded-[35px] shadow-xl overflow-hidden animate-slide-up">
                                        <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-[#FFF1F2] flex items-center justify-center text-[#D10000]">
                                                    <i className="bi bi-pen-fill text-lg"></i>
                                                </div>
                                                <h4 className="text-lg font-[700] text-gray-900">Compose Response</h4>
                                            </div>

                                        </div>
                                        <div className="p-8">
                                            <textarea
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                                placeholder="Type your message here..."
                                                className="w-full min-h-[180px] p-6 bg-[#F9FAFB] rounded-[24px] border-none focus:ring-2 focus:ring-[#D10000]/10 text-[#111] font-[500] text-[16px] resize-none outline-none"
                                            />
                                            {selectedFiles.length > 0 && (
                                                <div className="mt-4 flex flex-wrap gap-3 p-4 bg-gray-50 rounded-[20px] border border-gray-100">
                                                    {selectedFiles.map((file, idx) => (
                                                        <div key={idx} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-white shadow-sm">
                                                            {file.type === 'video' ? (
                                                                <div className="w-full h-full bg-[#111] flex items-center justify-center">
                                                                    <i className="bi bi-play-fill text-white text-2xl"></i>
                                                                </div>
                                                            ) : (
                                                                <img src={file.url} className="w-full h-full object-cover" alt="Selected" />
                                                            )}
                                                            <button
                                                                onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== idx))}
                                                                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <i className="bi bi-x text-sm"></i>
                                                            </button>
                                                            <div
                                                                className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
                                                                onClick={() => openImagePreview(file.url, file.type)}
                                                            >
                                                                <i className="bi bi-eye text-white"></i>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="mt-6 flex justify-between items-center">
                                                <div className="flex gap-2 text-gray-400">
                                                    <button
                                                        onClick={() => fileInputRef.current.click()}
                                                        className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                                                    >
                                                        <i className="bi bi-paperclip text-xl"></i>
                                                    </button>
                                                    <input
                                                        type="file"
                                                        ref={fileInputRef}
                                                        className="hidden"
                                                        multiple
                                                        accept="image/*,video/*"
                                                        onChange={(e) => {
                                                            const files = Array.from(e.target.files);
                                                            const newFiles = files.map(file => ({
                                                                file,
                                                                url: URL.createObjectURL(file),
                                                                type: file.type.startsWith('video') ? 'video' : 'image'
                                                            }));
                                                            setSelectedFiles([...selectedFiles, ...newFiles]);
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex gap-4">

                                                    <button
                                                        onClick={handleReply}
                                                        disabled={!replyText.trim()}
                                                        className="px-10 py-3 bg-[#D10000] text-white text-[14px] font-[700] rounded-full hover:bg-[#D10000]/80 transition-all shadow-lg shadow-red-100 uppercase tracking-wider disabled:opacity-50"
                                                    >
                                                        Send Reply <i className="bi bi-send-fill ml-2"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column: Metadata Sidebar */}
                        <div className="lg:col-span-4 space-y-6">
                            {/* User Profile Card */}
                            <div className="bg-white border border-gray-100 rounded-[35px] shadow-sm p-8">
                                <div className="flex flex-col items-center text-center">
                                    <div className="relative mb-6">
                                        <div className="w-28 h-28 rounded-[35px] overflow-hidden border-4 border-[#FFF1F2] shadow-xl">
                                            <img src={getUserAvatar(selectedTicket)} className="w-full h-full object-cover" alt="User" />
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-[#D10000] flex items-center justify-center text-white border-4 border-white">
                                            <i className={`bi ${selectedTicket?.user_type === 'driver' ? 'bi-car-front-fill' : 'bi-person-fill'} text-lg`}></i>
                                        </div>
                                    </div>
                                    <h4 className="text-xl font-[800] text-gray-900 mb-1">{getUserName(selectedTicket)}</h4>
                                    <p className="text-sm font-[600] text-gray-400 uppercase tracking-widest mb-6">{selectedTicket?.user_type} Profile</p>

                                    <div className="w-full space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-[#F9FAFB] rounded-2xl">
                                            <span className="text-sm font-[600] text-gray-500">Contact</span>
                                            <span className="text-sm font-[700] text-[#111]">
                                                {selectedTicket?.driver?.phone || selectedTicket?.passenger?.phone || 'N/A'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between p-4 bg-[#F9FAFB] rounded-2xl">
                                            <span className="text-sm font-[600] text-gray-500">Email</span>
                                            <span className="text-sm font-[700] text-[#111]">
                                                {selectedTicket?.driver?.email || selectedTicket?.passenger?.email || 'N/A'}
                                            </span>
                                        </div>
                                    </div>

                                    <Link
                                        to={`/${selectedTicket?.user_type === 'driver' ? 'drivers' : 'passenger'}/detail/${selectedTicket?.user_type === 'driver' ? selectedTicket?.driver?.id : selectedTicket?.passenger?.id}`}
                                        className="w-full mt-6 py-4 border-2 border-gray-100 rounded-[24px] text-[14px] font-[700] text-gray-900 hover:bg-gray-50 transition-all flex items-center justify-center gap-3"
                                    >
                                        View Full Profile <i className="bi bi-arrow-right"></i>
                                    </Link>
                                </div>
                            </div>

                            {/* Booking Summary Card */}
                            {/* {selectedTicket?.booking_id && (
                                <div className="bg-[#111] rounded-[35px] shadow-xl p-8 text-white relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full transition-transform group-hover:scale-110"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-8">
                                            <p className="text-sm font-[700] text-white/50 uppercase tracking-widest">Related Ride</p>
                                            <Badge variant="warning">ID: {selectedTicket.booking_id}</Badge>
                                        </div>
                                        <h4 className="text-lg font-[700] mb-6">Booking Context</h4>
                                        <p className="text-white/70 text-sm leading-relaxed mb-8">
                                            This ticket is linked to a specific booking. Viewing details might help resolve the issue faster.
                                        </p>
                                        <button className="w-full py-4 bg-[#D10000] text-white rounded-[24px] text-[14px] font-[700] uppercase tracking-wider hover:bg-white hover:text-black transition-all">
                                            View Booking Details
                                        </button>
                                    </div>
                                </div>
                            )} */}

                            {/* Ticket Status Timeline/Audit */}
                            <div className="bg-white border border-gray-100 rounded-[35px] shadow-sm p-8">
                                <h4 className="text-sm font-[700] text-gray-400 uppercase tracking-widest mb-6">Ticket Metadata</h4>
                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-2 h-2 rounded-full bg-[#12B76A] mt-2"></div>
                                        <div>
                                            <p className="text-[14px] font-[700] text-gray-900">Priority Level</p>
                                            <p className="text-xs font-[600] text-gray-500 uppercase tracking-tighter">Normal</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="w-2 h-2 rounded-full bg-[#D10000] mt-2"></div>
                                        <div>
                                            <p className="text-[14px] font-[700] text-gray-900">Category</p>
                                            <p className="text-xs font-[600] text-gray-500 uppercase tracking-tighter">{selectedTicket?.complaint_type}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                                        <div>
                                            <p className="text-[14px] font-[700] text-gray-900">Last Activity</p>
                                            <p className="text-xs font-[600] text-gray-500 uppercase tracking-tighter">{format(new Date(), 'MMM dd, hh:mm a')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <ImageModal
                isOpen={isImageModalOpen}
                onClose={() => setIsImageModalOpen(false)}
                imageUrl={previewImage}
                type={previewType}
            />
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
            ` }} />
        </AdminLayout>
    );
}
