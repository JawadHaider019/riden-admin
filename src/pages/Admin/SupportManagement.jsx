import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminLayout from '@/layouts/AdminLayout';
import { Table, Badge, SearchBar, Pagination, DateRangePicker, DatePickerStyles, Tabs, useToast, Loader } from '@/components/UI';
import { getSupportTickets } from '@/api/supportApi';
import { format } from 'date-fns';

export default function SupportManagement() {
    const { showToast } = useToast();
    const location = useLocation();
    const navigate = useNavigate();
    const isReportPath = location.pathname === '/support/report';

    const [tab, setTab] = useState('driver');
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);

    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        current_page: 1,
        total: 0,
        per_page: 15,
        last_page: 1
    });

    const fetchTickets = async (page = 1) => {
        try {
            setLoading(true);
            const params = {
                page,
                user_type: tab,
                search: searchTerm,
                start_date: startDate ? format(startDate, 'yyyy-MM-dd') : null,
                end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
            };
            const response = await getSupportTickets(params);

            // Handle Laravel-style pagination response
            if (response.status === 'success' || response.data) {
                const apiData = response.data;
                const apiTickets = apiData.data || [];
                setTickets(apiTickets);

                setPagination({
                    current_page: apiData.current_page || 1,
                    total: apiData.total || 0,
                    per_page: apiData.per_page || 15,
                    last_page: apiData.last_page || 1
                });
            } else {
                setTickets([]);
            }
        } catch (error) {
            console.error("Error fetching tickets:", error);
            setTickets([]);
            showToast("Failed to load tickets from server", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets(1);
    }, [tab, searchTerm, startDate, endDate]);

    const getUserName = (ticket) => {
        const user = ticket.user_type === 'driver' ? ticket.driver : ticket.passenger;
        return user ? `${user.first_name} ${user.last_name || ''}` : 'N/A';
    };

    const openTicket = (ticket) => {
        navigate(`/support/detail/${ticket.id}`, { state: { ticket } });
    };

    return (
        <AdminLayout title={"Support Ticket Management"}>
            <DatePickerStyles />

            <div className="flex flex-col lg:flex-row justify-between items-center lg:items-center gap-4 mb-4 pr-1">
                <SearchBar
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search tickets..."
                    className="w-full lg:w-[350px]"
                />
                <DateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                />
            </div>

            <Tabs
                activeTab={tab}
                onTabChange={setTab}
                options={[
                    { id: 'driver', label: 'Driver Complaints' },
                    { id: 'passenger', label: 'Passenger Complaints' }
                ]}
            />

            <Table headers={['ID', 'Date & Time', 'Booking ID', `${tab === 'driver' ? 'Driver' : 'Passenger'} Name`, 'Type', 'Priority', 'Status']} headerBg="bg-[#FFF1F2]" headerAlign="text-center">
                {loading ? (
                    <tr>
                        <td colSpan={6} className="py-20 text-center">
                            <Loader />
                        </td>
                    </tr>
                ) : tickets.length === 0 ? (
                    <tr>
                        <td colSpan={6} className="py-20 text-center text-gray-500 font-medium">
                            No support tickets found
                        </td>
                    </tr>
                ) : tickets.map((c) => (
                    <tr key={c.id} className="group hover:bg-black/[0.03] transition-colors cursor-pointer border-b border-[#F3F4F6]" onClick={() => openTicket(c)}>
                        <td className="py-[16px] px-[15px] text-[14px] font-[600] text-[#111] text-center">{c.ticket_id?.replace('#', '')}</td>
                        <td className="py-[16px] px-[15px] text-[14px] font-[600] text-[#4B5563] text-center">
                            {c.created_at ? format(new Date(c.created_at), 'dd MMM yyyy hh:mm a') : 'N/A'}
                        </td>
                        <td className="py-[16px] px-[15px] text-[14px] font-[600] text-[#4B5563] font-mono text-center">{c.booking_id || 'N/A'}</td>
                        <td className="py-[16px] px-[15px] text-[14px] font-[600] text-[#111] text-center">{getUserName(c)}</td>
                        <td className="py-[16px] px-[15px] text-[14px] font-[600] text-[#4B5563] text-center">{c.complaint_type}</td>
                        <td className="py-[16px] px-[15px] text-center">
                            <Badge variant={
                                c.priority === 'high' ? 'danger' :
                                    c.priority === 'medium' ? 'info' : 'active'
                            }>
                                {c.priority ? c.priority.charAt(0).toUpperCase() + c.priority.slice(1) : 'Normal'}
                            </Badge>
                        </td>
                        <td className="py-[16px] px-[15px] text-center">
                            <Badge variant={
                                c.status === 'closed' ? 'danger' :
                                    c.status === 'pending' ? 'active' :
                                        c.status === 'in-progress' ? 'info' : 'danger'
                            }>
                                {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                            </Badge>
                        </td>
                    </tr>
                ))}
            </Table>

            {pagination.total > pagination.per_page && (
                <div className="mt-6">
                    <Pagination
                        totalItems={pagination.total}
                        itemsPerPage={pagination.per_page}
                        currentPage={pagination.current_page}
                        onPageChange={fetchTickets}
                    />
                </div>
            )}
        </AdminLayout>
    );
}
