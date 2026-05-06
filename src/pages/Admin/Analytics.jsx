import React, { useState, useMemo, useEffect, useCallback } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { getDashboardAnalytics, getDashboardStats } from '../../api/dashboard';
import { MiniChart } from '@/components/UI';

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { format, startOfWeek, startOfMonth, startOfYear, parseISO } from 'date-fns';

export default function Analytics() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [globalPeriod, setGlobalPeriod] = useState('This Week');
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState(null);

    const tabs = [
        { id: 'dashboard', label: 'Live Dashboard' },
        { id: 'driver', label: 'Driver Analytics' },
        { id: 'passenger', label: 'Passengers Insights' },
        { id: 'ride', label: 'Ride Analytics' },
        { id: 'financial', label: 'Financial Metrics' },
    ];

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [analyticsRes, statsRes] = await Promise.all([
                getDashboardAnalytics(),
                getDashboardStats()
            ]);

            if (analyticsRes.status === 'success') {
                setAnalytics(analyticsRes.data);
                setError(null);
            } else {
                setError('Failed to load analytics data');
            }

            if (statsRes.status === 'success') {
                setStats(statsRes.data);
            } else {
                setStats(statsRes.data || statsRes);
            }
        } catch (error) {
            console.error("Error loading dashboard data", error);
            setError(error.message || 'An error occurred while fetching analytics');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Filter data based on date range
    const filterDataByDateRange = useCallback((data, dateField = 'date') => {
        if (!data || !Array.isArray(data)) return [];
        if (!startDate || !endDate) return data; // Skip filtering if dates are not selected

        return data.filter(item => {
            const itemDate = parseISO(item[dateField]);
            return itemDate >= startDate && itemDate <= endDate;
        });
    }, [startDate, endDate]);

    const handleGlobalPeriodChange = (e) => {
        const val = e.target.value;
        setGlobalPeriod(val);
        if (val === 'Today') {
            setStartDate(new Date());
            setEndDate(new Date());
        } else if (val === 'This Week') {
            setStartDate(startOfWeek(new Date()));
            setEndDate(new Date());
        } else if (val === 'This Month') {
            setStartDate(startOfMonth(new Date()));
            setEndDate(new Date());
        } else if (val === 'This Year') {
            setStartDate(startOfYear(new Date()));
            setEndDate(new Date());
        }
    };

    if (loading) {
        return (
            <AdminLayout title="Dashboard & Analytics">
                <div className="flex justify-center items-center h-96">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D10000] mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading analytics data...</p>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    if (error) {
        return (
            <AdminLayout title="Dashboard & Analytics">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <i className="bi bi-exclamation-triangle text-red-500 text-2xl"></i>
                    <p className="text-red-600 mt-2">{error}</p>
                    <button
                        onClick={loadData}
                        className="mt-4 px-4 py-2 bg-[#D10000] text-white rounded-full hover:bg-red-700"
                    >
                        Retry
                    </button>
                </div>
            </AdminLayout>
        );
    }

    // Get chart data from analytics
    const getActiveDriversChartData = () => {
        if (analytics?.passenger_growth) {
            return analytics.passenger_growth.slice(-7).map(item => item.total);
        }
        return [30, 50, 40, 75, 100, 60, 25]; // fallback data
    };

    const getOngoingRidesChartData = () => {
        if (analytics?.booking_trends) {
            return analytics.booking_trends.slice(-7).map(item => item.total);
        }
        return [30, 50, 100, 75, 60, 45, 20]; // fallback data
    };

    return (
        <AdminLayout title="Dashboard & Analytics">
            {/* Filters Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="relative group">
                    <select
                        value={globalPeriod}
                        onChange={handleGlobalPeriodChange}
                        className="pl-5 pr-15 py-2 bg-white border-[1.5px] border-[#666]/20 rounded-full text-[14px] font-[600] text-[#111] appearance-none outline-none focus:border-[#D10000] cursor-pointer shadow-sm"
                    >
                        <option>Today</option>
                        <option>This Week</option>
                        <option>This Month</option>
                        <option>This Year</option>
                    </select>
                    <i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-[#D10000] text-[12px] pointer-events-none"></i>
                </div>

                <div className="flex items-center gap-2 ml-2">
                    <div className="flex gap-2 r">
                        <div className="relative border border-[#D10000] w-[200px] rounded-full">
                            <div className="absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-[30px] bg-[#D10000] flex items-center justify-center text-white z-10">
                                <i className="bi bi-calendar-check text-[14px]"></i>
                            </div>
                            <DatePicker
                                selected={startDate}
                                onChange={(date) => setStartDate(date)}
                                placeholderText="From"
                                maxDate={new Date()}
                                dateFormat="d-MMM-yyyy"
                                className="pl-11 pr-4 py-2 bg-white border-[1.5px] border-[#666]/30 rounded-full text-[14px] font-[600] w-44 outline-none focus:border-[#D10000] transition-all shadow-sm"
                            />
                        </div>
                        <div className="relative border border-[#D10000] w-[200px] rounded-full">
                            <div className="absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-[30px] bg-[#D10000] flex items-center justify-center text-white z-10">
                                <i className="bi bi-calendar-check text-[14px]"></i>
                            </div>
                            <DatePicker
                                selected={endDate}
                                onChange={(date) => setEndDate(date)}
                                placeholderText="To"
                                minDate={startDate}
                                maxDate={new Date()}
                                dateFormat="d-MMM-yyyy"
                                className="pl-11 pr-4 py-2 bg-white rounded-full text-[14px] font-[600] outline-none focus:border-[#D10000] transition-all"
                            />
                        </div>
                    </div>
                </div>
            </div>



            {/* Sub-Navigation */}
            <div className="bg-[#D10000] rounded-full p-1.5 flex mb-4 w-fit">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-8 py-3 rounded-full text-[15px] font-[600] transition-all duration-300 ${activeTab === tab.id
                            ? 'bg-white text-[#D10000] shadow-md'
                            : 'text-white hover:bg-white/10'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="animate-fade-in transition-all">
                {activeTab === 'dashboard' && (
                    <>
                        {/* Top KPI Summary Bar - Using real data from stats */}
                        <div className="bg-[#FF161F1A] rounded-[30px] p-8 mb-4 border border-[#FEE2E2] relative overflow-hidden">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 items-center relative z-10">
                                {[
                                    {
                                        label: 'Total Bookings',
                                        value: stats?.total_bookings || 0,
                                        icon: 'bi-car-front-fill'
                                    },
                                    {
                                        label: 'Total Passengers',
                                        value: stats?.total_passengers || 0,
                                        icon: 'bi-people-fill'
                                    },
                                    {
                                        label: 'Active Drivers',
                                        value: stats?.total_drivers || 0,
                                        icon: 'bi-person-check-fill'
                                    },
                                    {
                                        label: 'Platform Revenue',
                                        value: `$${stats?.revenue || 0}`,
                                        icon: 'bi-currency-dollar'
                                    },
                                ].map((kpi, i) => (
                                    <div key={i} className={`flex items-center gap-4 px-2 ${i < 3 ? 'border-r-2 border-[#D10000]' : ''}`}>
                                        <div className="w-[64px] h-[64px] rounded-full bg-white shadow-[0_8px_30px_rgba(209,0,0,0.08)] flex items-center justify-center shrink-0">
                                            <i className={`bi ${kpi.icon} text-[26px] text-[#D10000]`}></i>
                                        </div>
                                        <div>
                                            <p className="text-[14px] font-[600] text-[#6B7280] mb-0.5">{kpi.label}</p>
                                            <h3 className="text-[32px] font-[600] text-[#111] leading-none tracking-tight">{kpi.value}</h3>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Live Map & Ongoing Ride Section (from Dashboard) */}
                        <div className="bg-white rounded-[30px] overflow-hidden relative h-[600px] border border-[#E5E7EB] mb-6">
                            <iframe
                                className="w-full h-full border-none contrast-[1.05]"
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1469550.0538914043!2d-80.443189!3d43.834789!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4cd44b1c1d1a8d05%3A0xe10ad5de81c4e7ab!2sToronto%2C%20ON%2C%20Canada!5e0!3m2!1sen!2sus!4v1700000000000!5m2!1sen!2sus"
                                allowFullScreen=""
                                loading="lazy"
                                title="Live Map"
                            ></iframe>

                            {/* Ongoing Ride Card Overlay */}
                            <div className="absolute top-[8%] right-[5%] bg-white rounded-[40px] p-6 w-[360px] shadow-[0_15px_50px_rgba(0,0,0,0.1)] z-10 transition-all hover:scale-[1.02]">
                                <h4 className="text-[17px] font-[600] text-[#D10000] mb-6">Ongoing Ride Preview</h4>

                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <img src="https://i.pravatar.cc/150?img=11" alt="Driver" className="w-[54px] h-[54px] rounded-[14px] object-cover" />
                                        <div>
                                            <h5 className="text-[15px] font-[600] text-[#111]">Sergio Morsis</h5>
                                            <p className="text-[11px] text-[#6B7280] font-[500] uppercase tracking-wider">
                                                Driver • {stats?.completed_bookings || 0} Rides
                                            </p>
                                        </div>
                                    </div>
                                    <button className="w-11 h-11 rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#D10000] hover:bg-[#D10000] hover:text-white transition-all shadow-sm">
                                        <i className="bi bi-telephone-fill"></i>
                                    </button>
                                </div>

                                <div className="relative pl-6 mb-4">
                                    <div className="absolute left-[3px] top-[14px] bottom-[14px] w-[2px] border-l-2 border-dashed border-[#CBD5E1]"></div>
                                    <div className="relative mb-4">
                                        <div className="absolute -left-[27px] top-[6px] w-[11px] h-[11px] bg-black rounded-full"></div>
                                        <h6 className="text-[14px] font-[600] text-[#111]">Office</h6>
                                        <p className="text-[12px] text-[#6B7280]">2972 Westheimer Rd. Santa Ana, IL 85486</p>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute -left-[30px] top-[5px] text-[#D10000]">
                                            <i className="bi bi-geo-alt-fill text-[16px]"></i>
                                        </div>
                                        <h6 className="text-[14px] font-[600] text-[#111]">Coffee shop</h6>
                                        <p className="text-[12px] text-[#6B7280]">1901 Thornridge Cir. Shiloh, HI 81063</p>
                                    </div>
                                </div>

                                <div className="flex justify-between border-t border-[#F1F5F9] pt-6 mb-4">
                                    <div className="text-center">
                                        <p className="text-[10px] font-[600] text-[#94A3B8] uppercase tracking-wider mb-1">EST Distance</p>
                                        <p className="text-[13px] font-[600] text-[#111]">0.2 km</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] font-[600] text-[#94A3B8] uppercase tracking-wider mb-1">EST Time</p>
                                        <p className="text-[13px] font-[600] text-[#111]">2 min</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] font-[600] text-[#94A3B8] uppercase tracking-wider mb-1">Fare Est.</p>
                                        <p className="text-[13px] font-[600] text-[#D10000]">
                                            ${stats?.revenue > 0 ? (stats.revenue / (stats.total_bookings || 1)).toFixed(2) : '25.00'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 border-t border-[#F1F5F9] pt-4">
                                    <div className="w-12 h-10 rounded-[10px] overflow-hidden bg-gray-50 flex items-center justify-center border border-gray-100">
                                        <img src="/assets/images/vehicle-alto.png" alt="Car" className="w-[80%] h-auto object-contain" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-black rounded-full"></div>
                                        <span className="text-[12px] font-[600] text-[#111]">Black Suzuki Alto (BKG-220)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
                {activeTab === 'driver' && (
                    <DriverAnalytics
                        bookingTrends={filterDataByDateRange(analytics?.booking_trends)}
                    />
                )}
                {activeTab === 'passenger' && (
                    <PassengerAnalytics
                        passengerGrowth={filterDataByDateRange(analytics?.passenger_growth)}
                    />
                )}
                {activeTab === 'ride' && (
                    <RideAnalytics
                        bookingTrends={filterDataByDateRange(analytics?.booking_trends)}
                    />
                )}
                {activeTab === 'financial' && (
                    <FinancialAnalytics
                        bookingTrends={filterDataByDateRange(analytics?.booking_trends)}
                    />
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 0.4s ease-out; }
                .react-datepicker-wrapper { display: block; }
                .react-datepicker__input-container input { width: 100%; border: none; background: transparent; }
                .react-datepicker-popper { z-index: 9999 !important; }
                .react-datepicker {
                    border: 1.5px solid #D10000 !important;
                    border-radius: 20px !important;
                    overflow: hidden;
                    font-family: inherit !important;
                    box-shadow: 0 10px 30px rgba(209,0,0,0.15) !important;
                }
                .react-datepicker__header {
                    background-color: #D10000 !important;
                    border-bottom: none !important;
                    padding-top: 15px !important;
                }
                .react-datepicker__navigation {
                    top: 15px !important;
                }
                .react-datepicker__current-month {
                    color: white !important;
                    font-weight: 700 !important;
                    font-size: 15px !important;
                    margin-bottom: 8px !important;
                }
                .react-datepicker__day-name {
                    color: #111 !important;
                    font-weight: 700 !important;
                }
                .react-datepicker__day--selected, .react-datepicker__day--keyboard-selected {
                    background-color: #D10000 !important;
                    color: white !important;
                    border-radius: 8px !important;
                }
                .react-datepicker__day--selected:hover, .react-datepicker__day--keyboard-selected:hover {
                    background-color: #D10000 !important;
                    color: white !important;
                }
                .react-datepicker__day:not(.react-datepicker__day--selected):not(.react-datepicker__day--keyboard-selected):hover {
                    background-color: #FFF1F1 !important;
                    border-radius: 8px !important;
                }
                .react-datepicker__navigation-icon::before {
                    border-color: white !important;
                }
            ` }} />
        </AdminLayout >
    );
}

// Driver Analytics Component with Real Data
function DriverAnalytics({ bookingTrends }) {
    const [period, setPeriod] = useState('This Week');

    // Transform booking trends for chart display
    const chartData = useMemo(() => {
        if (!bookingTrends || bookingTrends.length === 0) return [];

        return bookingTrends.map(item => ({
            name: format(parseISO(item.date), 'MMM dd'),
            hours: item.total // Using bookings count as hours for demo
        }));
    }, [bookingTrends]);

    return (
        <div className="space-y-5">
            <div className="bg-[#FF161F1A] rounded-[30px] p-8 mb-4 border border-[#FEE2E2] relative overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0 items-center relative z-10">
                    {[
                        {
                            label: 'Total Bookings',
                            value: bookingTrends?.reduce((sum, item) => sum + item.total, 0) || 0,
                            icon: 'bi-car-front-fill'
                        },
                        {
                            label: 'Peak Day',
                            value: bookingTrends?.length > 0
                                ? format(parseISO(bookingTrends.reduce((max, item) =>
                                    item.total > max.total ? item : max
                                ).date), 'MMM dd')
                                : 'N/A',
                            icon: 'bi-calendar-heart-fill'
                        }
                    ].map((kpi, i) => (
                        <div key={i} className={`flex items-center gap-4 px-6 ${i === 0 ? 'border-r-2 border-[#D10000]' : ''}`}>
                            <div className="w-[64px] h-[64px] rounded-full bg-white shadow-[0_8px_30px_rgba(209,0,0,0.08)] flex items-center justify-center shrink-0">
                                <i className={`bi ${kpi.icon} text-[26px] text-[#D10000]`}></i>
                            </div>
                            <div>
                                <p className="text-[14px] font-[600] text-[#6B7280] mb-0.5">{kpi.label}</p>
                                <h3 className="text-[32px] font-[600] text-[#111] leading-none tracking-tight">{kpi.value}</h3>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3 bg-white border-[1.5px] border-[#666]/10 rounded-[30px] p-6 shadow-sm">
                    <ModuleHeader title="Booking Trends" period={period} onPeriodChange={(e) => setPeriod(e.target.value)} />
                    <div className="h-[300px] w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }} />
                                <Tooltip cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="hours" fill="#3B82F6" radius={[8, 8, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white border-[1.5px] border-[#666]/10 rounded-[30px] p-6 shadow-sm relative flex flex-col">
                    <h4 className="text-[18px] font-[600] text-[#111] mb-6">Booking Summary</h4>
                    <div className="flex-1 flex flex-col justify-between">
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-8 h-2.5 bg-[#3B82F6] rounded-full"></div>
                                <span className="text-[13px] font-[600] text-[#6B7280]">
                                    Total Bookings <span className="text-[#D10000]">{bookingTrends?.reduce((sum, item) => sum + item.total, 0) || 0}</span>
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-8 h-2.5 bg-[#EC4899] rounded-full"></div>
                                <span className="text-[13px] font-[600] text-[#6B7280]">
                                    Total Days <span className="text-[#10B981]}">{bookingTrends?.length || 0}</span>
                                </span>
                            </div>
                        </div>
                        <div className="h-[200px] w-full self-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={[
                                        {
                                            name: 'Avg Daily', value: bookingTrends?.length > 0
                                                ? Math.round(bookingTrends.reduce((sum, item) => sum + item.total, 0) / bookingTrends.length)
                                                : 0, color: '#3B82F6'
                                        }
                                    ]} innerRadius={60} outerRadius={85} dataKey="value" stroke="none">
                                        <Cell fill="#3B82F6" />
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '10px', border: 'none' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Passenger Analytics with Real Data
function PassengerAnalytics({ passengerGrowth }) {
    const [period, setPeriod] = useState('This Week');

    const chartData = useMemo(() => {
        if (!passengerGrowth || passengerGrowth.length === 0) return [];

        return passengerGrowth.map(item => ({
            name: format(parseISO(item.date), 'MMM dd'),
            oneTime: item.total,
            repeat: Math.floor(item.total * 0.6) // Example split - adjust based on your actual data
        }));
    }, [passengerGrowth]);

    const totalPassengers = passengerGrowth?.reduce((sum, item) => sum + item.total, 0) || 0;
    const avgGrowth = passengerGrowth?.length > 0
        ? Math.round(totalPassengers / passengerGrowth.length)
        : 0;

    return (
        <div className="space-y-5">
            <div className="bg-[#FF161F1A] rounded-[30px] p-8 mb-4 border border-[#FEE2E2] relative overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0 items-center relative z-10">
                    {[
                        {
                            label: 'Total Passengers (All Time)',
                            value: totalPassengers,
                            icon: 'bi-people-fill'
                        },
                        {
                            label: 'Average Daily Growth',
                            value: avgGrowth,
                            icon: 'bi-graph-up-arrow'
                        }
                    ].map((kpi, i) => (
                        <div key={i} className={`flex items-center gap-4 px-6 ${i === 0 ? 'border-r-2 border-[#D10000]' : ''}`}>
                            <div className="w-[64px] h-[64px] rounded-full bg-white shadow-[0_8px_30px_rgba(209,0,0,0.08)] flex items-center justify-center shrink-0">
                                <i className={`bi ${kpi.icon} text-[26px] text-[#D10000]`}></i>
                            </div>
                            <div>
                                <p className="text-[14px] font-[600] text-[#6B7280] mb-0.5">{kpi.label}</p>
                                <h3 className="text-[32px] font-[600] text-[#111] leading-none tracking-tight">{kpi.value}</h3>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3 bg-white border-[1.5px] border-[#666]/10 rounded-[30px] p-6 shadow-sm">
                    <ModuleHeader title="Passenger Growth Over Time" period={period} onPeriodChange={(e) => setPeriod(e.target.value)} />
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="oneTime" stroke="#3B82F6" strokeWidth={4} fillOpacity={0.1} fill="#3B82F6" />
                                <Area type="monotone" dataKey="repeat" stroke="#10B981" strokeWidth={4} fillOpacity={0.1} fill="#10B981" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white border-[1.5px] border-[#666]/10 rounded-[30px] p-6 shadow-sm relative flex flex-col">
                    <h4 className="text-[18px] font-[600] text-[#111] mb-6">Growth Statistics</h4>
                    <div className="flex-1 flex flex-col justify-between">
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-8 h-2.5 bg-[#3B82F6] rounded-full"></div>
                                <span className="text-[13px] font-[600] text-[#6B7280]">
                                    Total Passengers <span className="text-[#D10000]">{totalPassengers}</span>
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-8 h-2.5 bg-[#EC4899] rounded-full"></div>
                                <span className="text-[13px] font-[600] text-[#6B7280]">
                                    Record Date <span className="text-[#10B981]}">
                                        {passengerGrowth?.length > 0
                                            ? format(parseISO(passengerGrowth.reduce((max, item) =>
                                                item.total > max.total ? item : max
                                            ).date), 'MMM dd, yyyy')
                                            : 'N/A'}
                                    </span>
                                </span>
                            </div>
                        </div>
                        <div className="h-[200px] w-full self-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={[{ v: passengerGrowth?.length || 0, c: '#EC4899' }]} innerRadius={55} outerRadius={80} dataKey="v" stroke="none">
                                        <Cell fill="#EC4899" />
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Ride Analytics with Real Data
function RideAnalytics({ bookingTrends }) {
    const [period, setPeriod] = useState('This Week');

    const chartData = useMemo(() => {
        if (!bookingTrends || bookingTrends.length === 0) return [];

        return bookingTrends.map(item => ({
            name: format(parseISO(item.date), 'MMM dd'),
            volume: item.total
        }));
    }, [bookingTrends]);

    const totalRides = bookingTrends?.reduce((sum, item) => sum + item.total, 0) || 0;
    const avgRides = bookingTrends?.length > 0 ? Math.round(totalRides / bookingTrends.length) : 0;

    return (
        <div className="space-y-5">
            <div className="bg-[#FF161F1A] rounded-[30px] p-8 mb-4 border border-[#FEE2E2] relative overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-0 items-center relative z-10">
                    {[
                        { label: 'Total Rides', value: totalRides, icon: 'bi-car-front-fill' },
                        { label: 'Average Daily', value: avgRides, icon: 'bi-calendar-check-fill' },
                        {
                            label: 'Peak Day Volume', value: bookingTrends?.length > 0
                                ? Math.max(...bookingTrends.map(item => item.total))
                                : 0,
                            icon: 'bi-graph-up-arrow'
                        },
                    ].map((kpi, i) => (
                        <div key={i} className={`flex items-center gap-4 px-6 ${i < 2 ? 'border-r-2 border-[#D10000]' : ''}`}>
                            <div className="w-[64px] h-[64px] rounded-full bg-white shadow-[0_8px_30px_rgba(209,0,0,0.08)] flex items-center justify-center shrink-0">
                                <i className={`bi ${kpi.icon} text-[26px] text-[#D10000]`}></i>
                            </div>
                            <div>
                                <p className="text-[14px] font-[600] text-[#6B7280] mb-0.5">{kpi.label}</p>
                                <h3 className="text-[32px] font-[600] text-[#111] leading-none tracking-tight">{kpi.value}</h3>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3 bg-white border-[1.5px] border-[#666]/10 rounded-[30px] p-6 shadow-sm">
                    <ModuleHeader title="Ride Volume Over Time" period={period} onPeriodChange={(e) => setPeriod(e.target.value)} />
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorVolumeR" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#D10000" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#D10000" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="volume" stroke="#D10000" strokeWidth={4} fillOpacity={1} fill="url(#colorVolumeR)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-3">
                    <div className="bg-white border-[1.5px] border-[#666]/10 rounded-[30px] p-6 shadow-sm">
                        <h4 className="text-[18px] font-[600] text-[#111] mb-6">Ride Statistics</h4>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#FFF1F1] flex items-center justify-center text-[#D10000]">
                                    <i className="bi bi-calendar-week text-[18px]"></i>
                                </div>
                                <span className="text-[15px] font-[600] text-[#111]">
                                    Total Days: {bookingTrends?.length || 0}
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#FFF1F1] flex items-center justify-center text-[#D10000]">
                                    <i className="bi bi-trophy-fill text-[18px]"></i>
                                </div>
                                <span className="text-[15px] font-[600] text-[#111]">
                                    Highest: {bookingTrends?.length > 0
                                        ? Math.max(...bookingTrends.map(item => item.total))
                                        : 0} rides/day
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white border-[1.5px] border-[#666]/10 rounded-[30px] p-6 shadow-sm">
                        <h4 className="text-[18px] font-[600] text-[#111] mb-6">Period Summary</h4>
                        <div className="space-y-5">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-[12px] font-[600] text-[#6B7280] uppercase">Total Rides</span>
                                    <span className="text-[12px] font-[600] text-[#111]">{totalRides}</span>
                                </div>
                                <div className="w-full h-2.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min((totalRides / (totalRides + 100)) * 100, 100)}%` }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-[12px] font-[600] text-[#6B7280] uppercase">Avg Daily</span>
                                    <span className="text-[12px] font-[600] text-[#111]">{avgRides}</span>
                                </div>
                                <div className="w-full h-2.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                                    <div className="h-full bg-[#D10000] rounded-full" style={{ width: `${Math.min((avgRides / 100) * 100, 100)}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Financial Analytics with Real Data
function FinancialAnalytics({ bookingTrends }) {
    const [period, setPeriod] = useState('This Week');

    const chartData = useMemo(() => {
        if (!bookingTrends || bookingTrends.length === 0) return [];

        // Example: Calculate revenue based on bookings (e.g., $50 per booking)
        return bookingTrends.map(item => ({
            name: format(parseISO(item.date), 'MMM dd'),
            amount: item.total * 50
        }));
    }, [bookingTrends]);

    const totalRevenue = chartData.reduce((sum, item) => sum + item.amount, 0);
    const totalBookings = bookingTrends?.reduce((sum, item) => sum + item.total, 0) || 0;

    return (
        <div className="space-y-5">
            <div className="bg-[#FF161F1A] rounded-[30px] p-8 mb-4 border border-[#FEE2E2] relative overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0 items-center relative z-10">
                    {[
                        {
                            label: 'Total Revenue',
                            value: `$${totalRevenue.toLocaleString()}`,
                            icon: 'bi-currency-dollar'
                        },
                        {
                            label: 'Avg Per Day',
                            value: `$${bookingTrends?.length > 0 ? Math.round(totalRevenue / bookingTrends.length).toLocaleString() : 0}`,
                            icon: 'bi-graph-up-arrow'
                        }
                    ].map((kpi, i) => (
                        <div key={i} className={`flex items-center gap-4 px-6 ${i === 0 ? 'border-r-2 border-[#D10000]' : ''}`}>
                            <div className="w-[64px] h-[64px] rounded-full bg-white shadow-[0_8px_30px_rgba(209,0,0,0.08)] flex items-center justify-center shrink-0">
                                <i className={`bi ${kpi.icon} text-[26px] text-[#D10000]`}></i>
                            </div>
                            <div>
                                <p className="text-[14px] font-[600] text-[#6B7280] mb-0.5">{kpi.label}</p>
                                <h3 className="text-[32px] font-[600] text-[#111] leading-none tracking-tight">{kpi.value}</h3>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3 bg-white border-[1.5px] border-[#666]/10 rounded-[30px] p-6 shadow-sm">
                    <ModuleHeader title="Revenue Trend" period={period} onPeriodChange={(e) => setPeriod(e.target.value)} />
                    <div className="h-[300px] w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                                    formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']}
                                />
                                <Line type="monotone" dataKey="amount" stroke="#D10000" strokeWidth={5} dot={{ r: 6, fill: '#D10000', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white border-[1.5px] border-[#666]/10 rounded-[30px] p-6 shadow-sm flex flex-col">
                    <h4 className="text-[18px] font-[600] text-[#111] mb-6">Revenue Summary</h4>
                    <div className="flex-1 flex flex-col justify-between">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-[#D10000]"></div>
                                <span className="text-[13px] font-[600] text-[#6B7280]">
                                    Total Revenue <span className="text-[#111]">${totalRevenue.toLocaleString()}</span>
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-[#F87171]"></div>
                                <span className="text-[13px] font-[600] text-[#6B7280]">
                                    Total Bookings <span className="text-[#111]">{totalBookings}</span>
                                </span>
                            </div>
                        </div>
                        <div className="h-[200px] w-full self-end mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={[{ value: totalRevenue, color: '#D10000' }]} innerRadius={55} outerRadius={80} dataKey="value" stroke="none">
                                        <Cell fill="#D10000" />
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '10px', border: 'none' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper Components
function ModuleHeader({ title, period, onPeriodChange }) {
    return (
        <div className="flex justify-between items-center mb-6">
            <h4 className="text-[18px] font-[600] text-[#111]">{title}</h4>
            <div className="relative">
                <select
                    value={period}
                    onChange={onPeriodChange}
                    className="border-[1.5px] border-[#666]/20 rounded-full px-5 py-2 text-[12px] font-[600] text-[#111] outline-none bg-white appearance-none pr-10 hover:border-[#D10000] cursor-pointer"
                >
                    <option>Today</option>
                    <option>This Week</option>
                    <option>This Month</option>
                    <option>This Year</option>
                </select>
                <i className="bi bi-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[#D10000] text-[10px] pointer-events-none"></i>
            </div>
        </div>
    );
}