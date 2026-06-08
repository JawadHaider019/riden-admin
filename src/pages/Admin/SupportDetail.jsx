import React, { useState, useRef, useEffect } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import AdminLayout from '@/layouts/AdminLayout';
import { Badge, ImageModal, useToast } from '@/components/UI';
import { getSupportTicketById, updateSupportTicketStatus, replyToSupportTicket } from '@/api/supportApi';
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
    const chatContainerRef = useRef(null);
    const inputRef = useRef(null);

    // Preview State
    const [previewImage, setPreviewImage] = useState(null);
    const [previewType, setPreviewType] = useState('image');
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);

    const openImagePreview = (url, type = 'image') => {
        setPreviewImage(url);
        setPreviewType(type);
        setIsImageModalOpen(true);
    };

    // Fetch ticket
    useEffect(() => {
        const fetchTicket = async () => {
            try {
                setLoading(true);
                const res = await getSupportTicketById(id);
                if (res.status === 'success' || res.data) {
                    setSelectedTicket(res.data);
                } else {
                    showToast("Ticket not found", "error");
                }
            } catch (error) {
                console.error("Error fetching ticket:", error);
                showToast("Failed to load ticket details", "error");
            } finally {
                setLoading(false);
            }
        };

        fetchTicket();
    }, [id]);

    const handleStatusUpdate = async (status) => {
        try {
            console.log(`🔄 Updating ticket ${selectedTicket.id} status to: ${status}`);
            const response = await updateSupportTicketStatus(selectedTicket.id, status);
            console.log("📥 Status Update Response:", response);

            if (response.status === 'success' || response.data) {
                showToast(`Status updated to ${status}`, "success");

                // Use the status from the server response if available, otherwise fallback to local value
                const newStatus = response.data?.status || status;
                setSelectedTicket(prev => ({ ...prev, status: newStatus }));
            }
        } catch (error) {
            console.error("Status update error:", error);
            showToast("Failed to update status", "error");
        }
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const newFiles = files.map(file => ({
            raw: file,
            url: URL.createObjectURL(file),
            type: file.type.startsWith('video/') ? 'video' : 'image'
        }));

        setSelectedFiles(prev => [...prev, ...newFiles]);
        // Reset file input so same file can be selected again
        e.target.value = '';
    };

    const handleReply = async () => {
        if (!replyText.trim() && selectedFiles.length === 0) return;
        setIsReplying(true);

        try {
            const formData = new FormData();
            formData.append('message', replyText);
            formData.append('admin_id', 1); // As per user requirement

            selectedFiles.forEach((fileObj, index) => {
                formData.append('attachments[]', fileObj.raw);
            });

            // Log payload for debugging
            console.log("📤 Sending Reply Payload:");
            for (let [key, value] of formData.entries()) {
                console.log(`${key}:`, value);
            }

            const response = await replyToSupportTicket(selectedTicket.id, formData);

            if (response.status === 'success' || response.data) {
                // Try to use the reply object from the server if it exists
                const serverReply = response.data?.reply || response.data;
                const newReply = serverReply && serverReply.id ? serverReply : {
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

                // Scroll to bottom
                setTimeout(() => {
                    if (chatContainerRef.current) {
                        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                    }
                }, 100);
            }
        } catch (error) {
            console.error("Reply error:", error);
            showToast("Failed to send reply", "error");
        } finally {
            setIsReplying(false);
        }
    };

    const applyFormatting = (type) => {
        if (!inputRef.current) return;

        const start = inputRef.current.selectionStart;
        const end = inputRef.current.selectionEnd;
        const text = replyText;
        const selected = text.substring(start, end);

        let formatted = '';
        let cursorOffset = 0;

        if (type === 'bold') {
            formatted = `**${selected}**`;
            cursorOffset = 2;
        } else if (type === 'italic') {
            formatted = `_${selected}_`;
            cursorOffset = 1;
        }

        const newText = text.substring(0, start) + formatted + text.substring(end);
        setReplyText(newText);

        // Reset focus and selection
        setTimeout(() => {
            inputRef.current.focus();
            if (selected.length > 0) {
                inputRef.current.setSelectionRange(start, start + formatted.length);
            } else {
                inputRef.current.setSelectionRange(start + cursorOffset, start + cursorOffset);
            }
        }, 0);
    };

    const renderMessage = (text) => {
        if (!text) return null;

        // Simple markdown parsing for Bold and Italic
        let formatted = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/_(.*?)_/g, '<em>$1</em>')
            .replace(/\n/g, '<br />');

        return <div dangerouslySetInnerHTML={{ __html: formatted }} />;
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
            <div className="max-w-7xl mx-auto animate-fade-in h-[calc(100vh-105px)]  flex flex-col  ">

                {/* Header / Breadcrumbs */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <button
                                onClick={() => navigate('/support')}
                                className="w-10 h-10 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center text-gray-600 hover:text-[#D10000] hover:scale-105 transition-all"
                            >
                                <i className="bi bi-chevron-left text-sm"></i>
                            </button>


                            <h2 className="text-md font-[600] text-gray-900 tracking-tight">
                                {selectedTicket?.ticket_id}
                            </h2>

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
                                            { value: 'pending', label: 'Pending' },
                                            { value: 'closed', label: 'Closed' },
                                            { value: 'rejected', label: 'Rejected' },
                                            { value: 'cancelled', label: 'Cancelled' }
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

                <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2 items-start ">
                    {/* Left Column: Chat-style Interface */}
                    <div className="lg:col-span-9 h-full flex flex-col space-y-2 min-h-0">

                        {/* Main Complaint Card (Outside of chat) */}
                        <div className="bg-[#FFF1F2] border border-gray-100 rounded-3xl shadow-sm overflow-hidden p-3">
                            <div className="flex items-center justify-between ">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-[20px] bg-[#D10000] flex items-center justify-center text-white">
                                        <i className="bi bi-chat-quote-fill text-xl"></i>
                                    </div>
                                    <div>
                                        <h3 className="text-[14px] font-[600] text-gray-900 leading-tight">{selectedTicket?.subject || selectedTicket?.complaint_type}</h3>
                                        <p className="text-[12px] font-[500] text-gray-600 leading-[1.8] whitespace-pre-wrap">
                                            {selectedTicket?.description}
                                        </p>
                                    </div>
                                </div>
                            </div>



                            {selectedTicket?.images && selectedTicket.images.length > 0 && (
                                <div className="flex flex-wrap gap-3">
                                    {selectedTicket.images.map((img, idx) => {
                                        const isVideo = img.match(/\.(mp4|webm|ogg|mov|m4v)$/i);
                                        return (
                                            <div
                                                key={idx}
                                                className="relative w-16 h-10 rounded-xl overflow-hidden border border-gray-100 cursor-pointer group shadow-sm"
                                                onClick={() => openImagePreview(img, isVideo ? 'video' : 'image')}
                                            >
                                                {isVideo ? (
                                                    <div className="w-full h-full bg-[#111] flex items-center justify-center">
                                                        <i className="bi bi-play-fill text-white text-3xl"></i>
                                                    </div>
                                                ) : (
                                                    <img src={img} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                )}
                                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <i className="bi bi-zoom-in text-white text-xl"></i>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="flex-1 flex flex-col bg-white border border-gray-100 rounded-3xl shadow-lg overflow-hidden min-h-0">

                            {/* Conversation Header */}
                            <div className="p-4 border-b border-gray-50 bg-[#F9FAFB]/50 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">

                                    <div>
                                        <h3 className="text-[12px] font-[600] text-gray-900 leading-tight uppercase">Conversation History</h3>
                                    </div>
                                </div>
                                <p className="text-[10px] font-[500] text-gray-400 uppercase tracking-widest">{selectedTicket?.replies?.length || 0} Messages Logged</p>

                            </div>

                            {/* Scrollable Chat Area */}
                            <div
                                ref={chatContainerRef}
                                className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth riden-scrollbar bg-[#fdfdfd]"
                            >
                                {/* Conversation Thread */}
                                {selectedTicket?.replies?.map((reply, idx) => (
                                    <div key={idx} className={`flex gap-4 ${reply.admin_id ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className="w-10 h-10 rounded-2xl overflow-hidden shrink-0 shadow-sm border-2 border-white">
                                            <img
                                                src={reply.admin_id ? 'https://ui-avatars.com/api/?name=Admin&background=D10000/80&color=fff' : getUserAvatar(selectedTicket)}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className={`max-w-[75%] space-y-2 flex flex-col ${reply.admin_id ? 'items-end' : 'items-start'}`}>
                                            <div className={`rounded-3xl p-4 shadow-sm ${reply.admin_id
                                                ? 'bg-[#D10000] text-white rounded-tr-none'
                                                : 'bg-white border border-gray-100 text-[#111] rounded-tl-none'
                                                }`}>
                                                <div className="text-[12px] font-[500] leading-relaxed">
                                                    {renderMessage(reply.message)}
                                                </div>

                                                {reply.attachments && reply.attachments.length > 0 && (
                                                    <div className={`mt-4 flex flex-wrap gap-2 ${reply.admin_id ? 'justify-end' : 'justify-start'}`}>
                                                        {reply.attachments.map((att, aIdx) => (
                                                            <div
                                                                key={aIdx}
                                                                className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-white/20 cursor-pointer"
                                                                onClick={() => openImagePreview(att.url)}
                                                            >
                                                                <img src={att.url} className="w-full h-full object-cover" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="px-2 text-[10px] font-[700] text-gray-400 uppercase tracking-widest">
                                                {reply.admin_id ? 'Agent Response' : getUserName(selectedTicket)} • {format(new Date(reply.created_at), 'hh:mm a')}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div id="chat-bottom" />
                            </div>

                            {/* WhatsApp Style Bottom Editor */}
                            {selectedTicket?.status !== 'closed' && (
                                <div className="p-2 bg-white border-t border-gray-100 sticky bottom-0 z-10">
                                    {selectedFiles.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-2 px-2">
                                            {selectedFiles.map((file, idx) => (
                                                <div key={idx} className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-sm border-2 border-white group">
                                                    <img src={file.url} className="w-full h-full object-cover" />
                                                    <button
                                                        onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                                                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] "
                                                    >
                                                        <i className="bi bi-x"></i>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="bg-[#F9FAFB] border border-gray-200 rounded-full p-1.5 flex items-center gap-2 focus-within:border-[#D10000]/30 focus-within:ring-4 focus-within:ring-[#D10000]/5 transition-all">

                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            multiple
                                            accept="image/*,video/*"
                                            onChange={handleFileChange}
                                        />

                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleReply();
                                                }
                                            }}
                                            placeholder="Type a message..."
                                            className="flex-1 bg-transparent border-none outline-none text-[14px] font-[500] text-[#111] placeholder-gray-400 px-2 py-1"
                                        />

                                        <div className="flex items-center  ">
                                            <button
                                                onClick={() => applyFormatting('bold')}
                                                className="w-8 h-8 rounded-full hover:bg-white text-gray-400 hover:text-[#D10000] transition-colors flex items-center justify-center" title="Bold"
                                            >
                                                <i className="bi bi-type-bold text-sm"></i>
                                            </button>
                                            <button
                                                onClick={() => applyFormatting('italic')}
                                                className="w-8 h-8 rounded-full hover:bg-white text-gray-400 hover:text-[#D10000] transition-colors flex items-center justify-center" title="Italic"
                                            >
                                                <i className="bi bi-type-italic text-sm"></i>
                                            </button>
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-8 h-8 shrink-0 rounded-full hover:bg-white text-gray-400 hover:text-[#D10000] transition-colors flex items-center justify-center"
                                                title="Attach Media"
                                            >
                                                <i className="bi bi-plus-lg text-sm"></i>
                                            </button>
                                            <button
                                                onClick={handleReply}
                                                disabled={!replyText.trim() && selectedFiles.length === 0}
                                                className={`ml-2 w-9 h-9 shrink-0 rounded-full   flex items-center justify-center transition-all ${replyText.trim() || selectedFiles.length > 0
                                                    ? 'bg-[#D10000] text-white shadow-md shadow-red-100 active:scale-90'
                                                    : 'bg-white text-[#D10000]'
                                                    }`}
                                            >
                                                {isReplying ? (
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                ) : (
                                                    <i className="bi bi-send-fill text-[14px]"></i>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Metadata Sidebar */}
                    <div className="lg:col-span-3 space-y-2 pb-20 lg:pb-0 h-fit">
                        {/* User Profile Card */}
                        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm px-3  py-2 ">
                            <div className="flex flex-col items-center text-center">
                                <div className="relative mb-2">
                                    <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-[#FFF1F2] shadow-xl">
                                        <img src={getUserAvatar(selectedTicket)} className="w-full h-full object-cover" alt="User" />
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#D10000] flex items-center justify-center text-white border-1 border-white">
                                        <i className={`bi ${selectedTicket?.user_type === 'driver' ? 'bi-car-front-fill' : 'bi-person-fill'} text-lg`}></i>
                                    </div>
                                </div>
                                <h4 className="text-[16px] font-[600] text-gray-900 mb-0">{getUserName(selectedTicket)}</h4>
                                <p className="text-[10px] font-[600] text-gray-400 uppercase tracking-widest mb-2">{selectedTicket?.user_type} Profile</p>

                                <div className="w-full space-y-2">
                                    <div className="flex items-center justify-between p-2">
                                        <span className="text-[12px] font-[600] text-gray-500">Contact</span>
                                        <span className="text-[12px] font-[600] text-[#111]">
                                            {selectedTicket?.driver?.phone || selectedTicket?.passenger?.phone || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between p-2">
                                        <span className="text-[12px] font-[600] text-gray-500">Email</span>
                                        <span className="text-[12px] font-[600] text-[#111] truncate max-w-[160px]" title={selectedTicket?.driver?.email || selectedTicket?.passenger?.email}>
                                            {selectedTicket?.driver?.email || selectedTicket?.passenger?.email || 'N/A'}
                                        </span>
                                    </div>
                                </div>

                                <Link
                                    to={`/${selectedTicket?.user_type === 'driver' ? 'drivers' : 'passenger'}/detail/${selectedTicket?.user_type === 'driver' ? selectedTicket?.driver?.id : selectedTicket?.passenger?.id}`}
                                    className="w-full mt-2 py-3 border-2 border-gray-100 rounded-full text-[12px] font-[600] bg-[#D10000] text-white hover:bg-[#D10000]/90 transition-all flex items-center justify-center gap-3"
                                >
                                    View Full Profile <i className="bi bi-arrow-right"></i>
                                </Link>
                            </div>
                        </div>

                        {/* Ticket Metadata */}
                        <div className="bg-gray-50 border border-gray-100 rounded-3xl shadow-sm p-3">
                            <h4 className="text-[12px] font-[600] text-gray-400 uppercase  mb-2">Ticket Metadata</h4>
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
                .riden-scrollbar::-webkit-scrollbar { width: 6px; }
                .riden-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .riden-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
                .riden-scrollbar::-webkit-scrollbar-thumb:hover { background: #D10000/20; }
            ` }} />
        </AdminLayout >
    );
}
