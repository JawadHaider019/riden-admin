import React, { useState } from 'react';
import { startOfWeek } from 'date-fns';
import AdminLayout from '@/layouts/AdminLayout';
import { Badge, SearchBar, Tabs, Pagination, DateRangePicker, DatePickerStyles } from '@/components/UI';

export default function ReviewManagement() {
    const [tab, setTab] = useState('drivers');
    const [startDate, setStartDate] = useState(startOfWeek(new Date()));
    const [endDate, setEndDate] = useState(new Date());

    const reviews = {
        drivers: [
            { name: 'Floyd Miles', rating: '4.5', date: '22-02-2025 09:00pm', id: '#34526', by: 'Passenger Ronald Richards', img: 'https://i.pravatar.cc/100?img=12' },
            { name: 'Floyd Miles', rating: '4.5', date: '22-02-2025 09:00pm', id: '#31826', by: 'Passenger Ronald Richards', img: 'https://i.pravatar.cc/100?img=13' },
            { name: 'Floyd Miles', rating: '4.5', date: '22-02-2025 09:00pm', id: '#34526', by: 'Passenger Ronald Richards', img: 'https://i.pravatar.cc/100?img=14' },
        ],
        passengers: [
            { name: 'Eleanor Pena', rating: '4.0', date: '22-02-2025 09:00pm', id: '#22841', by: 'Driver Jacob Jones', img: 'https://i.pravatar.cc/100?img=21' },
            { name: 'Brooklyn Simmons', rating: '3.5', date: '22-02-2025 09:00pm', id: '#19472', by: 'Driver Wade Warren', img: 'https://i.pravatar.cc/100?img=22' },
        ]
    };

    const currentReviews = reviews[tab];

    const ratingDistribution = [
        { stars: 5, count: '2.0k', width: '75%', color: '#12B76A' },
        { stars: 4, count: '2.5k', width: '85%', color: '#6CE9A6' },
        { stars: 3, count: '1.5k', width: '55%', color: '#FDB022' },
        { stars: 2, count: '1.0k', width: '35%', color: '#F97066' },
        { stars: 1, count: '0.5k', width: '18%', color: '#D92D20' },
    ];

    return (
        <AdminLayout title="Reviews & Ratings">
            <DatePickerStyles />
            {/* Header Row: Search + Date Picker (no download) */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <SearchBar
                    placeholder="Search by passenger or driver name"
                    className="w-full lg:w-[360px]"
                />

                <div className="flex items-center gap-2 w-full lg:w-auto">
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
                    { id: 'drivers', label: 'Drivers Reviews' },
                    { id: 'passengers', label: 'Passengers Reviews' }
                ]}
            />

            {/* Stats Summary Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8 bg-white border border-[#E5E7EB] rounded-[20px] mb-8 relative overflow-hidden">
                <div className="space-y-3">
                    <p className="text-[13px] font-[700] text-[#6B7280] uppercase tracking-wider">Total Reviews</p>
                    <h2 className="text-[42px] font-[900] text-[#111] leading-none">10.0K</h2>
                    <p className="text-[12px] font-[700] text-[#12B76A] flex items-center gap-1.5 bg-[#ECFDF3] w-fit px-3 py-1 rounded-full">
                        <i className="bi bi-graph-up-arrow text-[10px]"></i> 4% Growth rate this year
                    </p>
                </div>
                <div className="space-y-3 md:border-l border-[#F3F4F6] md:ps-8">
                    <p className="text-[13px] font-[700] text-[#6B7280] uppercase tracking-wider">Average Rating</p>
                    <div className="flex items-center gap-3">
                        <h2 className="text-[42px] font-[900] text-[#111] leading-none">4.0</h2>
                        <div className="flex text-[#FBBF24] text-xl gap-0.5">
                            <i className="bi bi-star-fill"></i>
                            <i className="bi bi-star-fill"></i>
                            <i className="bi bi-star-fill"></i>
                            <i className="bi bi-star-fill"></i>
                            <i className="bi bi-star text-[#E5E7EB]"></i>
                        </div>
                    </div>
                    <p className="text-[12px] text-[#9CA3AF] font-[600]">Average rating this year</p>
                </div>
                <div className="space-y-2 md:border-l border-[#F3F4F6] md:ps-8 flex flex-col justify-center">
                    {ratingDistribution.map((r) => (
                        <div key={r.stars} className="flex items-center gap-3">
                            <div className="flex-1 h-[8px] bg-[#F3F4F6] rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-500" style={{ width: r.width, backgroundColor: r.color }}></div>
                            </div>
                            <span className="text-[11px] font-[700] text-[#9CA3AF] w-[28px] text-right">{r.count}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Reviews List */}
            <div className="space-y-5">
                {currentReviews.map((r, i) => (
                    <div key={i} className="p-7 bg-white border border-[#E5E7EB] rounded-[20px] hover:shadow-lg hover:shadow-black/[0.03] transition-all duration-300 group">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full border-2 border-white shadow-sm overflow-hidden">
                                    <img src={r.img} className="w-full h-full object-cover" alt={r.name} />
                                </div>
                                <div>
                                    <h4 className="text-[16px] font-[800] text-[#111]">{r.name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex gap-0.5 text-[#FBBF24] text-[14px]">
                                            <i className="bi bi-star-fill"></i>
                                            <i className="bi bi-star-fill"></i>
                                            <i className="bi bi-star-fill"></i>
                                            <i className="bi bi-star-fill"></i>
                                            <i className="bi bi-star-half"></i>
                                        </div>
                                        <span className="font-[700] text-[#9CA3AF] text-[13px]">({r.rating})</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <p className="text-[13px] font-[600] text-[#9CA3AF]">{r.date}</p>
                                <span className="bg-[#D10000] text-white px-4 py-1 rounded-full text-[11px] font-[700]">Booking ID {r.id}</span>
                            </div>
                        </div>

                        <p className="text-[14px] text-[#4B5563] leading-[1.85] font-[500] mb-5">
                            Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.
                        </p>

                        <div className="flex justify-between items-center pt-5 border-t border-[#F3F4F6]">
                            <p className="text-[13px] font-[600] text-[#9CA3AF]">
                                By {tab === 'drivers' ? 'Passenger' : 'Driver'} <span className="text-[#D10000] font-[700] cursor-pointer hover:underline underline-offset-2">{r.by.split(' ').slice(1).join(' ')}</span>
                            </p>
                            <button className="w-8 h-8 rounded-lg bg-[#FEE4E2] text-[#D10000] hover:bg-[#D10000] hover:text-white transition-all flex items-center justify-center">
                                <i className="bi bi-trash3-fill text-[13px]"></i>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <Pagination totalItems={currentReviews.length} />
        </AdminLayout>
    );
}
