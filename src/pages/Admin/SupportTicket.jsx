import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import AdminLayout from '@/layouts/AdminLayout';
import { Table, Badge, SearchBar, Pagination, DateRangePicker, DatePickerStyles, Tabs, ImageModal, useToast, Button } from '@/components/UI';

export default function SupportTicket() {
    const { showToast } = useToast();
    const location = useLocation();
    const navigate = useNavigate();
    const isReportPath = location.pathname === '/support/report';

    const [view, setView] = useState('list'); // 'list', 'detail', 'report'
    const [tab, setTab] = useState('driver');
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [isReplying, setIsReplying] = useState(false);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [issueTitle, setIssueTitle] = useState('');
    const [replyText, setReplyText] = useState('');

    // Image Upload State
    const [images, setImages] = useState([]);
    const fileInputRef = useRef(null);

    // Preview State
    const [previewImage, setPreviewImage] = useState(null);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);

    const openImagePreview = (url) => {
        setPreviewImage(url);
        setIsImageModalOpen(true);
    };

    const complaints = {
        driver: [
            { date: '22 March 2025 9:00pm', id: '#34526', booking: '#34567', name: 'Jacob Jones', type: 'Payment Issue', status: 'Pending', avatar: 'https://i.pravatar.cc/100?img=12' },
            { date: '22 March 2025 9:00pm', id: '#34568', booking: '#34568', name: 'Ralph Edwards', type: 'App Crash', status: 'Pending', avatar: 'https://i.pravatar.cc/100?img=11' },
            { date: '22 March 2025 9:00pm', id: '#34569', booking: '#34569', name: 'Dianne Russell', type: 'Customer Behavior', status: 'Resolved', avatar: 'https://i.pravatar.cc/100?img=13' },
        ],
        passenger: [
            { date: '22 March 2025 9:00pm', id: '#44567', booking: '#44567', name: 'Theresa Webb', type: 'Dirty Car', status: 'Pending', avatar: 'https://i.pravatar.cc/100?img=14' },
            { date: '22 March 2025 9:00pm', id: '#44568', booking: '#44568', name: 'John Doe', type: 'Overcharging', status: 'Resolved', avatar: 'https://i.pravatar.cc/100?img=15' },
        ]
    };

    useEffect(() => {
        if (isReportPath) {
            setView('report');
            setIsReplying(true);
        } else {
            setView('list');
            setIsReplying(false);
        }
    }, [isReportPath]);

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        const newImages = files.map(file => URL.createObjectURL(file));
        setImages(prev => [...prev, ...newImages]);
    };

    const removeImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const currentComplaints = complaints[tab];

    const openTicket = (ticket) => {
        setSelectedTicket(ticket);
        setView('detail');
    };

    return (
        <AdminLayout title={"Support Tickets"}>
            <DatePickerStyles />
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                accept="image/*"
                onChange={handleImageChange}
            />

            {view === 'list' ? (
                <>
                    <div className="flex flex-col lg:flex-row justify-between items-center lg:items-center gap-4 mb-4 pr-1">

                        <SearchBar
                            placeholder="Search tickets..."
                            className="w-full lg:w-[350px]"
                        />
                        <DateRangePicker
                            startDate={startDate}
                            endDate={endDate}
                            onStartDateChange={setStartDate}
                            onEndDateChange={setEndDate}
                        />
                        <Link to="/support/report">
                            <Button className="px-8 py-3 rounded-full font-black uppercase tracking-widest shadow-xl shadow-red-100">
                                <i className="bi bi-plus-lg mr-2"></i> Report Issue
                            </Button>
                        </Link>

                    </div>

                    <Tabs
                        activeTab={tab}
                        onTabChange={setTab}
                        options={[
                            { id: 'driver', label: 'Driver Complaints' },
                            { id: 'passenger', label: 'Passenger Complaints', count: 14 }
                        ]}
                    />

                    <Table headers={['Date & Time', 'Ticket ID', 'Booking ID', `${tab === 'driver' ? 'Driver' : 'Passenger'} Name`, 'Type', 'Status']} headerBg="bg-[#FFF1F2]" headerAlign="text-center">
                        {currentComplaints.map((c, i) => (
                            <tr key={i} className="group hover:bg-black/[0.03] transition-colors cursor-pointer border-b border-[#F3F4F6]" onClick={() => openTicket(c)}>
                                <td className="py-[18px] px-[30px] text-[14px] font-[600] text-[#4B5563] text-center">{c.date}</td>
                                <td className="py-[18px] px-[30px] text-[14px] font-[800] text-[#D10000] text-center">{c.id}</td>
                                <td className="py-[18px] px-[30px] text-[14px] font-[600] text-[#4B5563] font-mono text-center">{c.booking}</td>
                                <td className="py-[18px] px-[30px] text-[14px] font-[800] text-[#111] text-center">{c.name}</td>
                                <td className="py-[18px] px-[30px] text-[14px] font-[600] text-[#4B5563] text-center">{c.type}</td>
                                <td className="py-[18px] px-[30px] text-center">
                                    <Badge variant={c.status === 'Resolved' ? 'active' : 'danger'}>{c.status}</Badge>
                                </td>
                            </tr>
                        ))}
                    </Table>

                    <Pagination totalItems={currentComplaints.length} />
                </>
            ) : (
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => isReportPath ? navigate('/support') : setView('list')}
                                className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                <i className="bi bi-chevron-left text-sm"></i>
                            </button>
                            <h2 className="text-2xl font-[600] text-gray-900 tracking-tight">
                                {isReportPath ? 'Report An Issue' : (selectedTicket?.type || 'Complaint Type')}
                            </h2>
                        </div>
                    </div>

                    {!isReportPath && (
                        <div className="flex items-center justify-between mb-8">
                            <div className="px-5 py-2 border-2 border-gray-200 rounded-xl text-[14px] font-[800] text-[#111]">
                                Ticket ID {selectedTicket?.id}
                            </div>
                            <button className="px-6 py-2.5 bg-[#D10000] text-white text-[13px] font-[700] rounded-xl hover:bg-black transition-all shadow-lg shadow-red-100">
                                Mark as Resolved
                            </button>
                        </div>
                    )}

                    {view === 'detail' && (
                        <div className="bg-white border border-[#E5E7EB] rounded-[30px] overflow-hidden mb-6 shadow-sm">
                            <div className="bg-[#D10000] px-6 py-4 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full border-2 border-white/50 overflow-hidden">
                                        <img src={selectedTicket?.avatar} className="w-full h-full object-cover" />
                                    </div>
                                    <span className="text-white font-[700] text-[15px]">{selectedTicket?.name}</span>
                                </div>
                                <span className="text-white/80 text-[13px] font-[500]">{selectedTicket?.date}</span>
                            </div>
                            <div className="p-8">
                                <p className="text-[#4B5563] text-[15px] leading-relaxed mb-6 font-[500]">
                                    Lorem ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s...
                                </p>
                                <div className="flex gap-4">
                                    <div
                                        className="w-[180px] h-[120px] rounded-2xl overflow-hidden border border-gray-100 shadow-sm cursor-pointer hover:scale-[1.02] transition-transform"
                                        onClick={() => openImagePreview("https://picsum.photos/400/300?random=1")}
                                    >
                                        <img src="https://picsum.photos/400/300?random=1" className="w-full h-full object-cover" />
                                    </div>
                                    <div
                                        className="w-[180px] h-[120px] rounded-2xl overflow-hidden border border-gray-100 shadow-sm cursor-pointer hover:scale-[1.02] transition-transform"
                                        onClick={() => openImagePreview("https://picsum.photos/400/300?random=2")}
                                    >
                                        <img src="https://picsum.photos/400/300?random=2" className="w-full h-full object-cover" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {(!isReplying && view === 'detail') ? (
                        <div className="flex justify-end mb-4">
                            <button
                                onClick={() => setIsReplying(true)}
                                className="px-12 py-4 bg-[#D10000] text-white text-[16px] font-[800] rounded-2xl hover:bg-black transition-all shadow-xl shadow-red-100"
                            >
                                Reply
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white border border-[#E5E7EB] rounded-[30px] overflow-hidden mb-10 shadow-sm animate-fade-in">
                            <div className="bg-[#D10000] px-6 py-4 flex items-center gap-3">
                                {isReportPath ? (
                                    <i className="bi bi-exclamation-triangle-fill text-white text-xl"></i>
                                ) : (
                                    <i className="bi bi-reply-fill text-white text-xl"></i>
                                )}
                                <span className="text-white font-[700] text-[15px]">
                                    {isReportPath ? 'Write Issue' : `Reply to ${selectedTicket?.name}`}
                                </span>
                            </div>
                            <div className="p-8">
                                {isReportPath && (
                                    <div className="mb-6">
                                        <label className="block text-sm font-[700] text-gray-700 mb-2 uppercase tracking-wide">Issue Title</label>
                                        <input
                                            type="text"
                                            value={issueTitle}
                                            onChange={(e) => setIssueTitle(e.target.value)}
                                            placeholder="Enter issue title..."
                                            className="w-full px-5 py-4 border border-gray-200 rounded-2xl text-[15px] font-[500] focus:border-[#D10000] outline-none transition-all"
                                        />
                                    </div>
                                )}
                                <label className="block text-sm font-[700] text-gray-700 mb-2 uppercase tracking-wide">
                                    {isReportPath ? 'Description' : 'Message'}
                                </label>
                                <textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Write your message here..."
                                    className="w-full min-h-[150px] text-[15px] text-[#4B5563] outline-none resize-none mb-4 font-[500]"
                                ></textarea>

                                {/* Image Previews */}
                                {images.length > 0 && (
                                    <div className="flex flex-wrap gap-4 mb-6">
                                        {images.map((img, idx) => (
                                            <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 cursor-pointer group" onClick={() => openImagePreview(img)}>
                                                <img src={img} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <i className="bi bi-eye text-white text-xl"></i>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeImage(idx);
                                                    }}
                                                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs shadow-lg z-10"
                                                >
                                                    <i className="bi bi-x"></i>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}


                            </div>
                            <div className=' flex justify-between items-center px-4'>
                                <div className="flex items-center gap-6 ">
                                    <button className="text-gray-400 hover:text-[#D10000] transition-colors"><i className="bi bi-type-bold text-xl"></i></button>
                                    <button className="text-gray-400 hover:text-[#D10000] transition-colors"><i className="bi bi-type-italic text-xl"></i></button>
                                    <button className="text-gray-400 hover:text-[#D10000] transition-colors"><i className="bi bi-list-ul text-xl"></i></button>
                                    <button className="text-gray-400 hover:text-[#D10000] transition-colors"><i className="bi bi-list-ol text-xl"></i></button>
                                    <button className="text-gray-400 hover:text-[#D10000] transition-colors" onClick={() => fileInputRef.current.click()}><i className="bi bi-paperclip text-xl"></i></button>
                                    <button className="text-gray-400 hover:text-[#D10000] transition-colors"><i className="bi bi-link-45deg text-xl"></i></button>
                                </div>

                                <div className="flex justify-end gap-3 p-8 bg-gray-50/50">
                                    {!isReportPath && (
                                        <button
                                            onClick={() => {
                                                setIsReplying(false);
                                                setReplyText('');
                                                showToast("Action cancelled", "info");
                                            }}
                                            className="px-10 py-3 border-2 border-black rounded-3xl text-[14px] font-[600] text-black hover:bg-gray-100 transition-all"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            showToast(isReportPath ? "Issue submitted successfully" : "Reply sent to user", "success");
                                            setIsReplying(false);
                                            setImages([]);
                                            setReplyText('');
                                            setIssueTitle('');
                                        }}
                                        className="px-10 py-3 bg-[#D10000] text-white text-[14px] font-[600] rounded-3xl hover:bg-[#D10000]/90 transition-all shadow-lg shadow-red-100 uppercase"
                                    >
                                        {isReportPath ? 'Submit Issue' : 'Send'}
                                    </button>
                                </div>
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
