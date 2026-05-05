import React, { useState } from 'react';
import { startOfWeek } from 'date-fns';
import AdminLayout from '@/layouts/AdminLayout';
import { Badge, Button, Table, Label, InputWrapper, Input, SearchBar, Pagination, DateRangePicker, DatePickerStyles, Select } from '@/components/UI';

export default function ManageNotifications() {
    const [view, setView] = useState('list'); // 'list' or 'add'
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);

    const alerts = [
        { date: '22 March 2025', title: 'App Update', message: 'Update your app for new features...', status: 'Sent' },
        { date: '22 March 2025', title: 'Maintenance', message: 'Scheduled maintenance tonight at...', status: 'Sent' },
        { date: '22 March 2025', title: 'New Driver', message: 'Welcome our newest driver to the...', status: 'Sent' },
        { date: '22 March 2025', title: 'System Alert', message: 'Server optimization process started...', status: 'Sent' },
    ];

    const cities = [
        { name: 'Vancouver', selected: true },
        { name: 'Richmond', selected: true },
        { name: 'Burnaby', selected: true },
        { name: 'New Westminster', selected: true },
        { name: 'Coquitlam', selected: true },
        { name: 'Delta', selected: true },
    ];

    return (
        <AdminLayout title="Manage Notifications">
            <DatePickerStyles />
            {view === 'list' ? (
                <>
                    {/* Header Actions */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
                        <SearchBar
                            placeholder="Search alerts..."
                            className="w-full lg:w-[360px]"
                        />
                        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                            <Button onClick={() => setView('add')} variant="pill" className="flex-none">
                                <i className="bi bi-plus-lg mr-2"></i> Send Alert
                            </Button>
                            <DateRangePicker
                                startDate={startDate}
                                endDate={endDate}
                                onStartDateChange={setStartDate}
                                onEndDateChange={setEndDate}
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <Table headers={['Date', 'Title', 'Message', 'Status']} headerBg="bg-[#FFF1F2]" headerAlign="text-center">
                        {alerts.map((a, i) => (
                            <tr key={i} className="hover:bg-black/[0.03] transition-colors border-b border-[#F3F4F6]">
                                <td className="py-[18px] px-[30px] text-[14px] font-[600] text-gray-500 text-center">{a.date}</td>
                                <td className="py-[18px] px-[30px] text-[14px] font-[600] text-[#111] text-center">{a.title}</td>
                                <td className="py-[18px] px-[30px] text-[14px] font-[600] text-gray-500 text-center">{a.message}</td>
                                <td className="py-[18px] px-[30px] text-center">
                                    <Badge variant="active">{a.status}</Badge>
                                </td>
                            </tr>
                        ))}
                    </Table>

                    <Pagination totalItems={alerts.length} />
                </>
            ) : (
                <div className=" mx-auto pb-8">
                    <div className="flex items-center gap-4 mb-4">
                        <button
                            onClick={() => setView('list')}
                            className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            <i className="bi bi-chevron-left text-sm"></i>

                        </button>
                        <h2 className="text-2xl font-bold text-gray-800">Send Alert</h2>
                    </div>

                    <div className="bg-white border border-[#E5E7EB] rounded-[30px] p-8 shadow-sm space-y-8">
                        {/* Manage Audience Section */}
                        <div>
                            <div className="bg-[#D10000] text-white px-6 py-3.5 rounded-[30px] font-[600] text-[16px] mb-4">
                                Manage Audience
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4">
                                <div className="space-y-2">
                                    <Label className="normal-case text-[14px] text-gray-600">Select Drivers</Label>
                                    <InputWrapper>
                                        <Select>
                                            <option>Select</option>
                                            <option>All Drivers</option>
                                            <option>Active Drivers</option>
                                        </Select>
                                        <i className="bi bi-chevron-down text-gray-400 text-xs"></i>
                                    </InputWrapper>
                                </div>
                                <div className="space-y-2">
                                    <Label className="normal-case text-[14px] text-gray-600">Select Passengers</Label>
                                    <InputWrapper>
                                        <Select>
                                            <option>Select</option>
                                            <option>All Passengers</option>
                                            <option>Loyal Passengers</option>
                                        </Select>
                                        <i className="bi bi-chevron-down text-gray-400 text-xs"></i>
                                    </InputWrapper>
                                </div>
                            </div>
                        </div>

                        {/* Select Cities Section */}
                        <div>
                            <div className="bg-[#D10000] text-white px-6 py-3.5 rounded-[30px] font-[600] text-[16px] mb-4">
                                Select Cities
                            </div>
                            <div className="space-y-4 px-4 ">
                                <div className="space-y-2">
                                    <Label className="normal-case text-[14px] text-gray-600">Select Cities</Label>
                                    <div className="relative flex items-center bg-[#fdfdfd] border-[1.5px] border-[#E5E7EB] rounded-[30px] pr-2 focus-within:border-[#D10000] transition-all overflow-hidden lg:w-full">
                                        <Input className="px-6 py-4" placeholder="Select" />
                                        <div className="w-12 h-12 flex items-center justify-center border-l border-gray-100">
                                            <i className="bi bi-search text-[#D10000] text-lg"></i>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <Label className="normal-case text-[14px] text-gray-600 mb-0">Selected Cities</Label>
                                    <div className="border border-[#E5E7EB] rounded-[24px] p-8 grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-12">
                                        {cities.map((city, idx) => (
                                            <div key={idx} className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-md bg-[#D10000] flex items-center justify-center cursor-pointer">
                                                    <i className="bi bi-check-lg text-white text-[14px]"></i>
                                                </div>
                                                <span className="text-[15px] font-[600] text-gray-700">{city.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Create Alert Section */}
                        <div>
                            <div className="bg-[#D10000] text-white px-6 py-3.5 rounded-[30px] font-[600] text-[16px] mb-4">
                                Create Alert
                            </div>
                            <div className="space-y-4 px-4">
                                <div className="space-y-2">
                                    <Label className="normal-case text-[14px] text-gray-600">Title</Label>
                                    <InputWrapper className="!py-4">
                                        <Input placeholder="Add Title" />
                                    </InputWrapper>
                                </div>
                                <div className="space-y-2">
                                    <Label className="normal-case text-[14px] text-gray-600">Alert Message</Label>
                                    <div className="relative bg-[#fdfdfd] border-[1.5px] border-[#E5E7EB] rounded-[24px] p-4 focus-within:border-[#D10000] transition-all group">
                                        <textarea
                                            placeholder="Write..."
                                            className="w-full min-h-[160px] text-[15px] font-[600] text-[#111] outline-none resize-none bg-transparent"
                                        ></textarea>
                                        <div className="absolute bottom-6 right-8 text-[12px] font-[600] text-gray-400 group-focus-within:text-[#D10000] transition-colors">
                                            200
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setView('list')}
                                className="px-6 py-3 border-2 border-black rounded-3xl text-sm font-[600] text-black hover:bg-gray-50 transition-all uppercase"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => setView('list')}
                                className="px-6 py-3 bg-[#D10000] text-white rounded-3xl font-[600] text-sm shadow-lg shadow-red-100 hover:bg-[#D10000]/90 transition-all uppercase tracking-wide"
                            >
                                Send Notification
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
