import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '@/layouts/AdminLayout';
import { Button, Table, SearchBar, Pagination, DateRangePicker, DatePickerStyles, useToast, Loader } from '@/components/UI';
import { getCommissions, updateCommissionSetting } from '@/api/commissionApi';

export default function CommissionManagement() {
    const { showToast } = useToast();
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [commissions, setCommissions] = useState([]);

    const fetchCommissions = async () => {
        try {
            setLoading(true);
            const response = await getCommissions();
            if (response.status === 'success') {
                setCommissions(response.data || []);
            }
        } catch (error) {
            console.error("Error fetching commissions:", error);
            // showToast("Failed to fetch commission rules", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCommissions();
    }, []);

    const [editingId, setEditingId] = useState(null);
    const [editRowData, setEditRowData] = useState(null);

    const startRowEdit = (row) => {
        setEditingId(row.id);
        setEditRowData({ ...row });
    };

    const handleSaveRow = async () => {
        try {
            const response = await updateCommissionSetting({
                vehicle_type_id: editRowData.vehicle_type_id,
                service_areas_id: editRowData.service_areas_id,
                applicable_days: editRowData.applicable_days,
                commission_type: editRowData.commission_type,
                commission_value: editRowData.commission_value,
                is_active: editRowData.is_active
            });

            if (response.status === 'success') {
                showToast("Commission updated successfully", "success");
                setEditingId(null);
                fetchCommissions();
            }
        } catch (error) {
            showToast(error.response?.data?.message || "Failed to update", "error");
        }
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
            <Table
                headers={['Vehicle Type', 'Service Area', 'Days', 'Comm. Type', 'Value', 'Status', 'Action']}
                headerBg="bg-[#FFF1F2]"
                headerAlign="text-center"
            >
                {loading ? (
                    <tr>
                        <td colSpan="7" className="py-20 text-center">
                            <Loader />
                        </td>
                    </tr>
                ) : commissions.length === 0 ? (
                    <tr>
                        <td colSpan="7" className="py-20 text-center text-gray-500">
                            No commission rules found.
                        </td>
                    </tr>
                ) : commissions.map((row, i) => {
                    const isEditing = editingId === row.id;
                    return (
                        <tr key={i} className={`hover:bg-black/[0.01] transition-colors border-b border-[#F3F4F6] ${isEditing ? 'bg-red-50/30' : ''}`}>
                            <td className="py-[14px] px-[20px] text-center">
                                <span className="text-[14px] font-[600] text-[#111] uppercase italic tracking-tight">
                                    {row.vehicle_type?.category || 'N/A'}
                                </span>
                            </td>
                            <td className="py-[14px] px-[20px] text-center">
                                <span className="text-[14px] font-[600] text-[#4B5563]">
                                    {row.service_area?.area_name || 'N/A'}
                                </span>
                            </td>
                            <td className="py-[14px] px-[20px] text-center">
                                <span className="text-[12px] font-[500] text-gray-500">
                                    {Array.isArray(row.applicable_days) ? row.applicable_days.join(', ') : row.applicable_days}
                                </span>
                            </td>
                            <td className="py-[14px] px-[20px] text-center">
                                {isEditing ? (
                                    <select
                                        value={editRowData.commission_type}
                                        onChange={(e) => setEditRowData({ ...editRowData, commission_type: e.target.value })}
                                        className="w-full px-3 py-1.5 border border-red-200 rounded-lg text-[13px] font-[600] outline-none"
                                    >
                                        <option value="percentage">Percentage</option>
                                        <option value="fixed">Fixed</option>
                                    </select>
                                ) : (
                                    <span className="text-[14px] font-[600] text-[#111] capitalize">{row.commission_type}</span>
                                )}
                            </td>
                            <td className="py-[14px] px-[20px] text-center">
                                {isEditing ? (
                                    <input
                                        type="number"
                                        value={editRowData.commission_value}
                                        onChange={(e) => setEditRowData({ ...editRowData, commission_value: e.target.value })}
                                        className="w-full px-3 py-1.5 border border-red-200 rounded-lg text-[13px] font-[600] outline-none text-center"
                                    />
                                ) : (
                                    <span className="text-[14px] font-[600] text-[#111]">
                                        {row.commission_type === 'percentage' ? `${row.commission_value}%` : `C$ ${row.commission_value}`}
                                    </span>
                                )}
                            </td>
                            <td className="py-[14px] px-[20px] text-center">
                                <span className={`px-3 py-1 rounded-full text-[12px] font-[700] ${row.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {row.is_active ? 'ACTIVE' : 'INACTIVE'}
                                </span>
                            </td>
                            <td className="py-[14px] px-[20px] text-center">
                                {isEditing ? (
                                    <div className="flex justify-center gap-3">
                                        <button
                                            onClick={handleSaveRow}
                                            className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition-all shadow-sm"
                                        >
                                            <i className="bi bi-check-lg text-lg"></i>
                                        </button>
                                        <button
                                            onClick={handleCancelRow}
                                            className="w-8 h-8 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-300 transition-all shadow-sm"
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
                                    </div>
                                )}
                            </td>
                        </tr>
                    );
                })}
            </Table>

            <Pagination totalItems={commissions.length} />
        </AdminLayout>
    );
}
