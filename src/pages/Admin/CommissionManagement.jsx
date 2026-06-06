import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '@/layouts/AdminLayout';
import { Button, Table, SearchBar, Pagination, DateRangePicker, DatePickerStyles } from '@/components/UI';

export default function CommissionManagement() {
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);

    const [transactions, setTransactions] = useState([
        { id: '#RULE-001', variant: 'STANDARD', area: 'Downtown', commType: 'Percentage', value: '20%', action: 'EDIT' },
        { id: '#RULE-002', variant: 'SUV', area: 'Downtown', commType: 'Percentage', value: '25%', action: 'EDIT' },
        { id: '#RULE-003', variant: 'VAN', area: 'Downtown', commType: 'Percentage', value: '20%', action: 'EDIT' },
        { id: '#RULE-004', variant: 'PREMIUM', area: 'Downtown', commType: 'Percentage', value: '30%', action: 'EDIT' },
    ]);

    const [editingId, setEditingId] = useState(null);
    const [editRowData, setEditRowData] = useState(null);

    const startRowEdit = (row) => {
        setEditingId(row.id);
        setEditRowData({ ...row });
    };

    const handleSaveRow = () => {
        setTransactions(prev => prev.map(t => t.id === editingId ? editRowData : t));
        setEditingId(null);
        setEditRowData(null);
    };

    const handleCancelRow = () => {
        setEditingId(null);
        setEditRowData(null);
    };

    return (
        <AdminLayout title="Commission Management">
            <DatePickerStyles />

            {/* Header Actions */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                <SearchBar
                    placeholder="Search by ID or vehicle type"
                    className="w-full lg:w-[360px]"
                />
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <Link to="/commission-management/create">
                        <Button variant="pill" className="flex-none">
                            <i className="bi bi-gear-fill mr-2"></i> Set Commission
                        </Button>
                    </Link>
                    <DateRangePicker
                        startDate={startDate}
                        endDate={endDate}
                        onStartDateChange={setStartDate}
                        onEndDateChange={setEndDate}
                    />
                </div>
            </div>

            {/* Table */}
            <Table headers={['Rule ID', 'Vehicle Type', 'Service Area', 'Comm. Type', 'Value', 'Action']} headerBg="bg-[#FFF1F2]" headerAlign="text-center">
                {transactions.map((row, i) => {
                    const isEditing = editingId === row.id;
                    return (
                        <tr key={i} className={`hover:bg-black/[0.01] transition-colors border-b border-[#F3F4F6] ${isEditing ? 'bg-red-50/30' : ''}`}>
                            <td className="py-[14px] px-[20px] text-center">
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editRowData.id}
                                        onChange={(e) => setEditRowData({ ...editRowData, id: e.target.value })}
                                        className="w-full px-3 py-1.5 border border-red-200 rounded-lg text-[13px] font-[600] focus:ring-2 focus:ring-red-100 outline-none"
                                    />
                                ) : (
                                    <span className="text-[14px] font-[600] text-[#D10000]">{row.id}</span>
                                )}
                            </td>
                            <td className="py-[14px] px-[20px] text-center">
                                {isEditing ? (
                                    <select
                                        value={editRowData.variant}
                                        onChange={(e) => setEditRowData({ ...editRowData, variant: e.target.value })}
                                        className="w-full px-3 py-1.5 border border-red-200 rounded-lg text-[13px] font-[600] outline-none"
                                    >
                                        <option value="STANDARD">STANDARD</option>
                                        <option value="SUV">SUV</option>
                                        <option value="VAN">VAN</option>
                                        <option value="PREMIUM">PREMIUM</option>
                                    </select>
                                ) : (
                                    <span className="text-[14px] font-[600] text-[#111] uppercase italic tracking-tight">{row.variant}</span>
                                )}
                            </td>
                            <td className="py-[14px] px-[20px] text-center">
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editRowData.area}
                                        onChange={(e) => setEditRowData({ ...editRowData, area: e.target.value })}
                                        className="w-full px-3 py-1.5 border border-red-200 rounded-lg text-[13px] font-[600] outline-none"
                                    />
                                ) : (
                                    <span className="text-[14px] font-[600] text-[#4B5563]">{row.area}</span>
                                )}
                            </td>
                            <td className="py-[14px] px-[20px] text-center">
                                {isEditing ? (
                                    <select
                                        value={editRowData.commType}
                                        onChange={(e) => setEditRowData({ ...editRowData, commType: e.target.value })}
                                        className="w-full px-3 py-1.5 border border-red-200 rounded-lg text-[13px] font-[600] outline-none"
                                    >
                                        <option value="Percentage">Percentage</option>
                                        <option value="Fixed Amount">Fixed Amount</option>
                                    </select>
                                ) : (
                                    <span className="text-[14px] font-[600] text-[#111]">{row.commType}</span>
                                )}
                            </td>
                            <td className="py-[14px] px-[20px] text-center">
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editRowData.value}
                                        onChange={(e) => setEditRowData({ ...editRowData, value: e.target.value })}
                                        className="w-full px-3 py-1.5 border border-red-200 rounded-lg text-[13px] font-[600] outline-none text-center"
                                    />
                                ) : (
                                    <span className="text-[14px] font-[600] text-[#111]">{row.value}</span>
                                )}
                            </td>
                            <td className="py-[14px] px-[20px] text-center">
                                {isEditing ? (
                                    <div className="flex justify-center gap-3">
                                        <button
                                            onClick={handleSaveRow}
                                            className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition-all shadow-sm"
                                            title="Save Changes"
                                        >
                                            <i className="bi bi-check-lg text-lg"></i>
                                        </button>
                                        <button
                                            onClick={handleCancelRow}
                                            className="w-8 h-8 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-300 transition-all shadow-sm"
                                            title="Cancel"
                                        >
                                            <i className="bi bi-x-lg text-lg"></i>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center gap-4">
                                        <button
                                            onClick={() => startRowEdit(row)}
                                            className="text-green-500 hover:text-green-600 transition-colors"
                                            title="Edit Rule"
                                        >
                                            <i className="bi bi-pencil-square text-lg"></i>
                                        </button>
                                        <button
                                            onClick={() => setTransactions(prev => prev.filter(t => t.id !== row.id))}
                                            className="text-red-500 hover:text-red-600 transition-colors"
                                            title="Delete Rule"
                                        >
                                            <i className="bi bi-trash3-fill text-lg"></i>
                                        </button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    );
                })}
            </Table>

            <Pagination totalItems={transactions.length} />
        </AdminLayout>
    );
}
