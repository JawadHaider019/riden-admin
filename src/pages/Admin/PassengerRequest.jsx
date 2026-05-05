import React, { useState } from 'react';
import { startOfWeek } from 'date-fns';
import AdminLayout from '@/layouts/AdminLayout';
import { Table, ConfirmationModal, useToast, SearchBar, DateRangePicker, DatePickerStyles, Pagination } from '@/components/UI';

export default function PassengerRequest() {
    const { showToast } = useToast();
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [exportOpen, setExportOpen] = useState(false);
    const [requests, setRequests] = useState([
        { id: 1, name: 'Eleanor Pena', date: 'Dec 20, 2025', time: '07:50pm', reason: 'Name Edit Request', status: 'pending', avatar: '21' },
        { id: 2, name: 'Kristin Watson', date: 'Dec 20, 2025', time: '07:50pm', reason: 'Phone Number Change', status: 'pending', avatar: '22' },
        { id: 3, name: 'Cameron Williamson', date: 'Dec 20, 2025', time: '07:50pm', reason: 'Email Change Request', status: 'pending', avatar: '23' },
        { id: 4, name: 'Brooklyn Simmons', date: 'Dec 20, 2025', time: '07:50pm', reason: 'Name Edit Request', status: 'pending', avatar: '24' },
        { id: 5, name: 'Leslie Alexander', date: 'Dec 20, 2025', time: '07:50pm', reason: 'Phone Number Change', status: 'pending', avatar: '25' },
        { id: 6, name: 'Jenny Wilson', date: 'Dec 20, 2025', time: '07:50pm', reason: 'Email Change Request', status: 'approved', avatar: '26' },
        { id: 7, name: 'Guy Hawkins', date: 'Dec 20, 2025', time: '07:50pm', reason: 'Name Edit Request', status: 'rejected', avatar: '27' },
        { id: 8, name: 'Marvin McKinney', date: 'Dec 20, 2025', time: '07:50pm', reason: 'Phone Number Change', status: 'approved', avatar: '28' },
        { id: 9, name: 'Arlene McCoy', date: 'Dec 20, 2025', time: '07:50pm', reason: 'Name Edit Request', status: 'approved', avatar: '29' },
        { id: 10, name: 'Courtney Henry', date: 'Dec 20, 2025', time: '07:50pm', reason: 'Email Change Request', status: 'approved', avatar: '30' }
    ]);

    const [modalConfig, setModalConfig] = useState({ isOpen: false, type: 'approve', targetData: null });

    const openModal = (type, data) => setModalConfig({ isOpen: true, type, targetData: data });
    const closeModal = () => setModalConfig({ isOpen: false, type: 'approve', targetData: null });

    const handleConfirm = () => {
        const { type, targetData } = modalConfig;

        setRequests(prev => prev.map(r => r.id === targetData.id ? { ...r, status: type === 'approve' ? 'approved' : 'rejected' } : r));

        if (type === 'approve') {
            showToast(`${targetData.name}'s request approved successfully.`, 'success');
        } else {
            showToast(`${targetData.name}'s request has been rejected.`, 'error');
        }

        closeModal();
    };

    return (
        <AdminLayout title="Passenger Requests">
            <DatePickerStyles />
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <SearchBar
                    placeholder="Search by name, request reason"
                    className="w-full lg:w-[360px]"
                />

                <div className="flex items-center gap-2 w-full lg:w-auto">
                    <DateRangePicker
                        startDate={startDate}
                        endDate={endDate}
                        onStartDateChange={setStartDate}
                        onEndDateChange={setEndDate}
                    />
                    <div className="relative">
                        <button
                            onClick={() => setExportOpen(!exportOpen)}
                            className="flex rounded-full items-center gap-2 px-6 py-3 bg-white border border-[#E5E7EB] text-[13px] font-[700] text-[#111] hover:bg-gray-50 transition-all shadow-sm"
                        >
                            <i className="bi bi-file-earmark-excel-fill text-[#12B76A] text-[16px]"></i> Export
                            <i className={`bi bi-chevron-down text-[#111] text-[12px] transition-transform ${exportOpen ? 'rotate-180' : ''}`}></i>
                        </button>
                        {exportOpen && (
                            <div className="absolute right-0 mt-2 w-[180px] bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] overflow-hidden py-2 z-[20]">
                                <button
                                    className="w-full flex items-center px-5 py-2.5 hover:bg-gray-50 text-[13px] font-[600] text-[#111] border-b border-[#F3F4F6] transition-colors"
                                    onClick={() => setExportOpen(false)}
                                >
                                    <i className="bi bi-filetype-csv mr-3 text-[#12B76A] text-[16px]"></i> CSV Format
                                </button>
                                <button
                                    className="w-full flex items-center px-5 py-2.5 hover:bg-gray-50 text-[13px] font-[600] text-[#111] transition-colors border-b border-[#F3F4F6]"
                                    onClick={() => setExportOpen(false)}
                                >
                                    <i className="bi bi-filetype-pdf mr-3 text-[#F03D3D] text-[16px]"></i> PDF Format
                                </button>
                                <button
                                    className="w-full flex items-center px-5 py-2.5 hover:bg-gray-50 text-[13px] font-[600] text-[#111] transition-colors"
                                    onClick={() => setExportOpen(false)}
                                >
                                    <i className="bi bi-file-earmark-excel-fill mr-3 text-[#12B76A] text-[16px]"></i> Excel Format
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Table headers={['Name', 'Date & Time', 'Reason for Request', 'Action']} headerBg="bg-[#FFF1F1]">
                {requests.map((r) => (
                    <tr
                        key={r.id}
                        className="transition-colors border-b border-[#F3F4F6] hover:bg-black/[0.02] cursor-pointer"
                    >
                        <td className="py-[18px] px-[30px]">
                            <div className="flex items-center gap-3">
                                <div className="w-[44px] h-[44px] rounded-full overflow-hidden border-2 border-white shadow-sm">
                                    <img src={`https://i.pravatar.cc/100?img=${r.avatar}`} className="w-full h-full object-cover" alt="" />
                                </div>
                                <span className="font-[700] text-[#111] transition-all hover:text-[#0066FF] hover:underline decoration-[#0066FF] underline-offset-2">{r.name}</span>
                            </div>
                        </td>
                        <td className="py-[18px] px-[30px] text-[#111] font-[600]">{r.date} <span className="ml-[10px]">{r.time}</span></td>
                        <td className="py-[18px] px-[30px] text-[#111] font-[600]">{r.reason}</td>
                        <td className="py-[18px] px-[30px]">
                            {r.status === 'pending' ? (
                                <div className="flex items-center gap-3">
                                    <button onClick={() => openModal('approve', r)} className="bg-[#12B76A] text-white px-[20px] py-[8px] rounded-[30px] text-[13px] font-[700] hover:bg-[#039855] transition-all">Approve</button>
                                    <button onClick={() => openModal('reject', r)} className="bg-[#F03D3D] text-white px-[20px] py-[8px] rounded-[30px] text-[13px] font-[700] hover:bg-[#D10000] transition-all">Reject</button>
                                </div>
                            ) : r.status === 'approved' ? (
                                <span className="inline-block bg-[#D1FADF] text-[#12B76A] px-[20px] py-[8px] rounded-[30px] text-[13px] font-[800]">Approved</span>
                            ) : (
                                <span className="inline-block bg-[#FEE4E2] text-[#F03D3D] px-[20px] py-[8px] rounded-[30px] text-[13px] font-[800]">Rejected</span>
                            )}
                        </td>
                    </tr>
                ))}
            </Table>
            <Pagination totalItems={requests.length} />

            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                onClose={closeModal}
                onConfirm={handleConfirm}
                type={modalConfig.type}
                targetName={modalConfig.targetData?.name}
                actionName={modalConfig.targetData?.reason}
            />
        </AdminLayout>
    );
}
