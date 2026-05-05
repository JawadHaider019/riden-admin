import React, { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { Table, Badge, SearchBar, Tabs, DateRangePicker, DatePickerStyles, Button, useToast, Pagination } from '@/components/UI';
import { useNavigate } from 'react-router-dom';
import { startOfWeek } from 'date-fns';
import { getBookings } from '@/api/bookingApi';

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

    const fetchBookings = async () => {
        try {
            setLoading(true);

            const params = {
                page: currentPage
            };

            if (searchTerm.trim() !== '') {
                params.search = searchTerm.trim();
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
    }, [currentPage, searchTerm]);

    // ✅ FILTER based on status (since backend not separated)
    const filteredBookings = bookings.filter(b => {
        if (type === 'ongoing') {
            return b.status === 'pending';
        } else {
            return b.status !== 'pending';
        }
    });

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
                    <Button variant="pill" className="flex-1 lg:flex-none" onClick={() => navigate('/bookings/create')}>
                        <i className="bi bi-person-plus-fill"></i> Add Booking
                    </Button>


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
                                <span className="text-[13px] font-[700] text-[#111] tracking-tight">
                                    {booking.id}
                                </span>
                            </td>

                            <td className="py-[18px] px-[30px] text-[14px] font-[600] text-[#6B7280] whitespace-nowrap">
                                {booking.driver?.first_name ? `${booking.driver.first_name} ${booking.driver.last_name || ''}` : 'Not Assigned'}
                            </td>

                            <td className="py-[18px] px-[10px] text-[14px] font-[600] text-[#6B7280] whitespace-nowrap">
                                {booking.passenger?.first_name} {booking.passenger?.last_name}
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
                                {booking.pickup_location}
                            </td>

                            <td className="py-[18px] px-[30px] text-[14px] font-[500] text-[#6B7280]">
                                {booking.dropoff_location}
                            </td>

                            <td className="py-[18px] px-[30px] text-[14px] font-[500] text-[#6B7280] text-center whitespace-nowrap">
                                {(() => {
                                    if (!booking.distance) return 'N/A';
                                    const distStr = String(booking.distance).toLowerCase();
                                    if (distStr.includes('km') || distStr.includes('meter')) return booking.distance;
                                    return `${distStr} km`;
                                })()}
                            </td>

                            <td className="py-[18px] px-[30px] text-[14px] font-[500] text-[#6B7280] text-center whitespace-nowrap">
                                {(() => {
                                    if (!booking.duration) return 'N/A';
                                    const durationStr = String(booking.duration).toLowerCase();
                                    if (durationStr.includes('min') || durationStr.includes('hour')) return booking.duration;

                                    const numValue = parseFloat(durationStr);
                                    if (isNaN(numValue)) return booking.duration;

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