import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import AdminLayout from '@/layouts/AdminLayout';
import { Table, Badge, Button, SearchBar, Pagination, useToast, DateRangePicker, DatePickerStyles, Tooltip, Loader } from '@/components/UI';
import { useNavigate } from 'react-router-dom';
import { getVehicles } from '@/api/vehicleApi';
import { getDrivers } from '@/api/driverApi';
import { STORAGE_URL, getImageUrl } from '@/api/api';
import { exportToCSV, exportToExcel, exportToPDF } from '@/utils/exportUtils';

export default function VehicleManagement() {
    const [exportOpen, setExportOpen] = useState(false);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [totalItems, setTotalItems] = useState(0);
    const { showToast } = useToast();
    const [driverMap, setDriverMap] = useState({});
    const navigate = useNavigate();
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

    const fetchVehicles = async () => {
        try {
            setLoading(true);
            const params = {
                page: currentPage
            };

            if (searchTerm.trim()) {
                params.search = searchTerm.trim();
            }

            if (startDate) {
                params.start_date = format(startDate, 'yyyy-MM-dd');
            }

            if (endDate) {
                params.end_date = format(endDate, 'yyyy-MM-dd');
            }
            const res = await getVehicles(params);
            const paginationDetails = res.data || res;
            let vehicleList = paginationDetails?.data || [];

            // Apply local date filter in case backend ignores the start_date/end_date params
            if (startDate || endDate) {
                vehicleList = vehicleList.filter(v => {
                    const vDate = new Date(v.created_at || v.updated_at || new Date());
                    vDate.setHours(0, 0, 0, 0);
                    let isMatch = true;

                    if (startDate) {
                        const sDate = new Date(startDate);
                        sDate.setHours(0, 0, 0, 0);
                        if (vDate < sDate) isMatch = false;
                    }

                    if (endDate) {
                        const eDate = new Date(endDate);
                        eDate.setHours(0, 0, 0, 0);
                        if (vDate > eDate) isMatch = false;
                    }

                    return isMatch;
                });
            }

            setVehicles(vehicleList);
            setTotalItems(paginationDetails?.total || vehicleList.length);

            // Fetch driver names for the IDs present in this page
            const uniqueDriverIds = [...new Set(vehicleList.map(v => v.driver_id).filter(id => id))];
            if (uniqueDriverIds.length > 0) {
                try {
                    // Fetch drivers list to get names. 
                    // Note: If pagination is an issue, we might need a specifically tailored endpoint or fetch all.
                    // For now, we fetch one page of drivers which should cover most cases if drivers are fewer.
                    const driversRes = await getDrivers({ limit: 100 });
                    const allDrivers = driversRes.data?.data || driversRes.data || [];

                    const newMap = { ...driverMap };
                    allDrivers.forEach(d => {
                        newMap[d.id] = {
                            name: (d.first_name || d.name) + (d.last_name ? ` ${d.last_name}` : ''),
                            phone: d.phone,
                            email: d.email,
                            id: d.id
                        };
                    });
                    setDriverMap(newMap);
                } catch (err) {
                    console.error("Error fetching driver names:", err);
                }
            }
        } catch (error) {
            console.error("Error fetching vehicles:", error);
            showToast(error.response?.data?.message || error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delay = setTimeout(() => {
            fetchVehicles();
        }, 400);
        return () => clearTimeout(delay);
    }, [currentPage, searchTerm, startDate, endDate]);

    const handleExport = async (exportFormat) => {
        try {
            showToast("Preparing export data...", "info");

            // Fetch all data for export (matching filters)
            const params = {
                limit: 1000,
                search: searchTerm,
                start_date: startDate ? format(startDate, 'yyyy-MM-dd') : null,
                end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null
            };

            const res = await getVehicles(params);
            let rawData = res.data?.data || res.data || [];

            if (startDate || endDate) {
                rawData = rawData.filter(v => {
                    const vDate = new Date(v.created_at || v.updated_at || new Date());
                    vDate.setHours(0, 0, 0, 0);
                    let isMatch = true;
                    if (startDate) {
                        const sDate = new Date(startDate);
                        sDate.setHours(0, 0, 0, 0);
                        if (vDate < sDate) isMatch = false;
                    }
                    if (endDate) {
                        const eDate = new Date(endDate);
                        eDate.setHours(0, 0, 0, 0);
                        if (vDate > eDate) isMatch = false;
                    }
                    return isMatch;
                });
            }

            if (rawData.length === 0) {
                showToast("No data to export", "error");
                return;
            }

            const headers = ["ID", "Driver Name", "Car Name", "Year", "Color", "Number Plate", "Type", "Seats", "Status"];
            const formattedData = rawData.map(v => [
                v.id,
                driverMap[v.driver_id]?.name || v.driver_id || 'N/A',
                v.vehicle_name || v.model || 'N/A',
                v.vehicle_model || v.year || 'N/A',
                v.vehicle_color || v.color || 'N/A',
                v.vehicle_number || v.license_plate || 'N/A',
                v.vehicle_type || v.type || 'N/A',
                v.no_of_seats || 'N/A',
                v.status?.toUpperCase() || 'ACTIVE'
            ]);

            const filename = `vehicle_report_${new Date().toISOString().split('T')[0]}`;
            const title = "Vehicle Inventory & Fleet Report";

            if (exportFormat === 'csv') {
                exportToCSV(formattedData, filename, headers);
            } else if (exportFormat === 'xlsx') {
                exportToExcel(formattedData, filename, headers);
            } else if (exportFormat === 'pdf') {
                exportToPDF(formattedData, filename, headers, title);
            }

            showToast("Report generated successfully", "success");
        } catch (error) {
            console.error("Export Error:", error);
            showToast("Failed to generate report", "error");
        } finally {
            setExportOpen(false);
        }
    };

    return (
        <AdminLayout title="Vehicle Management">
            <DatePickerStyles />
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <SearchBar
                    placeholder="Search by name, email, phone number"
                    className="w-full md:w-96 opacity-50 cursor-not-allowed"
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

            <Table headers={['Car Image', 'Driver Name', 'Car Name', 'Model Year', 'License Plate', 'Category', 'No of Seats']}>
                {loading ? (
                    <tr>
                        <td colSpan="7" className="text-center py-20">
                            <Loader fullScreen={false} />
                        </td>
                    </tr>
                ) : vehicles.length === 0 ? (
                    <tr>
                        <td colSpan="7" className="text-center py-10 text-gray-500">
                            No vehicles found
                        </td>
                    </tr>
                ) : (
                    vehicles.map((v) => (
                        <tr
                            key={v.id}
                            onClick={() => navigate(`/vehicles/detail/${v.id}`)}
                            className="cursor-pointer hover:bg-black/[0.02] transition-colors border-b border-[#F3F4F6]"
                        >
                            <td className="py-[18px] px-[30px]">
                                <div className="w-16 h-12 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                                    {(v.front_image || v.back_image) ? (
                                        <img src={getImageUrl(v.front_image || v.back_image)} className="w-full h-full object-cover" alt={v.model} />
                                    ) : (
                                        <span className="text-[10px] font-[600] text-gray-300 uppercase text-center">No Image</span>
                                    )}
                                </div>
                            </td>
                            <td className="py-[18px] px-[30px]" onClick={(e) => e.stopPropagation()}>
                                <Tooltip content={
                                    <div className="flex flex-col gap-1 py-1">
                                        <div className="flex items-center gap-2"><i className="bi bi-person text-[#D10000]"></i> <span>ID: {driverMap[v.driver_id]?.id || v.driver_id}</span></div>
                                        <div className="flex items-center gap-2"><i className="bi bi-telephone text-[#D10000]"></i> <span>{driverMap[v.driver_id]?.phone || 'N/A'}</span></div>
                                        <div className="flex items-center gap-2"><i className="bi bi-envelope text-[#D10000]"></i> <span className="lowercase">{driverMap[v.driver_id]?.email || 'N/A'}</span></div>
                                    </div>
                                }>
                                    <span className="text-[14px] font-[600] text-[#111] pb-0.5 cursor-help transition-colors hover:text-[#D10000]">
                                        {driverMap[v.driver_id]?.name || v.driver_id}
                                    </span>
                                </Tooltip>
                            </td>
                            <td className="py-[18px] px-[30px] text-[15px] font-[600] text-[#111] lowercase">
                                {v.vehicle_name || v.model}
                            </td>
                            <td className="py-[18px] px-[30px] text-[14px] font-[600] text-gray-400">
                                {v.vehicle_model || v.year} | {v.vehicle_color || v.color}
                            </td>
                            <td className="py-[18px] px-[30px] whitespace-nowrap">
                                <span className=" px-4 py-1.5  text-[13px] font-[600] ">
                                    {v.vehicle_number || v.license_plate}
                                </span>
                            </td>
                            <td className="py-[18px] px-[30px]">
                                <div className="px-5 py-2 bg-gray-50 border border-gray-100 rounded-lg text-[13px] font-[600] text-gray-600 inline-block">
                                    {v.vehicle_type}
                                </div>
                            </td>
                            <td className="py-[18px] px-[30px]">
                                <div className="flex items-center gap-2 text-[14px] font-[600] text-[#111]/80">
                                    <i className="bi bi-people-fill text-gray-400"></i>
                                    {v.no_of_seats || "N/A"}
                                </div>
                            </td>
                        </tr>
                    ))
                )}
            </Table>

            <div className="mt-8">
                <Pagination totalItems={totalItems} currentPage={currentPage} onPageChange={setCurrentPage} />
            </div>
        </AdminLayout>
    );
}
