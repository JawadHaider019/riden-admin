import React, { useState } from 'react';
import { startOfWeek } from 'date-fns';
import AdminLayout from '@/layouts/AdminLayout';
import { Button, Table, SearchBar, Pagination, DateRangePicker, DatePickerStyles } from '@/components/UI';

export default function CommissionManagement() {
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [view, setView] = useState('list');
    const [editingType, setEditingType] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [commissions, setCommissions] = useState([
        { type: 'Standard', percentage: '10%' },
        { type: 'SUV', percentage: '20%' },
        { type: 'Van', percentage: '30%' },
        { type: 'Premium', percentage: '40%' },
        { type: 'Wheelchair Accessible', percentage: '50%' },
    ]);

    const transactions = [
        { date: '22 March 2025', id: '#34567', type: 'Standard', total: '$400.00', discount: '$0.00', percent: '20%', amount: '$80.00' },
        { date: '22 March 2025', id: '#34568', type: 'Premium', total: '$600.00', discount: '$0.00', percent: '25%', amount: '$150.00' },
        { date: '22 March 2025', id: '#34569', type: 'Standard', total: '$400.00', discount: '$0.00', percent: '20%', amount: '$80.00' },
        { date: '22 March 2025', id: '#34570', type: 'Van', total: '$800.00', discount: '$0.00', percent: '30%', amount: '$240.00' },
    ];

    const startEditing = (item) => {
        setEditingType(item.type);
        setEditValue(item.percentage);
    };

    const saveEditing = () => {
        setCommissions(prev => prev.map(c => c.type === editingType ? { ...c, percentage: editValue } : c));
        setEditingType(null);
    };

    return (
        <AdminLayout title="Commission Management">
            <DatePickerStyles />
            {/* Header Actions */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                {view === 'list' ? (
                    <>
                        <SearchBar
                            placeholder="Search by ID or car type"
                            className="w-full lg:w-[360px]"
                        />
                        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                            <Button variant="pill" className="flex-none" onClick={() => setView('set')}>
                                <i className="bi bi-gear-fill mr-2"></i> Set Commission
                            </Button>
                            <DateRangePicker
                                startDate={startDate}
                                endDate={endDate}
                                onStartDateChange={setStartDate}
                                onEndDateChange={setEndDate}
                            />
                        </div>
                    </>
                ) : (
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setView('list')}
                            className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            <i className="bi bi-chevron-left text-sm"></i>
                        </button>
                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Set Car Type Commission</h2>
                    </div>
                )}
            </div>

            {view === 'list' ? (
                <>
                    {/* KPI Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-white border border-[#E5E7EB] p-4 rounded-[30px] flex justify-between items-center group relative overflow-hidden hover:shadow-xl hover:shadow-riden-red/5 transition-all duration-500">
                            <div className="relative z-10">
                                <span className="text-[14px] font-[700] text-[#9CA3AF] block mb-2 uppercase tracking-widest">Total Rides</span>
                                <h1 className="text-5xl font-[700] text-[#111] leading-none tracking-tight">1,024</h1>
                            </div>
                            <img
                                src="/assets/images/totalrides.png"
                                alt="Total Rides"
                                className="w-32 h-32 object-contain group-hover:scale-110 transition-all duration-700"
                            />
                        </div>
                        <div className="bg-white border border-[#E5E7EB] p-4 rounded-[30px] flex justify-between items-center group relative overflow-hidden hover:shadow-xl hover:shadow-riden-red/5 transition-all duration-500">
                            <div className="relative z-10">
                                <span className="text-[14px] font-[700] text-[#9CA3AF] block mb-2 uppercase tracking-widest">Total Commission</span>
                                <h1 className="text-5xl font-[700] text-[#111] leading-none tracking-tight">$45,000</h1>
                            </div>
                            <img
                                src="/assets/images/totalcommission.png"
                                alt="Total Commission"
                                className="w-32 h-32 object-contain  group-hover:scale-110 transition-all duration-700"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <Table headers={['Date & Time', 'Booking ID', 'Car Type', 'Total Amount', 'Discount', 'Commission %', ' Amount']} headerBg="bg-[#FFF1F2]" headerAlign="text-center">
                        {transactions.map((row, i) => (
                            <tr key={i} className="hover:bg-black/[0.03] transition-colors border-b border-[#F3F4F6]">
                                <td className="py-[18px] px-[30px] text-[14px] font-[600] text-[#4B5563] text-center">{row.date}</td>
                                <td className="py-[18px] px-[30px] text-[14px] font-[800] text-[#D10000] text-center">{row.id}</td>
                                <td className="py-[18px] px-[30px] text-[14px] font-[800] text-[#111] uppercase italic tracking-tight text-center">{row.type}</td>
                                <td className="py-[18px] px-[30px] text-[14px] font-[800] text-[#111] text-center">{row.total}</td>
                                <td className="py-[18px] px-[30px] text-[14px] font-[600] text-[#9CA3AF] font-mono text-center">{row.discount}</td>
                                <td className="py-[18px] px-[30px] text-[14px] font-[800] text-[#111] text-center">{row.percent}</td>
                                <td className="py-[18px] px-[30px] text-[14px] font-[800] text-[#12B76A] text-center">{row.amount}</td>
                            </tr>
                        ))}
                    </Table>

                    <Pagination totalItems={transactions.length} />
                </>
            ) : (
                <div className="bg-white border border-[#E5E7EB] rounded-[30px] overflow-hidden shadow-sm">
                    <Table headers={['Car Types', 'Commission % per ride', 'Actions']} headerBg="bg-[#D10000]" headerAlign="text-left" tableClassName="table-fixed" headerTextColor="text-white">
                        {commissions.map((item, i) => {
                            const isEditing = editingType === item.type;
                            return (
                                <tr key={i} className={`border-b border-gray-100 transition-colors ${isEditing ? 'bg-red-50/30' : ''}`}>
                                    <td className="py-6 px-10 text-[15px] font-[600] text-[#111]">{item.type}</td>
                                    <td className="py-6 px-10">
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                className="w-32 px-4 py-2 border border-[#D10000] rounded-xl text-[15px] font-[700] text-[#111] focus:ring-4 focus:ring-red-100 outline-none"
                                            />
                                        ) : (
                                            <span className="text-[15px] font-[700] text-[#111]">{item.percentage}</span>
                                        )}
                                    </td>
                                    <td className="py-6 px-10 text-right">
                                        {isEditing ? (
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={saveEditing}
                                                    className="px-6 py-2.5 bg-[#12B76A] text-white text-xs font-bold rounded-full hover:bg-[#039855] transition-all shadow-md"
                                                >
                                                    Update
                                                </button>
                                                <button
                                                    onClick={() => setEditingType(null)}
                                                    className="px-6 py-2.5 bg-white border border-gray-200 text-gray-500 text-xs font-bold rounded-full hover:bg-gray-50 transition-all"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => startEditing(item)}
                                                className="px-10 py-3 bg-[#D10000] text-white text-[13px] font-[700] rounded-[12px] hover:bg-[#D10000]/90 transition-all shadow-lg shadow-red-100 uppercase"
                                            >
                                                Edit
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </Table>
                </div>
            )}
        </AdminLayout>
    );
}
