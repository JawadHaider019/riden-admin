import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import AdminLayout from '@/layouts/AdminLayout';
import { Table, Badge, Button, SearchBar, Tabs, DateRangePicker, DatePickerStyles, Pagination, useToast, Tooltip, Loader } from '@/components/UI';
import { useNavigate } from 'react-router-dom';
import { startOfWeek } from 'date-fns';
import { getDrivers } from '../../api/driverApi';
import { getImageUrl } from '@/api/api';
import { formatDate } from '@/utils/formatters';
import { exportToCSV, exportToExcel, exportToPDF } from '@/utils/exportUtils';

export default function DriverManagement() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('approved');
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

    // API States
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [statusCounts, setStatusCounts] = useState({
        approved: 0,
        requested: 0,
        suspended: 0
    });

    const fetchCounts = async () => {
        try {
            const response = await getDrivers({ limit: 1000 });
            const allDrivers = response.data?.data || response.data || [];

            const counts = { approved: 0, requested: 0, suspended: 0 };

            allDrivers.forEach(d => {
                const s = d.status?.toLowerCase();
                if (s === 'approved' || s === 'active') counts.approved++;
                else if (s === 'requested' || s === 'pending') counts.requested++;
                else if (s === 'suspended' || s === 'suspend' || s === 'inactive' || !!d.suspended_until) counts.suspended++;
            });

            setStatusCounts(counts);
        } catch (error) {
            console.error("Error fetching status counts:", error);
        }
    };

    const fetchDrivers = async () => {
        try {
            setLoading(true);
            const params = {
                page: currentPage
            };

            if (searchTerm.trim()) {
                params.search = searchTerm.trim();
            }

            if (activeTab) {
                params.status = activeTab === 'approved' ? 'Approved' :
                    activeTab === 'requested' ? 'Requested' :
                        activeTab === 'suspended' ? 'Suspended' : undefined;
            }

            console.log("Fetching drivers. Tab:", activeTab, "Params:", params);

            if (startDate) {
                params.start_date = format(startDate, 'yyyy-MM-dd');
            }

            if (endDate) {
                params.end_date = format(endDate, 'yyyy-MM-dd');
            }
            const response = await getDrivers(params);

            // Laravel paginated structure: response.data.data
            let driversData = response.data?.data || response.data || [];

            // Apply local filtering to ensure tab consistency
            if (activeTab === 'approved') {
                driversData = driversData.filter(d => {
                    const s = d.status?.toLowerCase();
                    return s === 'approved' || s === 'active';
                });
            } else if (activeTab === 'requested') {
                driversData = driversData.filter(d =>
                    d.status?.toLowerCase() === 'requested' ||
                    d.status?.toLowerCase() === 'pending'
                );
            } else if (activeTab === 'suspended') {
                driversData = driversData.filter(d => {
                    const s = d.status?.toLowerCase();
                    const isSuspendedDate = d.suspended_until && new Date(d.suspended_until) > new Date();
                    return isSuspendedDate || s === 'suspended' || s === 'suspend' || (s === 'inactive' && d.suspended_until);
                });
            }

            if (startDate || endDate) {
                driversData = driversData.filter(d => {
                    const dDate = new Date(d.created_at || new Date());
                    dDate.setHours(0, 0, 0, 0);
                    let isMatch = true;
                    if (startDate) {
                        const sDate = new Date(startDate);
                        sDate.setHours(0, 0, 0, 0);
                        if (dDate < sDate) isMatch = false;
                    }
                    if (endDate) {
                        const eDate = new Date(endDate);
                        eDate.setHours(0, 0, 0, 0);
                        if (dDate > eDate) isMatch = false;
                    }
                    return isMatch;
                });
            }

            setDrivers(driversData);

            // Pagination info
            setTotalPages(response.data?.last_page || 1);
            const currentTabCount = driversData.length;
            setTotalItems(currentTabCount);

            setStatusCounts(prev => ({ ...prev, [activeTab]: currentTabCount }));
        } catch (error) {
            console.error("Error fetching drivers:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDrivers();
    }, [currentPage, searchTerm, activeTab, startDate, endDate]);

    useEffect(() => {
        fetchCounts();
    }, []);

    const handleExport = async (exportFormat) => {
        try {
            showToast("Preparing export data...", "info");

            const params = {
                limit: 1000
            };

            if (searchTerm.trim()) {
                params.search = searchTerm.trim();
            }

            if (activeTab) {
                params.status = activeTab === 'approved' ? 'Approved' :
                    activeTab === 'requested' ? 'Requested' :
                        activeTab === 'suspended' ? 'Suspended' :
                            activeTab === 'blocked' ? 'Blocked' : undefined;
            }

            if (startDate) {
                params.start_date = format(startDate, 'yyyy-MM-dd');
            }

            if (endDate) {
                params.end_date = format(endDate, 'yyyy-MM-dd');
            }

            const response = await getDrivers(params);
            let rawData = response.data?.data || response.data || [];

            if (startDate || endDate) {
                rawData = rawData.filter(d => {
                    const dDate = new Date(d.created_at || new Date());
                    dDate.setHours(0, 0, 0, 0);
                    let isMatch = true;
                    if (startDate) {
                        const sDate = new Date(startDate);
                        sDate.setHours(0, 0, 0, 0);
                        if (dDate < sDate) isMatch = false;
                    }
                    if (endDate) {
                        const eDate = new Date(endDate);
                        eDate.setHours(0, 0, 0, 0);
                        if (dDate > eDate) isMatch = false;
                    }
                    return isMatch;
                });
            }

            if (rawData.length === 0) {
                showToast("No drivers to export", "error");
                return;
            }

            const headers = ["ID", "Name", "Phone", "Email", "Status", "Joined Date"];
            const formattedData = rawData.map(d => [
                d.id,
                `${d.first_name || ''} ${d.last_name || ''}`,
                d.phone || 'N/A',
                d.email || 'N/A',
                d.status?.toUpperCase() || 'N/A',
                formatDate(d.created_at)
            ]);

            const filename = `drivers_report_${activeTab}_${new Date().toISOString().split('T')[0]}`;
            const title = `RIDEN | ${activeTab.toUpperCase()} DRIVERS DIRECTORY`;

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
        <AdminLayout title="Driver Management">
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
                    {/* <Button variant="pill" className="flex-1 lg:flex-none" onClick={() => navigate('/drivers/create')}>
                        <i className="bi bi-person-plus-fill"></i> Add Driver
                    </Button> */}

                    <DateRangePicker
                        startDate={startDate}
                        endDate={endDate}
                        onStartDateChange={setStartDate}
                        onEndDateChange={setEndDate}

                    />
                    <div className="relative" ref={exportRef}>
                        <button
                            onClick={() => setExportOpen(!exportOpen)}
                            className="flex rounded-full items-center gap-1 px-6 py-3 bg-white border border-[#E5E7EB] text-[13px] font-[600] text-[#111] hover:bg-gray-50 transition-all"
                        >
                            <i className="bi bi-file-earmark-excel-fill text-[#1D7E4D]"></i> Export
                            <i className={`bi bi-chevron-down text-[#1D7E4D] text-sm transition-all ${exportOpen ? 'rotate-180' : ''}`}></i>
                        </button>
                        {exportOpen && (
                            <div className="absolute right-0 mt-2 w-44 bg-white border border-[#E5E7EB] rounded-2xl shadow-lg overflow-hidden py-1 z-10 transition-all animate-fade-in">
                                <button
                                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-[13px] font-[600] text-[#111] border-b border-[#F3F4F6] transition-colors"
                                    onClick={() => handleExport('csv')}
                                >
                                    <i className="bi bi-filetype-csv mr-2 text-[#1D7E4D]"></i> CSV Format
                                </button>
                                <button
                                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-[13px] font-[600] text-[#111] transition-colors"
                                    onClick={() => handleExport('pdf')}
                                >
                                    <i className="bi bi-filetype-pdf mr-2 text-[#E72929]"></i> PDF Format
                                </button>
                                <button
                                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-[13px] font-[600] text-[#111] transition-colors border-t border-[#F3F4F6]"
                                    onClick={() => handleExport('xlsx')}
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
                activeTab={activeTab}
                onTabChange={setActiveTab}
                options={[
                    { id: 'approved', label: 'Approved', count: statusCounts.approved },
                    { id: 'requested', label: 'Requested', count: statusCounts.requested },
                    { id: 'suspended', label: 'Suspended', count: statusCounts.suspended }
                ]}
            />

            {/* Table */}
            <Table headers={['ID', 'Name', 'Phone Number', 'Joined Date', 'Status']}>
                {loading ? (
                    <tr><td colSpan="5" className="text-center py-20"><Loader fullScreen={false} /></td></tr>
                ) : drivers.length === 0 ? (
                    <tr><td colSpan="5" className="text-center py-10 text-gray-500 font-medium">No drivers found</td></tr>
                ) : (
                    drivers.map((d) => (
                        <tr
                            key={d.id}
                            onClick={() => navigate(`/drivers/detail/${d.id}`)}
                            className="group cursor-pointer hover:bg-black/[0.02] transition-colors border-b border-[#F3F4F6]"
                        >

                            <td className="py-[18px] px-[30px] text-[#6B7280] font-[600] italic tracking-tight">{d.id}</td>
                            <td className="py-[18px] px-[30px]">
                                <div className="flex items-center gap-3">
                                    <div className="w-[44px] h-[44px] rounded-full overflow-hidden border-2 border-white shadow-sm bg-gray-100 shrink-0">
                                        <img
                                            src={d.avatar ? getImageUrl(d.avatar) : d.avatar_url}
                                            className="w-full h-full object-cover"
                                            alt=""
                                            onError={(e) => {
                                                if (!e.target.src.includes('ui-avatars.com')) {
                                                    e.target.src = `https://ui-avatars.com/api/?name=${d.first_name}+${d.last_name}&background=random`;
                                                }
                                            }}
                                        />
                                    </div>
                                    <span className="font-[600] text-[#111]">{d.first_name} {d.last_name}</span>
                                </div>
                            </td>
                            <td className="py-[18px] px-[30px] text-[#111] font-[600]">{d.phone}</td>
                            <td className="py-[18px] px-[30px] text-[#111] font-[600]">{formatDate(d.created_at)}</td>
                            <td className="py-[18px] px-[30px] relative">
                                <Badge variant={d.status?.toLowerCase()}>{d.status}</Badge>
                                <div className="absolute right-6 top-1/2 -translate-y-1/2">
                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-50 text-[#1D7E4D] opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:scale-110 shadow-sm border border-green-100">
                                        <i className="bi bi-eye-fill text-[15px]"></i>
                                    </span>
                                </div>
                            </td>
                        </tr>
                    ))
                )}
            </Table>
            <Pagination
                totalItems={totalItems}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
            />
        </AdminLayout>
    );
}
