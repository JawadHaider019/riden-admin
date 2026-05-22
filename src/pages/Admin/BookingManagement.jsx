import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import AdminLayout from '@/layouts/AdminLayout';
import { Table, Badge, SearchBar, Tabs, DateRangePicker, DatePickerStyles, Button, useToast, Pagination, Tooltip, Loader } from '@/components/UI';
import { useNavigate } from 'react-router-dom';
import { startOfWeek } from 'date-fns';
import { getBookings } from '@/api/bookingApi';
import { getVehicleDetail } from '@/api/vehicleApi';
import { reverseGeocode } from '@/utils/geoUtils';
import { exportToCSV, exportToExcel, exportToPDF } from '@/utils/exportUtils';

export default function BookingManagement() {
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [type, setType] = useState('requested');
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');

    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [exportOpen, setExportOpen] = useState(false);
    const [statusCounts, setStatusCounts] = useState({
        ongoing: 0,
        requested: 0,
        accepted: 0,
        arrived: 0,
        completed: 0,
        cancelled: 0
    });

    const fetchCounts = async () => {
        try {
            // Fetch batch to count locally
            const res = await getBookings({ limit: 1000 });
            // Reset counts to zero
            const counts = { ongoing: 0, requested: 0, accepted: 0, arrived: 0, completed: 0, cancelled: 0 };
            const groupedIds = { ongoing: [], requested: [], accepted: [], arrived: [], completed: [], cancelled: [] };

            // Deep extract list or single object
            let list = [];
            if (Array.isArray(res)) {
                list = res;
            } else if (res?.data) {
                if (Array.isArray(res.data)) {
                    list = res.data;
                } else if (res.data?.data && Array.isArray(res.data.data)) {
                    list = res.data.data;
                } else if (res.data?.id) {
                    console.log("DEBUG: Detected single booking object (ID:", res.data.id, ")");
                    list = [res.data];
                }
            }

            console.log("DEBUG: fetchCounts final list size:", list.length);

            const cancelledStatuses = ['cancelled', 'rejected', 'failed', 'danger', 'expired'];

            list.forEach(b => {
                const s = b.status?.toLowerCase() || 'unknown';
                let category = null;

                if (s === 'ongoing') category = 'ongoing';
                else if (s === 'requested' || s === 'pending') category = 'requested';
                else if (s === 'accepted') category = 'accepted';
                else if (s === 'arrived') category = 'arrived';
                else if (s === 'completed' || s === 'success') category = 'completed';
                else if (cancelledStatuses.includes(s)) category = 'cancelled';

                if (category) {
                    counts[category]++;
                    groupedIds[category].push({ id: b.id, rawStatus: b.status });
                }
            });

            console.log("DEBUG: Final Calculated Counts:", counts);
            console.log("DEBUG: Grouped IDs by Tab:", groupedIds);
            setStatusCounts(counts);
        } catch (error) {
            console.error("Error fetching booking counts:", error);
        }
    };
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

            // Map frontend type to backend status filter
            if (type === 'requested') params.status = 'Requested';
            else if (type === 'accepted') params.status = 'Accepted';
            else if (type === 'arrived') params.status = 'Arrived';
            else if (type === 'ongoing') params.status = 'Ongoing';
            else if (type === 'completed') params.status = 'Completed';
            else if (type === 'cancelled') params.status = 'Cancelled';

            if (searchTerm.trim() !== '') {
                params.search = searchTerm.trim();
            }

            if (startDate) {
                params.start_date = format(startDate, 'yyyy-MM-dd');
            }
            if (endDate) {
                params.end_date = format(endDate, 'yyyy-MM-dd');
            }

            console.log("DEBUG: Fetching bookings with params:", params);
            const res = await getBookings(params);
            console.log("DEBUG: Booking API Raw Response:", res);

            let list = [];

            // Comprehensive extraction logic
            const extract = (data) => {
                if (Array.isArray(data)) return data;
                // Handle objects with numeric keys (PHP objects)
                if (data && typeof data === 'object' && Object.keys(data).some(k => !isNaN(k))) {
                    return Object.values(data);
                }
                // Handle single object response
                if (data && typeof data === 'object' && (data.id || data.unique_id)) {
                    return [data];
                }
                return null;
            };

            const potentialSources = [
                res?.data?.data?.data, // Heavily nested pagination
                res?.data?.data,      // Standard pagination
                res?.data,           // Direct data key
                res?.bookings,       // Custom key
                res?.rides,          // Custom key
                res                  // Raw response
            ];

            for (const source of potentialSources) {
                const found = extract(source);
                if (found) {
                    list = found;
                    break;
                }
            }

            console.log("DEBUG: Extracted Bookings List:", list);

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
            console.log("DEBUG: Bookings state updated. Count:", list.length);

            // Resolve data in background (Addresses & Vehicles)
            if (list.length > 0) {
                const resolveData = async () => {
                    const vehicleCache = {}; // Cache to avoid multiple calls for same vehicle in the same page
                    const updatedList = await Promise.all(list.map(async (b) => {
                        // 1. Resolve Addresses
                        const pickupAddr = b.pickup_location || await reverseGeocode(b.pickup_lat, b.pickup_lng);
                        const dropoffAddr = b.dropoff_location || await reverseGeocode(b.dropoff_lat, b.dropoff_lng);

                        // 2. Resolve Vehicle Info if missing but ID exists
                        let vehicleInfo = b.vehicle || b.driver?.vehicle;
                        if (!vehicleInfo && b.vehicle_id) {
                            if (vehicleCache[b.vehicle_id]) {
                                vehicleInfo = vehicleCache[b.vehicle_id];
                            } else {
                                console.log("DEBUG: Fetching details for vehicle ID:", b.vehicle_id);
                                try {
                                    const vRes = await getVehicleDetail(b.vehicle_id);
                                    vehicleInfo = vRes.data || vRes;
                                    vehicleCache[b.vehicle_id] = vehicleInfo;
                                } catch (err) {
                                    console.error(`DEBUG: Failed to fetch vehicle ${b.vehicle_id}`, err);
                                }
                            }
                        }

                        return {
                            ...b,
                            pickup_location: pickupAddr,
                            dropoff_location: dropoffAddr,
                            vehicle: vehicleInfo
                        };
                    }));
                    setBookings(updatedList);
                };
                resolveData();
            }

            const total = list.length;
            setTotalItems(total);
        } catch (error) {
            console.error("DEBUG: Error fetching bookings:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [type, searchTerm, startDate, endDate]);

    useEffect(() => {
        const delay = setTimeout(() => {
            fetchBookings();
        }, 300);
        return () => clearTimeout(delay);
    }, [currentPage, searchTerm, startDate, endDate, type]);

    useEffect(() => {
        fetchCounts();
    }, []);

    const filteredBookings = bookings.filter(b => {
        const s = b.status?.toLowerCase();
        const cancelledStatuses = ['cancelled', 'rejected', 'failed', 'danger', 'expired'];

        if (type === 'ongoing') return s === 'ongoing';
        if (type === 'requested') return s === 'requested' || s === 'pending';
        if (type === 'accepted') return s === 'accepted';
        if (type === 'arrived') return s === 'arrived';
        if (type === 'completed') return s === 'completed' || s === 'success';
        if (type === 'cancelled') return cancelledStatuses.includes(s);
        return false;
    });

    console.log(`DEBUG: Tab: ${type}, Filtered Bookings for Render:`, filteredBookings);

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
                const s = b.status?.toLowerCase();
                const cancelledStatuses = ['cancelled', 'rejected', 'failed', 'danger', 'expired'];
                if (type === 'ongoing') return s === 'ongoing';
                if (type === 'requested') return s === 'requested' || s === 'pending';
                if (type === 'accepted') return s === 'accepted';
                if (type === 'arrived') return s === 'arrived';
                if (type === 'completed') return s === 'completed' || s === 'success';
                if (type === 'cancelled') return cancelledStatuses.includes(s);
                return false;
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
                `C$ ${b.fare || '0'}`,
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
                    { id: 'ongoing', label: 'Ongoing', count: statusCounts.ongoing },
                    { id: 'requested', label: 'Requested', count: statusCounts.requested },
                    { id: 'accepted', label: 'Accepted', count: statusCounts.accepted },
                    { id: 'arrived', label: 'Arrived', count: statusCounts.arrived },
                    { id: 'completed', label: 'Completed', count: statusCounts.completed },
                    { id: 'cancelled', label: 'Cancelled', count: statusCounts.cancelled }
                ]}
            />

            {/* Table */}
            <Table headers={[
                { label: 'ID', align: 'text-center' },
                ...(type !== 'requested' ? [{ label: 'Driver', align: 'text-center' }] : []),
                { label: 'Passenger', align: 'text-center' },
                { label: type === 'requested' ? 'Requested Vehicle' : 'Vehicle', align: 'text-center' },
                { label: 'Fare', align: 'text-center' },
                { label: 'Pickup Location', align: 'text-center' },
                { label: 'Dropoff Location', align: 'text-center' },
                { label: 'Distance', align: 'text-center' },
                { label: 'Duration', align: 'text-center' }
            ].filter(Boolean)}>

                {loading ? (
                    <tr>
                        <td colSpan={type === 'requested' ? 8 : 9} className="py-20 text-center">
                            <Loader fullScreen={false} />
                        </td>
                    </tr>
                ) : filteredBookings.length === 0 ? (
                    <tr>
                        <td colSpan={type === 'requested' ? 8 : 9} className="text-center py-8 text-gray-500">
                            No bookings found
                        </td>
                    </tr>
                ) : (
                    filteredBookings.map((booking) => (
                        <tr
                            key={booking.id}
                            onClick={() => navigate(`/bookings/detail/${booking.id}`)}
                            className="group cursor-pointer hover:bg-black/[0.02] transition-colors border-b border-[#F3F4F6]"
                        >
                            <td className="py-[18px] px-[10px] text-center">
                                <span className="text-[13px] font-[600] text-[#111] tracking-tight">
                                    {booking.id}
                                </span>
                            </td>

                            {type !== 'requested' && (
                                <td className="py-[18px] px-[10px] text-[14px] font-[600] text-[#D10000] text-center whitespace-nowrap">
                                    {booking.driver ? (
                                        <Tooltip content={
                                            <div className="flex flex-col gap-1 py-1">
                                                <div className="flex items-center gap-2"><i className="bi bi-person text-[#D10000]"></i> <span>ID: {booking.driver.id}</span></div>
                                                <div className="flex items-center gap-2"><i className="bi bi-telephone text-[#D10000]"></i> <span>{booking.driver.phone || 'N/A'}</span></div>
                                                <div className="flex items-center gap-2"><i className="bi bi-envelope text-[#D10000]"></i> <span className="lowercase">{booking.driver.email || 'N/A'}</span></div>
                                            </div>
                                        }>
                                            <span className="hover:text-[#D10000] cursor-help">
                                                {booking.driver?.first_name ? `${booking.driver.first_name} ${booking.driver.last_name || ''}` : 'Not Assigned'}
                                            </span>
                                        </Tooltip>
                                    ) : 'Not Assigned'}
                                </td>
                            )}

                            <td className="py-[18px] px-[10px] text-[14px] font-[600] text-[#D10000] text-center whitespace-nowrap">
                                {booking.passenger ? (
                                    <Tooltip content={
                                        <div className="flex flex-col gap-1 py-1">
                                            <div className="flex items-center gap-2"><i className="bi bi-person text-[#D10000]"></i> <span>ID: {booking.passenger.id}</span></div>
                                            <div className="flex items-center gap-2"><i className="bi bi-telephone text-[#D10000]"></i> <span>{booking.passenger.phone || 'N/A'}</span></div>
                                            <div className="flex items-center gap-2"><i className="bi bi-envelope text-[#D10000]"></i> <span className="lowercase">{booking.passenger.email || 'N/A'}</span></div>
                                        </div>
                                    }>
                                        <span className="hover:text-[#D10000] cursor-help">
                                            {booking.passenger?.name || (booking.passenger?.first_name ? `${booking.passenger.first_name} ${booking.passenger.last_name || ''}` : 'N/A')}
                                        </span>
                                    </Tooltip>
                                ) : 'N/A'}
                            </td>

                            <td className="py-[18px] px-[10px] text-[14px] font-[600] text-[#D10000] text-center whitespace-nowrap">
                                <Tooltip content={
                                    <div className="flex flex-col gap-1 py-1 min-w-[200px]">
                                        {type === 'requested' ? (
                                            <>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <i className="bi bi-hash text-[#D10000]"></i>
                                                    <span>Type ID: {booking.requested_vehicle_type?.id || 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <i className="bi bi-people-fill text-[#D10000]"></i>
                                                    <span>Capacity: {booking.requested_vehicle_type?.capacity || 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <i className="bi bi-info-circle text-[#D10000]"></i>
                                                    <span className="break-words">Details: {booking.requested_vehicle_type?.car_details || 'N/A'}</span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <i className="bi bi-hash text-[#D10000]"></i>
                                                    <span>ID: {booking.vehicle?.id || booking.vehicle_id || 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <i className="bi bi-tag-fill text-[#D10000]"></i>
                                                    <span>Plate: {booking.vehicle?.license_plate || booking.driver?.vehicle?.license_plate || 'N/A'}</span>
                                                </div>

                                                <div className="flex items-center gap-2 text-xs">
                                                    <i className="bi bi-people-fill text-[#D10000]"></i>
                                                    <span>
                                                        Seats: {(() => {
                                                            const val = booking.vehicle?.capacity || booking.vehicle?.seats || 'N/A';
                                                            return typeof val === 'object' ? (val?.capacity || val?.name || 'N/A') : val;
                                                        })()}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <i className="bi bi-gear-fill text-[#D10000]"></i>
                                                    <span>
                                                        Type: {(() => {
                                                            const val = booking.vehicle?.type || booking.vehicle?.category || 'N/A';
                                                            return typeof val === 'object' ? (val?.category || val?.name || 'N/A') : val;
                                                        })()}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                }>
                                    <span className="hover:text-[#D10000] cursor-help font-semibold">
                                        {type === 'requested'
                                            ? (booking.requested_vehicle_type?.category || 'Any')
                                            : (booking.vehicle?.model || booking.driver?.vehicle?.model || `${booking.vehicle_id || 'N/A'}`)}
                                    </span>
                                </Tooltip>
                            </td>

                            <td className="py-[18px] px-[10px] text-[14px] font-[600] text-[#111] text-center whitespace-nowrap">
                                C$ {booking.fare || '0.00'}
                            </td>

                            <td className="py-[18px] px-[10px] text-[14px] font-[500] text-[#6B7280] text-center max-w-[200px] truncate" title={booking.pickup_location}>
                                {booking.pickup_location || (booking.pickup_lat ? `${parseFloat(booking.pickup_lat).toFixed(4)}, ${parseFloat(booking.pickup_lng).toFixed(4)}` : 'N/A')}
                            </td>

                            <td className="py-[18px] px-[10px] text-[14px] font-[500] text-[#6B7280] text-center max-w-[200px] truncate" title={booking.dropoff_location}>
                                {booking.dropoff_location || (booking.dropoff_lat ? `${parseFloat(booking.dropoff_lat).toFixed(4)}, ${parseFloat(booking.dropoff_lng).toFixed(4)}` : 'N/A')}
                            </td>

                            <td className="py-[18px] px-[10px] text-[14px] font-[500] text-[#6B7280] text-center whitespace-nowrap">
                                {(() => {
                                    const dist = booking.estimated_distance || booking.distance;
                                    if (!dist) return 'N/A';
                                    const numValue = parseFloat(dist);
                                    if (isNaN(numValue)) return dist;
                                    return `${numValue.toFixed(1)} km`;
                                })()}
                            </td>

                            <td className="py-[18px] px-[10px] text-[14px] font-[500] text-[#6B7280] text-center whitespace-nowrap relative">
                                {(() => {
                                    const duration = booking.estimated_time || booking.duration;
                                    if (!duration) return 'N/A';
                                    const durationStr = String(duration);

                                    // Handle HH:MM:SS format
                                    if (durationStr.includes(':')) {
                                        const parts = durationStr.split(':');
                                        if (parts.length === 3) {
                                            const h = parseInt(parts[0], 10);
                                            const m = parseInt(parts[1], 10);
                                            if (h > 0) return `${h} hr ${m} mins`;
                                            return `${m} mins`;
                                        }
                                    }

                                    if (durationStr.toLowerCase().includes('min') || durationStr.toLowerCase().includes('hour')) return duration;

                                    const numValue = parseFloat(durationStr);
                                    if (isNaN(numValue)) return duration;

                                    if (numValue >= 60) {
                                        return `${Math.floor(numValue / 60)} hr ${Math.round(numValue % 60)} mins`;
                                    }
                                    return `${Math.round(numValue)} mins`;
                                })()}
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-50 text-[#1D7E4D] opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:scale-110 shadow-sm border border-green-100">
                                        <i className="bi bi-eye-fill text-[15px]"></i>
                                    </span>
                                </div>
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