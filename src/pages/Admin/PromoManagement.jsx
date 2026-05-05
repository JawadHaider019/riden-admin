import React, { useState } from 'react';
import { startOfWeek } from 'date-fns';
import AdminLayout from '@/layouts/AdminLayout';
import { Button, Badge, Table, Label, InputWrapper, Input, SearchBar, DeleteModal, DateRangePicker, DatePickerStyles, Pagination, useToast } from '@/components/UI';
import { Link } from 'react-router-dom';

export default function PromoManagement() {
    const { showToast } = useToast();
    const [view, setView] = useState('list');
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [exportOpen, setExportOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedPromo, setSelectedPromo] = useState(null);

    const promos = [
        { code: '43562783', discount: '20%', start: 'March 24, 2024', end: 'July 24, 2024', status: 'active' },
        { code: '43562784', discount: '15%', start: 'April 01, 2024', end: 'June 01, 2024', status: 'inactive' },
    ];

    const handleDeleteClick = (promo) => {
        setSelectedPromo(promo);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        console.log('Deleting promo:', selectedPromo);
        showToast(`Promo ${selectedPromo?.code} has been deleted permanently`, "delete");
        setIsDeleteModalOpen(false);
    };

    return (
        <AdminLayout title="Promo Code Management">
            <DatePickerStyles />
            {view === 'list' && (
                <>
                    {/* Header Row */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                        <SearchBar
                            placeholder="Search by code or date"
                            className="w-full lg:w-[360px]"
                        />

                        <div className="flex items-center gap-2 w-full lg:w-auto">
                            <Button variant="pill" onClick={() => setView('add')} className="flex-none">
                                <i className="bi bi-plus-circle-fill mr-2"></i> Add New Code
                            </Button>
                            <DateRangePicker
                                startDate={startDate}
                                endDate={endDate}
                                onStartDateChange={setStartDate}
                                onEndDateChange={setEndDate}
                            />
                            <div className="relative">
                                <button
                                    onClick={() => setExportOpen(!exportOpen)}
                                    className="flex rounded-full items-center gap-2 px-6 py-3 bg-white border border-[#E5E7EB] text-[13px] font-[700] text-[#111] hover:bg-gray-50 transition-all shadow-sm"
                                >
                                    <i className="bi bi-file-earmark-excel-fill text-[#12B76A] text-[16px]"></i> Export
                                    <i className={`bi bi-chevron-down text-[#111] text-[12px] transition-transform ${exportOpen ? 'rotate-180' : ''}`}></i>
                                </button>
                                {exportOpen && (
                                    <div className="absolute right-0 mt-2 w-[180px] bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] overflow-hidden py-2 z-[20]">
                                        <button
                                            className="w-full flex items-center px-5 py-2.5 hover:bg-gray-50 text-[13px] font-[600] text-[#111] border-b border-[#F3F4F6] transition-colors"
                                            onClick={() => setExportOpen(false)}
                                        >
                                            <i className="bi bi-filetype-csv mr-3 text-[#12B76A] text-[16px]"></i> CSV Format
                                        </button>
                                        <button
                                            className="w-full flex items-center px-5 py-2.5 hover:bg-gray-50 text-[13px] font-[600] text-[#111] transition-colors border-b border-[#F3F4F6]"
                                            onClick={() => setExportOpen(false)}
                                        >
                                            <i className="bi bi-filetype-pdf mr-3 text-[#F03D3D] text-[16px]"></i> PDF Format
                                        </button>
                                        <button
                                            className="w-full flex items-center px-5 py-2.5 hover:bg-gray-50 text-[13px] font-[600] text-[#111] transition-colors"
                                            onClick={() => setExportOpen(false)}
                                        >
                                            <i className="bi bi-file-earmark-excel-fill mr-3 text-[#12B76A] text-[16px]"></i> Excel Format
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <Table headers={['Code', 'Discount %', 'Starting Date', 'End Date', 'Status', 'Actions']}>
                        {promos.map((p, i) => (
                            <tr key={i} className="cursor-pointer hover:bg-black/[0.02] transition-colors border-b border-[#F3F4F6]">
                                <td className="py-[18px] px-[30px] text-[14px] font-[800] text-[#111]">{p.code}</td>
                                <td className="py-[18px] px-[30px] text-[14px] font-[900] text-[#D10000] tracking-tight">{p.discount}</td>
                                <td className="py-[18px] px-[30px] text-[14px] font-[700] text-[#6B7280]">{p.start}</td>
                                <td className="py-[18px] px-[30px] text-[14px] font-[700] text-[#6B7280]">{p.end}</td>
                                <td className="py-[18px] px-[30px]">
                                    <Badge variant={p.status}>{p.status}</Badge>
                                </td>
                                <td className="py-[18px] px-[30px] text-right">
                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={() => {
                                                showToast("Edit mode active - You can now modify the promo details", "info");
                                                setView('edit');
                                            }}
                                            className="w-8 h-8 rounded-lg bg-[#EBFFD5]/30 text-[#10B981] flex items-center justify-center hover:bg-[#10B981] hover:text-white transition-all"
                                        >
                                            <i className="bi bi-pencil-square"></i>
                                        </button>
                                        <button onClick={() => handleDeleteClick(p)} className="w-8 h-8 rounded-lg bg-[#FEF2F2] text-[#EF4444] flex items-center justify-center hover:bg-[#EF4444] hover:text-white transition-all"><i className="bi bi-trash3-fill"></i></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </Table>

                    <DeleteModal
                        isOpen={isDeleteModalOpen}
                        onClose={() => setIsDeleteModalOpen(false)}
                        onConfirm={confirmDelete}
                        itemName={selectedPromo?.code}
                    />
                    <Pagination totalItems={promos.length} />
                </>
            )}

            {(view === 'add' || view === 'edit') && (
                <div className=" mx-auto space-y-6">
                    <div className="flex items-center gap-2">

                        <button onClick={() => setView('list')} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors">
                            <i className="bi bi-chevron-left text-sm"></i>
                        </button>
                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">{view === 'add' ? 'Add New Promo Code' : 'Edit Promo Code'}</h2>
                    </div>

                    <div className="bg-white p-6 rounded-[30px] shadow-sm border border-[#E5E7EB]">
                        <div className="bg-[#d10000]  rounded-full  p-4 text-[14px] font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                            Code Details
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 px-4">
                            <div>
                                <Label>Code</Label>
                                <InputWrapper icon="bi bi-tag">
                                    <Input placeholder="Enter Code" defaultValue={view === 'edit' ? '43562783' : ''} />
                                </InputWrapper>
                            </div>
                            <div>
                                <Label>Discount Percentage</Label>
                                <InputWrapper icon="bi bi-percent">
                                    <Input placeholder="Enter Discount Percentage" defaultValue={view === 'edit' ? '20%' : ''} />
                                </InputWrapper>
                            </div>
                            <div className="md:col-span-2">
                                <Label>Upto Discount</Label>
                                <InputWrapper icon="bi bi-cash">
                                    <Input placeholder="e.g. 30%" defaultValue={view === 'edit' ? '50%' : ''} />
                                </InputWrapper>
                            </div>
                        </div>

                        <div className="bg-[#d10000]  rounded-full  p-4 text-[14px] font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                            Date Management
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 px-4">
                            <div>
                                <Label>Starting Date</Label>
                                <InputWrapper icon="bi bi-calendar-event">
                                    <Input placeholder="22/04/2024" defaultValue={view === 'edit' ? '2024-03-24' : ''} />
                                </InputWrapper>
                            </div>
                            <div>
                                <Label>End Date</Label>
                                <InputWrapper icon="bi bi-calendar-check">
                                    <Input placeholder="22/05/2025" defaultValue={view === 'edit' ? '2024-07-24' : ''} />
                                </InputWrapper>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-8 border-t border-gray-50">
                            <Button
                                onClick={() => {
                                    showToast(view === 'add' ? "New promo code has been created" : "Promo code updated successfully", "success");
                                    setView('list');
                                }}
                                className="px-12 py-3.5 font-black uppercase tracking-widest shadow-xl shadow-red-100"
                            >
                                {view === 'add' ? 'Save Code' : 'Update Code'}
                            </Button>
                            <Button
                                onClick={() => {
                                    showToast("Action cancelled", "info");
                                    setView('list');
                                }}
                                variant="outline"
                                className="px-12 py-3.5 border-gray-200 text-gray-400 font-black uppercase tracking-widest"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
