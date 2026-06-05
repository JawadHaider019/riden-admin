import React, { useState, useRef, useEffect } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import AdminLayout from '@/layouts/AdminLayout';
import { Badge, ImageModal, useToast } from '@/components/UI';
import { getSupportTickets, updateSupportTicketStatus, replyToSupportTicket } from '@/api/supportApi';
import { format } from 'date-fns';

export default function SupportDetail() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [selectedTicket, setSelectedTicket] = useState(null);
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const fileInputRef = useRef(null);

    // Preview State
    const [previewImage, setPreviewImage] = useState(null);
    const [previewType, setPreviewType] = useState('image');
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);

    const openImagePreview = (url, type = 'image') => {
        setPreviewImage(url);
        setPreviewType(type);
        setIsImageModalOpen(true);
    };

    // Dummy conversation history injected for demonstration
    const injectDummyHistory = (ticket) => {
        const dummyHistory = [
            {
                id: 1,
                message: "Hello, I'm having trouble finding the pick-up point for my recent booking.",
                created_at: new Date(new Date(ticket.created_at).getTime() + 1000 * 60 * 5).toISOString(),
                admin_id: null
            },
            {
                id: 2,
                message: "We're sorry to hear that. Have you tried checking the map in the app? The driver is currently at the designated spot.",
                created_at: new Date(new Date(ticket.created_at).getTime() + 1000 * 60 * 15).toISOString(),
                admin_id: 1
            },
            {
                id: 3,
                message: "Yes, I see the map but it's a bit confusing in this area. Could you ask the driver to move to the main gate?",
                created_at: new Date(new Date(ticket.created_at).getTime() + 1000 * 60 * 20).toISOString(),
                admin_id: null
            }
        ];
        return {
            ...ticket,
            replies: ticket.replies && ticket.replies.length > 0 ? ticket.replies : dummyHistory
        };
    };

    // Fetch ticket if not passed via router state
    useEffect(() => {
        const ticketFromState = location.state?.ticket;
        if (ticketFromState) {
            // Ticket passed from list page — inject dummy history and show immediately
            setSelectedTicket(injectDummyHistory(ticketFromState));
            setLoading(false);
        } else {
            // Fallback: try to load from API by id
            setLoading(true);
            getSupportTickets({ page: 1 })
                .then(res => {
                    const all = res?.data?.data || [];
                    const found = all.find(t => String(t.id) === String(id));
                    if (found) setSelectedTicket(injectDummyHistory(found));
                    else showToast("Ticket not found", "error");
                })
                .catch(() => showToast("Failed to load ticket", "error"))
                .finally(() => setLoading(false));
        }
    }, [id]);

    const handleStatusUpdate = async (status) => {
        try {
            const response = await updateSupportTicketStatus(selectedTicket.id, status);
            if (response.status === 'success') {
                showToast(`Status updated to ${status}`, "success");
                setSelectedTicket(prev => ({ ...prev, status }));
            }
        } catch (error) {
            showToast("Failed to update status", "error");
        }
    };

    const handleReply = async () => {
        if (!replyText.trim() && selectedFiles.length === 0) return;
        setIsReplying(true);
        setTimeout(() => {
            const newReply = {
                id: Date.now(),
                message: replyText,
                created_at: new Date().toISOString(),
                admin_id: 1,
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

    const getUserName = (ticket) => {
        if (!ticket) return 'N/A';
        const user = ticket.user_type === 'driver' ? ticket.driver : ticket.passenger;
        return user ? `${user.first_name} ${user.last_name || ''}` : 'N/A';
    };

    const getUserAvatar = (ticket) => {
        if (!ticket) return '';
        const user = ticket.user_type === 'driver' ? ticket.driver : ticket.passenger;
        return user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(getUserName(ticket))}&background=random&color=fff`;
    };

    if (loading) {
        return (
            <AdminLayout title="Support Detail">
                <div className="flex items-center justify-center h-[400px]">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#D10000]"></div>
                </div>
            </AdminLayout>
        );
    }

    if (!selectedTicket) {
        return (
            <AdminLayout title="Support Ticket Management">
                <div className="flex flex-col items-center justify-center h-[400px] text-center">
                    <i className="bi bi-ticket-x text-5xl text-gray-200 mb-4"></i>
                    <p className="text-gray-500 font-medium">Ticket not found</p>
                    <button onClick={() => navigate('/support')} className="mt-4 px-6 py-2 bg-[#D10000] text-white rounded-full text-sm font-[600]">
                        Back to Support
                    </button>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="Support Ticket Management">
            <div className="max-w-6xl mx-auto animate-fade-in pb-12">

                {/* Header / Breadcrumbs */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <button
                                onClick={() => navigate('/support')}
                                className="w-10 h-10 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center text-gray-600 hover:text-[#D10000] hover:scale-105 transition-all"
                            >
                                <i className="bi bi-chevron-left text-sm"></i>
                            </button>
                            <div className="flex items-center gap-2 text-xl font-[600] text-gray-900">
                                <span>Support Ticket Detail</span>

                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <h2 className="text-md font-[600] text-gray-900 tracking-tight">
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
                                className={`group flex items-center bg-[#D10000] text-white px-4 py-2 rounded-full cursor-pointer transition-all duration-300 shadow-xl shadow-red-100 hover:bg-[#D10000]/80 ${isStatusOpen ? 'ring-4 ring-red-100' : ''}`}
                            >
                                <span className="text-[12px] font-[600] uppercase tracking-[1.5px] mr-2">
                                    {selectedTicket?.status === 'in-progress' ? 'In Progress' : selectedTicket?.status}
                                </span>
                                <i className={`bi bi-chevron-down text-[12px] transition-transform duration-300 ${isStatusOpen ? 'rotate-180' : 'rotate-0'}`}></i>
                            </div>

                            {isStatusOpen && (
                                <>
                                    <div className="fixed inset-0 z-[100]" onClick={() => setIsStatusOpen(false)}></div>
                                    <div className="absolute top-full right-0 mt-2 w-36 bg-white border border-gray-100 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-[101] overflow-hidden py-2 animate-slide-up origin-top-right">
                                        {[
                                            { value: 'open', label: 'Open' },
                                            { value: 'pending', label: 'Pending' },
                                            { value: 'in-progress', label: 'In Progress' },
                                            { value: 'closed', label: 'Closed' }
                                        ].map((status) => (
                                            <div
                                                key={status.value}
                                                onClick={() => {
                                                    handleStatusUpdate(status.value);
                                                    setIsStatusOpen(false);
                                                }}
                                                className={`px-4 py-2 text-[14px] font-[600] cursor-pointer transition-all duration-200 flex items-center justify-between group/item ${selectedTicket?.status === status.value
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

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                    {/* Left Column: Complaint & Content */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* Main Complaint Card */}
                        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
                            <div className="p-4 ">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-12 h-12 rounded-xl bg-[#FFF1F2] flex items-center justify-center text-[#D10000]">
                                        <i className="bi bi-chat-quote-fill text-xl"></i>
                                    </div>
                                    <div>
                                        <p className="text-sm font-[600] text-gray-400 uppercase tracking-widest">Subject</p>
                                        <h3 className="text-md font-[600] text-[#111]">{selectedTicket?.subject || selectedTicket?.complaint_type}</h3>
                                    </div>
                                </div>

                                <div className="relative pl-6 border-l-4 border-[#D10000]/10 py-2">
                                    <p className="text-[#374151] text-[14px] leading-[1.8] font-[500] whitespace-pre-wrap">
                                        {selectedTicket?.description}
                                    </p>
                                </div>

                                {selectedTicket?.images && selectedTicket.images.length > 0 && (
                                    <div className="mt-4">
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
                            <div className="bg-[#F9FAFB] px-8 py-4 border-t border-gray-100 flex justify-between items-center text-sm font-[600] text-gray-500">
                                <div className="flex items-center gap-2">
                                    <i className="bi bi-clock-history"></i>
                                    Submitted {format(new Date(selectedTicket?.created_at), 'MMM dd, yyyy \u2022 hh:mm a')}
                                </div>
                            </div>
                        </div>

                        {/* Replies / History */}
                        {selectedTicket?.replies?.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 px-2">
                                    <div className="h-[1px] flex-1 bg-gray-100"></div>
                                    <span className="text-[10px] font-[600] text-gray-400 uppercase tracking-widest px-2 py-1 bg-gray-50 rounded-full border border-gray-100">
                                        Conversation History
                                    </span>
                                    <div className="h-[1px] flex-1 bg-gray-100"></div>
                                </div>

                                {selectedTicket.replies.map((reply, idx) => (
                                    <div key={idx} className={`flex gap-2 ${reply.admin_id ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className="w-10 h-10 rounded-2xl overflow-hidden shrink-0 shadow-sm border-2 border-white">
                                            <img
                                                src={reply.admin_id ? 'https://ui-avatars.com/api/?name=Admin&background=D10000/80&color=fff' : getUserAvatar(selectedTicket)}
                                                className="w-full h-full object-cover"
                                                alt="Avatar"
                                            />
                                        </div>
                                        <div className={`max-w-[75%] space-y-2 flex flex-col ${reply.admin_id ? 'items-end text-right' : 'items-start'}`}>
                                            <div className={`rounded-3xl p-4 shadow-sm ${reply.admin_id
                                                ? 'bg-[#D10000] text-white rounded-tr-none'
                                                : 'bg-white border border-gray-100 text-[#111] rounded-tl-none'
                                                }`}>
                                                <p className="text-[12px] font-[500] leading-relaxed">
                                                    {reply.message}
                                                </p>
                                                {reply.attachments && reply.attachments.length > 0 && (
                                                    <div className={`mt-2 flex flex-wrap gap-2 ${reply.admin_id ? 'justify-end' : 'justify-start'}`}>
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
                                            <div className={`flex items-center gap-2 px-2 text-[10px] font-[600] uppercase  text-gray-400 ${reply.admin_id ? 'flex-row-reverse' : 'flex-row'}`}>
                                                <span>{reply.admin_id ? 'Support Team' : getUserName(selectedTicket)}</span>
                                                <span>{format(new Date(reply.created_at), 'hh:mm a')}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Typing indicator */}
                                {selectedTicket?.status !== 'closed' && !isReplying && (
                                    <div className="flex gap-4 animate-pulse">
                                        <div className="w-10 h-10 rounded-2xl bg-gray-100 shrink-0 flex items-center justify-center text-gray-400">
                                            <i className="bi bi-person-fill"></i>
                                        </div>
                                        <div className="bg-gray-50 rounded-[20px] rounded-tl-none px-4 py-2 flex gap-1.5 items-center">
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
                            <div className="mt-2">
                                <div className="bg-white border border-gray-100 rounded-3xl shadow-xl overflow-hidden animate-slide-up">
                                    <div className="p-4 border-b border-gray-50 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-[#FFF1F2] flex items-center justify-center text-[#D10000]">
                                                <i className="bi bi-pen-fill text-lg"></i>
                                            </div>
                                            <h4 className="text-lg font-[600] text-gray-900">Compose Response</h4>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <textarea
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            placeholder="Type your message here..."
                                            className="w-full min-h-[180px] p-4 bg-[#F9FAFB] rounded-3xl border-none focus:ring-2 focus:ring-[#D10000]/10 text-[#111] font-[500] text-[14px] resize-none outline-none"
                                        />
                                        {selectedFiles.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-3 p-4 bg-gray-50 rounded-3xl border border-gray-100">
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

                                        <div className="mt-2 flex justify-between items-center">
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
                                            <button
                                                onClick={handleReply}
                                                disabled={!replyText.trim() && selectedFiles.length === 0}
                                                className="px-6 py-2 bg-[#D10000] text-white text-[12px] font-[600] rounded-full hover:bg-[#D10000]/80 transition-all shadow-lg shadow-red-100 uppercase tracking-wider disabled:opacity-50"
                                            >
                                                {isReplying ? <><i className="bi bi-hourglass-split animate-spin mr-2"></i>Sending...</> : <>Send Reply <i className="bi bi-send-fill ml-2"></i></>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Metadata Sidebar */}
                    <div className="lg:col-span-4 space-y-3">
                        {/* User Profile Card */}
                        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-4">
                            <div className="flex flex-col items-center text-center">
                                <div className="relative mb-2">
                                    <div className="w-22 h-22 rounded-3xl overflow-hidden border-2 border-[#FFF1F2] shadow-xl">
                                        <img src={getUserAvatar(selectedTicket)} className="w-full h-full object-cover" alt="User" />
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-[#D10000] flex items-center justify-center text-white border-4 border-white">
                                        <i className={`bi ${selectedTicket?.user_type === 'driver' ? 'bi-car-front-fill' : 'bi-person-fill'} text-lg`}></i>
                                    </div>
                                </div>
                                <h4 className="text-xl font-[600] text-gray-900 mb-0">{getUserName(selectedTicket)}</h4>
                                <p className="text-xs font-[600] text-gray-400 uppercase tracking-widest mb-2">{selectedTicket?.user_type} Profile</p>

                                <div className="w-full space-y-2">
                                    <div className="flex items-center justify-between p-2">
                                        <span className="text-sm font-[600] text-gray-500">Contact</span>
                                        <span className="text-sm font-[600] text-[#111]">
                                            {selectedTicket?.driver?.phone || selectedTicket?.passenger?.phone || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between p-2">
                                        <span className="text-sm font-[600] text-gray-500">Email</span>
                                        <span className="text-sm font-[600] text-[#111] truncate max-w-[160px]" title={selectedTicket?.driver?.email || selectedTicket?.passenger?.email}>
                                            {selectedTicket?.driver?.email || selectedTicket?.passenger?.email || 'N/A'}
                                        </span>
                                    </div>
                                </div>

                                <Link
                                    to={`/${selectedTicket?.user_type === 'driver' ? 'drivers' : 'passenger'}/detail/${selectedTicket?.user_type === 'driver' ? selectedTicket?.driver?.id : selectedTicket?.passenger?.id}`}
                                    className="w-full mt-3 py-3 border-2 border-gray-100 rounded-full text-[12px] font-[700] text-gray-900 hover:bg-gray-50 transition-all flex items-center justify-center gap-3"
                                >
                                    View Full Profile <i className="bi bi-arrow-right"></i>
                                </Link>
                            </div>
                        </div>

                        {/* Ticket Metadata */}
                        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-4">
                            <h4 className="text-xs font-[600] text-gray-400 uppercase tracking-widest mb-2">Ticket Metadata</h4>
                            <div className="space-y-2">
                                <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 rounded-full bg-[#12B76A] mt-2"></div>
                                    <div>
                                        <p className="text-[12px] font-[600] text-gray-900">Priority Level</p>
                                        <p className="text-[10px] font-[600] text-gray-500 uppercase tracking-tighter">Normal</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3  ">
                                    <div className="w-2 h-2 rounded-full bg-[#D10000] mt-2"></div>
                                    <div>
                                        <p className="text-[12px] font-[600] text-gray-900">Category</p>
                                        <p className="text-[10px] font-[600] text-gray-500 uppercase tracking-tighter">{selectedTicket?.complaint_type}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                                    <div>
                                        <p className="text-[12px] font-[600] text-gray-900">Ticket ID</p>
                                        <p className="text-[10px] font-[600] text-gray-500 uppercase tracking-tighter">{selectedTicket?.ticket_id}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 rounded-full bg-orange-400 mt-2"></div>
                                    <div>
                                        <p className="text-[12px] font-[600] text-gray-900">Created At</p>
                                        <p className="text-[10px] font-[600] text-gray-500 uppercase tracking-tighter">{format(new Date(), 'MMM dd, hh:mm a')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

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
