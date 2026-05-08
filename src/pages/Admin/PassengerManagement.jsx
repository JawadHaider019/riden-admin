import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import AdminLayout from '@/layouts/AdminLayout';
import { Table, Badge, Button, SearchBar, Tabs, DateRangePicker, DatePickerStyles, Pagination, useToast } from '@/components/UI';
import { getPassengers } from '@/api/passengerApi';
import { getImageUrl } from '@/api/api';
import { formatDate } from '@/utils/formatters';
import { exportToCSV, exportToExcel, exportToPDF } from '@/utils/exportUtils';

export default function PassengerManagement() {
    const [passengers, setPassengers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [activeTab, setActiveTab] = useState('active');
    const [exportOpen, setExportOpen] = useState(false);
    const { showToast } = useToast();
    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
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

    const fetchPassengers = async () => {
        try {
            setLoading(true);
            const params = {
                page: currentPage
            };

            if (searchTerm.trim()) {
                params.search = searchTerm.trim();
            }

            if (activeTab) {
                params.status = activeTab === 'active' ? 'Active' : 'Blocked';
            }

            if (startDate) {
                params.start_date = format(startDate, 'yyyy-MM-dd');
            }

            if (endDate) {
                params.end_date = format(endDate, 'yyyy-MM-dd');
            }
            const response = await getPassengers(params);

            const apiData = response.data || {};
            let list = apiData.data || (Array.isArray(response.data) ? response.data : []);

            // Local filtering for safety
            if (activeTab === 'active') {
                list = list.filter(p => !p.status || p.status.toLowerCase() === 'active');
            } else if (activeTab === 'blocked') {
                list = list.filter(p => p.status?.toLowerCase() === 'blocked' || p.status?.toLowerCase() === 'block');
            }

            // Local date filtering for safety
            if (startDate || endDate) {
                list = list.filter(p => {
                    const pDate = new Date(p.created_at || new Date());
                    pDate.setHours(0, 0, 0, 0);
                    let isMatch = true;
                    if (startDate) {
                        const sDate = new Date(startDate);
                        sDate.setHours(0, 0, 0, 0);
                        if (pDate < sDate) isMatch = false;
                    }
                    if (endDate) {
                        const eDate = new Date(endDate);
                        eDate.setHours(0, 0, 0, 0);
                        if (pDate > eDate) isMatch = false;
                    }
                    return isMatch;
                });
            }

            setPassengers(list);

            setTotalItems(apiData.total || list.length);
        }
        catch (error) {
            console.error("Error fetching passengers:", error);
            showToast(error.response?.data?.message || error.message, 'error');
        }
        finally {
            setLoading(false);
        }
    }

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
                params.status = activeTab === 'active' ? 'Active' : 'Blocked';
            }

            if (startDate) {
                params.start_date = format(startDate, 'yyyy-MM-dd');
            }

            if (endDate) {
                params.end_date = format(endDate, 'yyyy-MM-dd');
            }

            const response = await getPassengers(params);
            const apiData = response.data || {};
            let rawData = apiData.data || (Array.isArray(response.data) ? response.data : []);

            if (startDate || endDate) {
                rawData = rawData.filter(p => {
                    const pDate = new Date(p.created_at || new Date());
                    pDate.setHours(0, 0, 0, 0);
                    let isMatch = true;
                    if (startDate) {
                        const sDate = new Date(startDate);
                        sDate.setHours(0, 0, 0, 0);
                        if (pDate < sDate) isMatch = false;
                    }
                    if (endDate) {
                        const eDate = new Date(endDate);
                        eDate.setHours(0, 0, 0, 0);
                        if (pDate > eDate) isMatch = false;
                    }
                    return isMatch;
                });
            }

            if (rawData.length === 0) {
                showToast("No passengers to export", "error");
                return;
            }

            const headers = ["ID", "Name", "Phone", "Email", "Status", "Joined Date"];
            const formattedData = rawData.map(p => [
                p.id,
                `${p.first_name || ''} ${p.last_name || ''}`,
                p.phone || 'N/A',
                p.email || 'N/A',
                p.status?.toUpperCase() || (activeTab === 'active' ? 'ACTIVE' : 'BLOCKED'),
                formatDate(p.created_at)
            ]);

            const filename = `passengers_report_${activeTab}_${new Date().toISOString().split('T')[0]}`;
            const title = `RIDEN | ${activeTab.toUpperCase()} PASSENGERS DIRECTORY`;

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

    useEffect(() => {
        fetchPassengers();
    }, [currentPage, searchTerm, activeTab, startDate, endDate]);

    return (
        <AdminLayout title="Passenger Management">
            <DatePickerStyles />

            {/* Header Row */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
                <SearchBar
                    placeholder="Search by name, email, phone number"
                    className="w-full lg:w-[330px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />

                <div className="flex flex-wrap items-center gap-1 w-full lg:w-auto">
                    {/* <Button variant="pill" className="flex-1 lg:flex-none" onClick={() => navigate('/passenger/create')}>
                        <i className="bi bi-person-plus-fill"></i> Add Passenger
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
                            className="flex rounded-full items-center gap-1 px-4 py-3 bg-white border border-[#E5E7EB] text-[13px] font-[600] text-[#111] hover:bg-gray-50 transition-all"
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

            {/* Tabs - Using generic UI component like DriverManagement */}
            <Tabs
                activeTab={activeTab}
                onTabChange={(tab) => {
                    setActiveTab(tab);
                    setCurrentPage(1);
                }}
                options={[
                    { id: 'active', label: 'Active ' },
                    { id: 'blocked', label: 'Blocked' }
                ]}
            />

            {/* Table */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden mb-6">
                <Table headers={[' ID', 'Name', 'Phone Number', 'Joined Date', 'Status']}>
                    {loading ? (
                        <tr>
                            <td colSpan="5" className="text-center py-20">
                                <div className="animate-spin inline-block w-8 h-8 border-4 border-[#D10000] border-t-transparent rounded-full"></div>
                            </td>
                        </tr>
                    ) : passengers.length === 0 ? (
                        <tr>
                            <td colSpan="5" className="text-center py-24 text-gray-400 font-[600]">
                                No passengers found in {activeTab} list
                            </td>
                        </tr>
                    ) : (
                        passengers.map((p) => {
                            const rawStatus = p.status?.toLowerCase();
                            const isBlocked = rawStatus === 'blocked' || rawStatus === 'block';
                            const displayStatus = isBlocked ? 'Blocked' : (p.status || 'Active');
                            const badgeVariant = isBlocked ? 'blocked' : 'active';

                            return (
                                <tr
                                    key={p.id}
                                    onClick={() => navigate(`/passenger/detail/${p.id}`)}
                                    className="cursor-pointer hover:bg-gray-50/50 transition-all border-b border-gray-50 last:border-0"
                                >
                                    <td className="py-[18px] px-[30px] font-[600] text-gray-400 italic">{p.id}</td>
                                    <td className="py-[18px] px-[30px]">
                                        <div className="flex items-center gap-3">
                                            <div className="w-[44px] h-[44px] rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0">
                                                <img
                                                    src={p.avatar ? getImageUrl(p.avatar) : p.avatar_url}
                                                    className="w-full h-full object-cover"
                                                    alt=""
                                                    onError={(e) => {
                                                        if (!e.target.src.includes('ui-avatars.com')) {
                                                            e.target.src = `https://ui-avatars.com/api/?name=${p.first_name}+${p.last_name}&background=random`;
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <span className="font-[600] text-[#111]">{p.first_name + " " + p.last_name || p.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-[18px] px-[30px] text-gray-700 font-[600]">{p.phone}</td>
                                    <td className="py-[18px] px-[30px] text-gray-500 font-[600]">{formatDate(p.created_at)}</td>
                                    <td className="py-[18px] px-[30px]">
                                        <Badge variant={badgeVariant}>{displayStatus}</Badge>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </Table>
            </div>

            <Pagination
                totalItems={totalItems}
                currentPage={currentPage}
                onPageChange={(page) => setCurrentPage(page)}
            />
        </AdminLayout>
    );
}
