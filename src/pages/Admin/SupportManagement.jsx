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

    const DUMMY_TICKETS = [
        {
            id: 'dummy-1',
            ticket_id: '#TKT-9921',
            created_at: new Date().toISOString(),
            booking_id: 'RID-8821',
            user_type: 'driver',
            driver: { id: 14, first_name: 'John', last_name: 'Doe', phone: '+123456789', email: 'john@example.com', avatar_url: '' },
            complaint_type: 'Payment Issue',
            status: 'pending',
            priority: 'high',
            subject: 'Fare not credited for the last trip',
            description: 'I completed the trip RID-8821 but the fare has not been added to my wallet yet. Please check.',
            replies: []
        },
        {
            id: 'dummy-2',
            ticket_id: '#TKT-9922',
            created_at: new Date(Date.now() - 3600000).toISOString(),
            booking_id: 'RID-8825',
            user_type: 'passenger',
            passenger: { id: 25, first_name: 'Jane', last_name: 'Smith', phone: '+987654321', email: 'jane@example.com', avatar_url: '' },
            complaint_type: 'Behavior',
            status: 'open',
            priority: 'urgent',
            subject: 'Driver was rude during the trip',
            description: 'The driver was very unprofessional and used offensive language when I asked him to turn on the AC.',
            images: [
                'https://images.unsplash.com/photo-1549194388-f61be038069b?w=800',
                'https://www.w3schools.com/html/mov_bbb.mp4'
            ],
            replies: []
        },
        {
            id: 'dummy-3',
            ticket_id: '#TKT-9923',
            created_at: new Date(Date.now() - 86400000).toISOString(),
            booking_id: 'RID-8830',
            user_type: 'driver',
            driver: { id: 16, first_name: 'Mike', last_name: 'Wilson', phone: '+555444333', email: 'mike@example.com', avatar_url: '' },
            complaint_type: 'Technical',
            status: 'closed',
            priority: 'low',
            subject: 'App crashing constantly',
            description: 'The app keeps closing when I try to accept a ride. I have reinstalled it twice.',
            replies: []
        },
        {
            id: 'dummy-4',
            ticket_id: '#TKT-9924',
            created_at: new Date(Date.now() - 172800000).toISOString(),
            booking_id: 'RID-8840',
            user_type: 'passenger',
            passenger: { id: 30, first_name: 'Sarah', last_name: 'Connor', phone: '+111222333', email: 'sarah@example.com', avatar_url: '' },
            complaint_type: 'Billing',
            status: 'in-progress',
            priority: 'medium',
            subject: 'Double charged for the same trip',
            description: 'I see two transactions on my credit card for the same booking. Please refund one.',
            replies: []
        }
    ];

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
            if (response.status === 'success') {
                const apiTickets = response.data.data;
                const filteredDummy = DUMMY_TICKETS.filter(t => t.user_type === tab);
                setTickets([...filteredDummy, ...apiTickets]);

                setPagination({
                    current_page: response.data.current_page,
                    total: response.data.total + filteredDummy.length,
                    per_page: response.data.per_page,
                    last_page: response.data.last_page
                });
            } else {
                setTickets(DUMMY_TICKETS.filter(t => t.user_type === tab));
            }
        } catch (error) {
            console.error("Error fetching tickets:", error);
            setTickets(DUMMY_TICKETS.filter(t => t.user_type === tab));
            showToast("Failed to load tickets, using sample data", "info");
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
                                c.priority === 'urgent' ? 'danger' :
                                    c.priority === 'high' ? 'warning' :
                                        c.priority === 'medium' ? 'info' : 'active'
                            }>
                                {c.priority ? c.priority.charAt(0).toUpperCase() + c.priority.slice(1) : 'Normal'}
                            </Badge>
                        </td>
                        <td className="py-[16px] px-[15px] text-center">
                            <Badge variant={
                                c.status === 'closed' ? 'active' :
                                    c.status === 'pending' ? 'warning' :
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
