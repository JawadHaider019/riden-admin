import React, { useState } from 'react';
import { startOfWeek } from 'date-fns';
import AdminLayout from '@/layouts/AdminLayout';
import { Badge, Button, Table, SearchBar, Pagination, DateRangePicker, DatePickerStyles, Tabs } from '@/components/UI';

export default function PayoutManagement() {
    const [view, setView] = useState('payouts'); // 'payouts' or 'instant-requests'
    const [tab, setTab] = useState('upcoming'); // 'upcoming' or 'previous'
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);

    const drivers = [
        { name: 'Wade Warren', id: '#34567', rides: '45', amount: '$50.00', date: '22 March 2025', img: 'https://i.pravatar.cc/100?img=11', instant: true },
        { name: 'Jacob Jones', id: '#34567', rides: '45', amount: '$50.00', date: '22 March 2025', img: 'https://i.pravatar.cc/100?img=12' },
        { name: 'Bessie Cooper', id: '#34567', rides: '45', amount: '$50.00', date: '22 March 2025', img: 'https://i.pravatar.cc/100?img=13' },
        { name: 'Theresa Webb', id: '#34567', rides: '45', amount: '$50.00', date: '22 March 2025', img: 'https://i.pravatar.cc/100?img=14' },
        { name: 'Jerome Bell', id: '#34567', rides: '45', amount: '$50.00', date: '22 March 2025', img: 'https://i.pravatar.cc/100?img=15' },
        { name: 'Robert Fox', id: '#34567', rides: '45', amount: '$50.00', date: '22 March 2025', img: 'https://i.pravatar.cc/100?img=16', instant: true },
        { name: 'Kathryn Murphy', id: '#34567', rides: '45', amount: '$50.00', date: '22 March 2025', img: 'https://i.pravatar.cc/100?img=17' },
        { name: 'Savannah Nguyen', id: '#34567', rides: '45', amount: '$50.00', date: '22 March 2025', img: 'https://i.pravatar.cc/100?img=18' },
        { name: 'Floyd Miles', id: '#34567', rides: '45', amount: '$50.00', date: '22 March 2025', img: 'https://i.pravatar.cc/100?img=19' },
        { name: 'Devon Lane', id: '#34567', rides: '45', amount: '$50.00', date: '22 March 2025', img: 'https://i.pravatar.cc/100?img=20' },
    ];

    const upcomingHeaders = ['Name', 'Unique ID', 'Total Rides', 'Total Amount'];
    const previousHeaders = ['Name', 'Unique ID', 'Total Rides', 'Total Amount', 'Payout Date', 'Receipt'];
    const instantHeaders = ['Name', 'Unique ID', 'Total Rides', 'Total Amount', 'Action'];

    return (
        <AdminLayout title={view === 'payouts' ? "Payments" : "Instant Payout Requests"}>
            <DatePickerStyles />
            {/* Header Actions */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                <div className="flex items-center gap-4 w-full lg:w-auto">
                    {view === 'instant-requests' && (
                        <button
                            onClick={() => setView('payouts')}
                            className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            <i className="bi bi-chevron-left text-sm"></i>
                        </button>
                    )}
                    <SearchBar
                        placeholder="Search by ID or driver name"
                        className="w-full lg:w-[360px]"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    {view === 'payouts' && (
                        <Button variant="pill" className="flex-none" onClick={() => setView('instant-requests')}>
                            Instant Payout Requests(12)
                        </Button>
                    )}
                    <DateRangePicker
                        startDate={startDate}
                        endDate={endDate}
                        onStartDateChange={setStartDate}
                        onEndDateChange={setEndDate}
                    />
                </div>
            </div>
            <Tabs
                activeTab={tab}
                onTabChange={setTab}
                options={[
                    { id: 'upcoming', label: 'Upcoming Payments' },
                    { id: 'previous', label: 'Previous Transactions', count: 14 }
                ]}
            />


            <Table
                headers={view === 'instant-requests' ? instantHeaders : (tab === 'upcoming' ? upcomingHeaders : previousHeaders)}
                headerBg="bg-[#FFF1F2]"
            >
                {drivers.map((d, i) => (
                    <tr key={i} className="hover:bg-black/[0.03] transition-colors border-b border-[#F3F4F6]">
                        <td className="py-[18px] px-[30px]">
                            <div className="flex items-center gap-3">
                                <div className="w-[44px] h-[44px] rounded-full border-2 border-white shadow-sm overflow-hidden">
                                    <img src={d.img} className="w-full h-full object-cover" />
                                </div>
                                <span className="text-[14px] font-[600] text-[#111]">{d.name}</span>
                            </div>
                        </td>
                        <td className="py-[18px] px-[30px] text-[14px] font-[600] text-gray-500">{d.id}</td>
                        <td className="py-[18px] px-[30px] text-[14px] font-[600] text-[#111]">{d.rides}</td>
                        <td className="py-[18px] px-[30px] text-[14px] font-[700] text-[#111]">{d.amount}</td>

                        {view === 'payouts' && tab === 'previous' && (
                            <>
                                <td className="py-[18px] px-[30px]">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[14px] font-[600] text-[#111]">{d.date}</span>
                                        {d.instant && (
                                            <span className="px-3 py-1 bg-[#D10000] text-white text-[10px] font-[700] rounded-lg uppercase">
                                                instant payout
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="py-[18px] px-[30px]">
                                    <button className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-[#D10000] transition-colors">
                                        <i className="bi bi-file-earmark-text-fill text-xl"></i>
                                    </button>
                                </td>
                            </>
                        )}

                        {view === 'instant-requests' && (
                            <td className="py-[18px] px-[30px]">
                                <button className="px-6 py-2 bg-[#ECFDF3] text-[#12B76A] text-[13px] font-[700] rounded-lg hover:bg-[#D1FADF] transition-all">
                                    Approve
                                </button>
                            </td>
                        )}
                    </tr>
                ))}
            </Table>

            <div className="mt-8">
                <Pagination totalItems={drivers.length} />
            </div>
        </AdminLayout>
    );
}
