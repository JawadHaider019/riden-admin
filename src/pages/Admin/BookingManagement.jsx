import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import AdminLayout from '@/layouts/AdminLayout';
import { Table, Badge, SearchBar, Tabs, DateRangePicker, DatePickerStyles, Button, useToast, Pagination } from '@/components/UI';
import { useNavigate } from 'react-router-dom';
import { startOfWeek } from 'date-fns';
import { getBookings } from '@/api/bookingApi';
import { exportToCSV, exportToExcel, exportToPDF } from '@/utils/exportUtils';

export default function BookingManagement() {
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [type, setType] = useState('ongoing');
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');

    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [exportOpen, setExportOpen] = useState(false);
    const exportRef = useRef(null);

    // Click outside to close export dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (exportRef.current && !exportRef.current.contains(event.target)) {
                setExportOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchBookings = async () => {
        try {
            setLoading(true);

            const params = {
                page: currentPage
            };

            if (searchTerm.trim() !== '') {
                params.search = searchTerm.trim();
            }

            if (startDate) {
                params.start_date = format(startDate, 'yyyy-MM-dd');
            }
            if (endDate) {
                params.end_date = format(endDate, 'yyyy-MM-dd');
            }

            const res = await getBookings(params);

            let list = [];
            if (Array.isArray(res)) {
                list = res;
            } else if (res?.data && Array.isArray(res.data)) {
                list = res.data;
            } else if (res?.data?.data && Array.isArray(res.data.data)) {
                list = res.data.data;
            } else if (res?.data?.data?.data && Array.isArray(res.data.data.data)) {
                list = res.data.data.data;
            }

            // Apply local date filter in case backend ignores params
            if (startDate || endDate) {
                list = list.filter(b => {
                    const bDate = new Date(b.created_at || new Date());
                    bDate.setHours(0, 0, 0, 0);
                    let isMatch = true;
                    if (startDate) {
                        const sDate = new Date(startDate);
                        sDate.setHours(0, 0, 0, 0);
                        if (bDate < sDate) isMatch = false;
                    }
                    if (endDate) {
                        const eDate = new Date(endDate);
                        eDate.setHours(0, 0, 0, 0);
                        if (bDate > eDate) isMatch = false;
                    }
                    return isMatch;
                });
            }

            setBookings(list);

            const total = res?.total || res?.data?.total || res?.data?.data?.total || list.length;
            setTotalItems(total);

        } catch (error) {
            console.error("Error fetching bookings:", error);
            showToast(error.response?.data?.message || error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, [currentPage, searchTerm, startDate, endDate]);

    const filteredBookings = bookings.filter(b => {
        const ongoingStatuses = ['requested', 'accepted', 'arrived', 'ongoing', 'pending'];
        if (type === 'ongoing') {
            return ongoingStatuses.includes(b.status);
        } else {
            return !ongoingStatuses.includes(b.status);
        }
    });

    const handleExport = async (exportFormat) => {
        try {
            showToast("Preparing export data...", "info");

            const params = {
                limit: 1000,
                search: searchTerm.trim(),
                start_date: startDate ? format(startDate, 'yyyy-MM-dd') : null,
                end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null
            };

            const res = await getBookings(params);

            // Re-apply local filter if needed (matching original logic)
            let rawData = [];
            if (Array.isArray(res)) rawData = res;
            else if (res?.data?.data) rawData = res.data.data;
            else if (res?.data) rawData = res.data;

            let finalData = rawData.filter(b => {
                const ongoingStatuses = ['requested', 'accepted', 'arrived', 'ongoing', 'pending'];
                if (type === 'ongoing') return ongoingStatuses.includes(b.status);
                return !ongoingStatuses.includes(b.status);
            });

            if (startDate || endDate) {
                finalData = finalData.filter(b => {
                    const bDate = new Date(b.created_at || new Date());
                    bDate.setHours(0, 0, 0, 0);
                    let isMatch = true;
                    if (startDate) {
                        const sDate = new Date(startDate);
                        sDate.setHours(0, 0, 0, 0);
                        if (bDate < sDate) isMatch = false;
                    }
                    if (endDate) {
                        const eDate = new Date(endDate);
                        eDate.setHours(0, 0, 0, 0);
                        if (bDate > eDate) isMatch = false;
                    }
                    return isMatch;
                });
            }

            if (finalData.length === 0) {
                showToast("No bookings to export", "error");
                return;
            }

            const headers = ["ID", "Driver", "Passenger", "Fare", "Plate", "Pickup", "Dropoff", "Distance", "Status"];
            const formattedData = finalData.map(b => [
                b.id,
                b.driver?.name || (b.driver?.first_name ? `${b.driver.first_name} ${b.driver.last_name || ''}` : 'N/A'),
                b.passenger?.name || (b.passenger?.first_name ? `${b.passenger.first_name} ${b.passenger.last_name || ''}` : 'N/A'),
                `Rs ${b.fare || '0'}`,
                (b.vehicle?.license_plate || b.driver?.vehicle?.license_plate || 'N/A'),
                b.pickup_location || (b.pickup_lat ? `${b.pickup_lat}, ${b.pickup_lng}` : 'N/A'),
                b.dropoff_location || (b.dropoff_lat ? `${b.dropoff_lat}, ${b.dropoff_lng}` : 'N/A'),
                b.estimated_distance || b.distance || '0 km',
                b.status?.toUpperCase() || 'N/A'
            ]);

            const filename = `bookings_report_${type}_${new Date().toISOString().split('T')[0]}`;
            const title = `RIDEN | ${type.toUpperCase()} BOOKINGS REPORT`;

            if (exportFormat === 'csv') exportToCSV(formattedData, filename, headers);
            else if (exportFormat === 'xlsx') exportToExcel(formattedData, filename, headers);
            else if (exportFormat === 'pdf') exportToPDF(formattedData, filename, headers, title);

            showToast("Report generated successfully", "success");
        } catch (error) {
            console.error("Export Error:", error);
            showToast("Failed to generate report", "error");
        } finally {
            setExportOpen(false);
        }
    };

    return (
        <AdminLayout title="Booking Management">
            <DatePickerStyles />

            {/* Header Row */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
                <SearchBar
                    placeholder="Search by name, email, phone number"
                    className="w-full lg:w-[360px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />

                <div className="flex items-center gap-1 w-full lg:w-auto">


                    <DateRangePicker
                        startDate={startDate}
                        endDate={endDate}
                        onStartDateChange={setStartDate}
                        onEndDateChange={setEndDate}
                    />
                    <div className="relative" ref={exportRef}>
                        <button
                            onClick={() => setExportOpen(!exportOpen)}
                            className="flex rounded-full items-center gap-1 px-4 py-3 bg-white border border-[#E5E7EB] text-[13px] font-[600] text-[#111] hover:bg-gray-50 transition-all"
                        >
                            <i className="bi bi-file-earmark-excel-fill text-[#1D7E4D]"></i> Export
                            <i className={`bi bi-chevron-down text-[#1D7E4D] text-sm transition-all ${exportOpen ? 'rotate-180' : ''}`}></i>
                        </button>
                        {exportOpen && (
                            <div className="absolute right-0 mt-2 w-44 bg-white border border-[#E5E7EB] rounded-2xl shadow-lg overflow-hidden py-1 z-10 transition-all animate-fade-in">
                                <button
                                    onClick={() => handleExport('csv')}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-[13px] font-[600] text-[#111] border-b border-[#F3F4F6] transition-colors"
                                >
                                    <i className="bi bi-filetype-csv mr-2 text-[#1D7E4D]"></i> CSV Format
                                </button>
                                <button
                                    onClick={() => handleExport('pdf')}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-[13px] font-[600] text-[#111] transition-colors"
                                >
                                    <i className="bi bi-filetype-pdf mr-2 text-[#E72929]"></i> PDF Format
                                </button>
                                <button
                                    onClick={() => handleExport('xlsx')}
                                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-[13px] font-[600] text-[#111] transition-colors border-t border-[#F3F4F6]"
                                >
                                    <i className="bi bi-file-earmark-excel-fill mr-2 text-[#1D7E4D]"></i> Excel Format
                                </button>
                            </div>
                        )}
                    </div>


                </div>
            </div>

            {/* Tabs */}
            <Tabs
                activeTab={type}
                onTabChange={setType}
                options={[
                    { id: 'ongoing', label: 'Ongoing Bookings' },
                    { id: 'previous', label: 'Previous Bookings' }
                ]}
            />

            {/* Table */}
            <Table headers={[
                'ID',
                'Driver',
                'Passenger',
                { label: 'Fare', align: 'text-center' },
                { label: 'License Plate', align: 'text-center' },
                'Pickup Location',
                'Dropoff Location',
                { label: 'Distance', align: 'text-center' },
                { label: 'Duration', align: 'text-center' },
                { label: 'Status', align: 'text-center' }
            ]}>

                {loading ? (
                    <tr>
                        <td colSpan="10" className="text-center py-8">
                            <div className="animate-spin w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full mx-auto"></div>
                        </td>
                    </tr>
                ) : filteredBookings.length === 0 ? (
                    <tr>
                        <td colSpan="10" className="text-center py-8 text-gray-500">
                            No bookings found
                        </td>
                    </tr>
                ) : (
                    filteredBookings.map((booking) => (
                        <tr
                            key={booking.id}
                            onClick={() => navigate(`/bookings/detail/${booking.id}`)}
                            className="cursor-pointer hover:bg-black/[0.02] transition-colors border-b border-[#F3F4F6]"
                        >
                            <td className="py-[18px] px-[30px]">
                                <span className="text-[13px] font-[600] text-[#111] tracking-tight">
                                    {booking.id}
                                </span>
                            </td>

                            <td className="py-[18px] px-[30px] text-[14px] font-[600] text-[#6B7280] whitespace-nowrap">
                                {booking.driver?.first_name ? `${booking.driver.first_name} ${booking.driver.last_name || ''}` : 'Not Assigned'}
                            </td>

                            <td className="py-[18px] px-[10px] text-[14px] font-[600] text-[#6B7280] whitespace-nowrap">
                                {booking.passenger?.name || (booking.passenger?.first_name ? `${booking.passenger.first_name} ${booking.passenger.last_name || ''}` : 'N/A')}
                            </td>

                            <td className="py-[18px] px-[10px] text-[14px] font-[600] text-[#111] text-center whitespace-nowrap">
                                Rs {booking.fare || '0.00'}
                            </td>

                            <td className="py-[18px] px-[30px] text-center">
                                <span className="text-[14px] font-[600] text-[#D10000] border-b-2 border-dashed border-[#D10000]/30 pb-0.5">
                                    {(booking.vehicle?.license_plate || booking.driver?.vehicle?.license_plate || booking.vehicle_id || 'N/A')}
                                </span>
                            </td>

                            <td className="py-[18px] px-[30px] text-[14px] font-[500] text-[#6B7280]">
                                {booking.pickup_location || (booking.pickup_lat ? `${booking.pickup_lat}, ${booking.pickup_lng}` : 'N/A')}
                            </td>

                            <td className="py-[18px] px-[30px] text-[14px] font-[500] text-[#6B7280]">
                                {booking.dropoff_location || (booking.dropoff_lat ? `${booking.dropoff_lat}, ${booking.dropoff_lng}` : 'N/A')}
                            </td>

                            <td className="py-[18px] px-[30px] text-[14px] font-[500] text-[#6B7280] text-center whitespace-nowrap">
                                {(() => {
                                    const dist = booking.estimated_distance || booking.distance;
                                    if (!dist) return 'N/A';
                                    const distStr = String(dist).toLowerCase();
                                    if (distStr.includes('km') || distStr.includes('meter')) return dist;
                                    return `${distStr} km`;
                                })()}
                            </td>

                            <td className="py-[18px] px-[30px] text-[14px] font-[500] text-[#6B7280] text-center whitespace-nowrap">
                                {(() => {
                                    const duration = booking.estimated_time || booking.duration;
                                    if (!duration) return 'N/A';
                                    const durationStr = String(duration).toLowerCase();
                                    if (durationStr.includes('min') || durationStr.includes('hour')) return duration;

                                    const numValue = parseFloat(durationStr);
                                    if (isNaN(numValue)) return duration;

                                    if (numValue >= 60) {
                                        return `${Math.floor(numValue / 60)} hr ${Math.round(numValue % 60)} mins`;
                                    }
                                    return `${Math.round(numValue)} mins`;
                                })()}
                            </td>

                            <td className="py-[18px] px-[30px] text-center">
                                <Badge variant={booking.status}>
                                    {booking.status}
                                </Badge>
                            </td>
                        </tr>
                    ))
                )}
            </Table>

            <div className="mt-6">
                {(type === 'ongoing' || filteredBookings.length > 0 || currentPage > 1) && (
                    <Pagination
                        totalItems={type === 'previous' && filteredBookings.length < 10 && currentPage === 1 ? filteredBookings.length : totalItems}
                        currentPage={currentPage}
                        onPageChange={setCurrentPage}
                    />
                )}
            </div>
        </AdminLayout>
    );
}