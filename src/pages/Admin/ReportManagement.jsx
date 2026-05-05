import React, { useState } from 'react';
import { startOfWeek } from 'date-fns';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, Cell, PieChart, Pie
} from 'recharts';
import AdminLayout from '@/layouts/AdminLayout';
import { Table, Badge, Button, SearchBar, Pagination, DateRangePicker, DatePickerStyles, Input, Label, Select, InputWrapper } from '@/components/UI';

export default function ReportManagement() {
    const [activeTab, setActiveTab] = useState('financial');
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);

    const [exportOpen, setExportOpen] = useState(false);

    const tabs = [
        { id: 'financial', label: 'Financial Reports' },
        { id: 'operational', label: 'Operational Reports' },
        { id: 'user', label: 'User & Asset Reports' },
        { id: 'marketing', label: 'Marketing & Quality Reports' },
        { id: 'builder', label: 'Custom Report Builder' }
    ];

    // --- Mock Data ---
    const financialData = [
        { date: '23/04/2025', revenue: '$130.00', commission: '$10.00', earnings: '$50.00' },
        { date: '23/04/2025', revenue: '$530.00', commission: '$10.00', earnings: '$50.00' },
        { date: '23/04/2025', revenue: '$230.00', commission: '$30.00', earnings: '$50.00' },
        { date: '23/04/2025', revenue: '$230.00', commission: '$20.00', earnings: '$50.00' },
    ];

    const chartData = [
        { name: 'Jan', rides: 400, canceled: 240 },
        { name: 'Feb', rides: 300, canceled: 139 },
        { name: 'Mar', rides: 200, canceled: 980 },
        { name: 'Apr', rides: 278, canceled: 390 },
        { name: 'May', rides: 189, canceled: 480 },
        { name: 'Jun', rides: 239, canceled: 380 },
        { name: 'Jul', rides: 349, canceled: 430 },
    ];

    const promoData = [
        { name: 'WELCOME50', use: 400 },
        { name: 'OFF10', use: 300 },
        { name: 'FIRST2', use: 200 },
        { name: 'HOLIDAY', use: 278 },
    ];

    const heatmapGrid = Array(5).fill(0).map(() => Array(10).fill(0).map(() => Math.floor(Math.random() * 100)));

    return (
        <AdminLayout title="Report Management">
            <DatePickerStyles />
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <SearchBar
                    placeholder="Search by code or date"
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

            {/* Header / Tabs */}
            <div className="mb-4">
                <div className="bg-[#D10000] rounded-full p-1.5 flex mb-4 w-fit">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-3 rounded-full text-sm font-[600] transition-all duration-300 ${activeTab === tab.id
                                ? 'bg-white text-[#D10000] shadow-md'
                                : 'text-white hover:bg-white/10'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

            </div>

            {/* Content Areas */}
            <div className="mt-8">
                {activeTab === 'financial' && (
                    <div className="space-y-8 animate-fade-in">
                        <section>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-[800] text-[#111]">Earnings Overview</h3>
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
                            <Table headers={['Date', 'Total Revenue', 'Platform Comm.', 'Driver Earnings']} headerBg="bg-[#FFF1F2]" headerAlign="text-center">
                                {financialData.map((row, i) => (
                                    <tr key={i} className="border-b border-gray-100 font-[600] text-[#111] text-center">
                                        <td className="py-4">{row.date}</td>
                                        <td className="py-4 text-gray-500">{row.revenue}</td>
                                        <td className="py-4 text-gray-500">{row.commission}</td>
                                        <td className="py-4 text-gray-500">{row.earnings}</td>
                                    </tr>
                                ))}
                            </Table>
                        </section>

                        <section>
                            <h3 className="text-xl font-[800] text-[#111] mb-4">Payout History</h3>
                            <Table headers={['Date', 'Total Revenue', 'Platform Comm.', 'Driver Earnings']} headerBg="bg-[#FFF1F2]" headerAlign="text-center">
                                {financialData.map((row, i) => (
                                    <tr key={i} className="border-b border-gray-100 font-[600] text-[#111] text-center">
                                        <td className="py-4">{row.date}</td>
                                        <td className="py-4 text-gray-500">{row.revenue}</td>
                                        <td className="py-4 text-gray-500">{row.commission}</td>
                                        <td className="py-4 text-gray-500">{row.earnings}</td>
                                    </tr>
                                ))}
                            </Table>
                        </section>

                        <section>
                            <h3 className="text-xl font-[800] text-[#111] mb-4">Tax/VAT Reports</h3>

                            <Table headers={['Period', 'Amount #1', 'Amount #2']} headerBg="bg-[#FFF1F2]" headerAlign="text-center">
                                <tr className="border-b border-gray-100 font-[600] text-[#111] text-center">
                                    <td className="py-4 px-6 text-gray-500">23/04/2025</td>
                                    <td className="py-4 px-6">45</td>
                                    <td className="py-4 px-6 text-gray-500">$120.00</td>
                                </tr>
                                <tr className="border-b border-gray-100 font-[600] text-[#111] text-center">
                                    <td className="py-4 px-6 text-gray-500">23/04/2025</td>
                                    <td className="py-4 px-6">45</td>
                                    <td className="py-4 px-6 text-gray-500">$50.00</td>
                                </tr>
                            </Table>


                        </section>
                    </div>
                )}

                {activeTab === 'operational' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in">
                        <section className="bg-white border border-gray-200 rounded-[30px] p-6 shadow-sm">
                            <h3 className="text-xl font-[600] text-[#111] mb-8">Ride Trends & Demand</h3>
                            <div className="h-[300px] mb-8">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="rides" stroke="#D10000" strokeWidth={3} dot={{ r: 6, fill: '#D10000' }} name="Completed Rides" />
                                        <Line type="monotone" dataKey="canceled" stroke="#94A3B8" strokeWidth={2} name="Canceled Rides" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                            <div>
                                <h4 className="font-[800] text-gray-500 text-[14px] mb-4">DEMAND HEATMAP (MOCK)</h4>
                                <div className="grid grid-cols-10 gap-1 mb-6">
                                    {heatmapGrid.map((row, r) =>
                                        row.map((val, c) => (
                                            <div
                                                key={`${r}-${c}`}
                                                className="aspect-square rounded-sm transition-all hover:scale-110 cursor-pointer"
                                                style={{
                                                    backgroundColor: `rgba(209, 0, 0, ${val / 100})`,
                                                    border: '1px solid rgba(0,0,0,0.05)'
                                                }}
                                                title={`Area ${r},${c}: ${val}% demand`}
                                            ></div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </section>

                        <section className="bg-white border border-gray-200 rounded-[30px] p-6 shadow-sm">
                            <h3 className="text-xl font-[800] text-[#111] mb-8">Operational KPI Table</h3>
                            <Table headers={['Category', 'Rides', 'Total']} headerBg="bg-[#FFF1F2]" headerAlign="text-left" tableClassName="table-fixed">
                                <tr className="border-b border-gray-100 font-[600] text-[#111]">
                                    <td className="py-4 pl-4   text-sm">Ride Trends & Demand</td>
                                    <td className="py-4 pl-10   text-sm">45</td>
                                    <td className="py-4 pl-8   text-sm text-gray-500">$5.00</td>
                                </tr>
                                <tr className="border-b border-gray-100 font-[600] text-[#111]">
                                    <td className="py-4 pl-4   text-sm">Heatmap</td>
                                    <td className="py-4 pl-10   text-sm">45</td>
                                    <td className="py-4 pl-8   text-sm text-gray-500">$5.00</td>
                                </tr>
                                <tr className="border-b border-gray-100 font-[600] text-[#111]">
                                    <td className="py-4 pl-4   text-sm">Canceled Trends</td>
                                    <td className="py-4 pl-10   text-sm">45</td>
                                    <td className="py-4 pl-8   text-sm text-gray-500">$5.00</td>
                                </tr>
                            </Table>
                        </section>
                    </div>
                )}

                {activeTab === 'user' && (
                    <div className="space-y-8 animate-fade-in">
                        <section>
                            <h3 className="text-xl font-[800] text-[#111] mb-6">Driver Leaderboard & Compliance</h3>
                            <Table headers={['Rank', 'Driver Name', 'Total Rides', 'Rating', 'Compliance Status']} headerBg="bg-[#FFF1F2]" headerAlign="text-center">
                                {[
                                    { rank: 1, name: 'Wade Warren', rides: 450, rating: '4.9', status: 'Active' },
                                    { rank: 2, name: 'Jacob Jones', rides: 420, rating: '4.8', status: 'Expiring Soon' },
                                    { rank: 3, name: 'Bessie Cooper', rides: 390, rating: '4.7', status: 'Active' },
                                ].map((row, i) => (
                                    <tr key={i} className="border-b border-gray-100 font-[600] text-[#111] text-center">
                                        <td className="py-4">#{row.rank}</td>
                                        <td className="py-4">{row.name}</td>
                                        <td className="py-4 text-gray-500">{row.rides}</td>
                                        <td className="py-4 text-[#D10000] font-[800] tracking-wider italic">{row.rating} <i className="bi bi-star-fill text-[12px]"></i></td>
                                        <td className="py-4">
                                            <Badge variant={row.status === 'Active' ? 'success' : 'warning'}>{row.status}</Badge>
                                        </td>
                                    </tr>
                                ))}
                            </Table>
                        </section>
                    </div>
                )}

                {activeTab === 'marketing' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                        <section className="bg-white border border-gray-200 rounded-[30px] p-8 shadow-sm">
                            <h3 className="text-xl font-[800] text-[#111] mb-8">Promo & Ratings Analysis</h3>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={promoData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} />
                                        <Tooltip />
                                        <Bar dataKey="use" radius={[10, 10, 0, 0]}>
                                            {promoData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? '#D10000' : '#FECACA'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </section>

                        <section className="bg-white border border-gray-200 rounded-[30px] p-8 shadow-sm flex flex-col justify-center items-center">
                            <h3 className="text-xl font-[800] text-[#111] mb-8 self-start">Rating Distribution</h3>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: '5 Stars', value: 400 },
                                                { name: '4 Stars', value: 300 },
                                                { name: '3 Stars', value: 100 },
                                                { name: '2 Stars', value: 50 },
                                                { name: '1 Star', value: 20 },
                                            ]}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            <Cell fill="#D10000" />
                                            <Cell fill="#FCA5A5" />
                                            <Cell fill="#FEE2E2" />
                                            <Cell fill="#F3F4F6" />
                                            <Cell fill="#111" />
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'builder' && (
                    <div className="bg-white border border-gray-200 rounded-[30px] p-10 shadow-sm animate-fade-in max-w-5xl mx-auto">
                        <section className="mb-12">
                            <h3 className="text-2xl font-[800] text-[#111] mb-10 tracking-tight">Custom Report Builder</h3>
                            <div className="space-y-8 px-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <Label>Report Category</Label>
                                        <InputWrapper>
                                            <Select>
                                                <option>Financial</option>
                                                <option>Operational</option>
                                                <option>Compliance</option>
                                            </Select>
                                            <i className="bi bi-chevron-down text-[#111] text-[12px]"></i>
                                        </InputWrapper>
                                    </div>
                                    <div className="space-y-3">
                                        <Label>Date Range</Label>
                                        <DateRangePicker
                                            startDate={startDate}
                                            endDate={endDate}
                                            onStartDateChange={setStartDate}
                                            onEndDateChange={setEndDate}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label className="mb-6">Select Data Points</Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                        {['Total Rides', 'Total Amount', 'Commission', 'Cancelled Rides', 'Feedback Score', 'Driver Online Hours'].map((point, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${i < 3 ? 'bg-[#D10000] border-[#D10000]' : 'border-gray-200 hover:border-[#D10000]'}`}>
                                                    {i < 3 && <i className="bi bi-check-lg text-white"></i>}
                                                </div>
                                                <span className="text-[14px] font-[600] text-gray-700">{point}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-8">
                                    <button className="w-full py-4 bg-[#D10000] text-white rounded-2xl font-[800] uppercase tracking-wider hover:bg-black transition-all shadow-xl shadow-red-100 italic">
                                        Generate & Export Report (CSV/PDF)
                                    </button>
                                </div>
                            </div>
                        </section>

                        <section className="pt-10 border-t border-gray-100">
                            <h4 className="text-lg font-[800] text-[#111] mb-6">Recently Generated Reports</h4>
                            <Table headers={['Report Name', 'Category', 'Date Generated', 'Format', 'Download']} headerBg="bg-[#FFF1F2]" headerAlign="text-center">
                                <tr className="border-b border-gray-100 font-[600] text-[#111] text-center">
                                    <td className="py-4">Monthly Financial_Q1</td>
                                    <td className="py-4 text-gray-500">Financial</td>
                                    <td className="py-4 text-gray-500">22/04/2025 09:30</td>
                                    <td className="py-4">PDF</td>
                                    <td className="py-4">
                                        <button className="text-[#D10000] hover:scale-110 transition-transform">
                                            <i className="bi bi-cloud-arrow-down-fill text-2xl"></i>
                                        </button>
                                    </td>
                                </tr>
                            </Table>
                        </section>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
