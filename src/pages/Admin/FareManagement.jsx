import React, { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { Table, Select, InputWrapper, useToast, Loader } from '@/components/UI';
import { getFares, updateFare } from '@/api/fareApi';

export default function FareManagement() {
    const { showToast } = useToast();
    const [fares, setFares] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(null); // id of the row being updated

    const [editingId, setEditingId] = useState(null);
    const [editValues, setEditValues] = useState({});
    const [isSelectOpen, setIsSelectOpen] = useState(false);
    const [selectedCarType, setSelectedCarType] = useState('');
    const [carTypes, setCarTypes] = useState([]);

    const fetchFares = async (vehicleType = '') => {
        try {
            setLoading(true);
            const data = await getFares(vehicleType);
            setFares(data.fares || []);
            setCarTypes(data.available_categories || []);

            if (!selectedCarType && data.current_vehicle_type) {
                setSelectedCarType(data.current_vehicle_type);
            }
        } catch (error) {
            console.error("Error fetching fares:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFares();
    }, []);

    const startEditing = (fare) => {
        setEditingId(fare.id);
        setEditValues({ ...fare });
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditValues({});
    };

    const saveEditing = async () => {
        try {
            setUpdating(editingId);
            await updateFare(editValues);
            showToast(`Fare for ${editValues.day} updated successfully`, 'success');
            setEditingId(null);
            fetchFares(selectedCarType);
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to update fare', 'error');
        } finally {
            setUpdating(null);
        }
    };

    const handleChange = (field, value) => {
        setEditValues(prev => ({ ...prev, [field]: value }));
    };

    return (
        <AdminLayout title="Fare Management">
            {/* Header Row - only car type selector */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 mb-4">
                <div className="relative w-full md:w-72">
                    <div
                        onClick={() => setIsSelectOpen(!isSelectOpen)}
                        className={`group relative flex items-center bg-[#fdfdfd] border-[1.5px] rounded-[30px] px-[18px] py-[13px] cursor-pointer transition-all duration-200 ${isSelectOpen ? 'border-[#D10000] ring-[5px] ring-[#e13437]/10' : 'border-[#E5E7EB] hover:border-[#D10000]'}`}
                    >
                        <i className={`bi bi-truck mr-3 text-[18px] transition-colors ${isSelectOpen ? 'text-[#D10000]' : 'text-[#999]'}`}></i>
                        <span className="flex-1 text-[14px] font-[600] text-[#111] truncate whitespace-nowrap mr-2">
                            {carTypes.find(c => c.name === selectedCarType)?.label || selectedCarType}
                        </span>
                        <i className={`bi bi-chevron-down text-[#111] text-[12px] transition-transform duration-300 ${isSelectOpen ? 'rotate-180' : 'rotate-0'}`}></i>
                    </div>

                    {isSelectOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsSelectOpen(false)}></div>
                            <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-[#E5E7EB] rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.12)] z-50 overflow-hidden py-3 animate-scale-up-dropdown origin-top">
                                {carTypes.map((category) => (
                                    <div
                                        key={category.name}
                                        onClick={() => {
                                            setSelectedCarType(category.name);
                                            fetchFares(category.name);
                                            setIsSelectOpen(false);
                                        }}
                                        className={`px-4 py-2 text-xs font-[600] cursor-pointer transition-all duration-200 ${selectedCarType === category.name
                                            ? 'bg-[#D10000] text-white mx-2 rounded-full shadow-md truncate whitespace-nowrap'
                                            : 'text-[#111] hover:bg-gray-50 truncate whitespace-nowrap'
                                            }`}
                                    >
                                        {category.label}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes scale-up-dropdown {
                    from { opacity: 0; transform: scaleY(0.95) translateY(-5px); }
                    to { opacity: 1; transform: scaleY(1) translateY(0); }
                }
                .animate-scale-up-dropdown { animation: scale-up-dropdown 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
            ` }} />

            <Table headers={['Days', 'Base Fare ($)', 'Per KM ($)', 'Wait Min / $', 'Night Time', 'Night ($)', 'Peak ($)', 'Actions']} tableClassName="table-fixed" headerAlign="text-center">
                {loading ? (
                    <tr>
                        <td colSpan="8" className="py-20 text-center">
                            <Loader />
                        </td>
                    </tr>
                ) : fares.map((fare) => {
                    const isEditing = editingId === fare.id;

                    return (
                        <tr key={fare.id} className={`transition-colors border-b border-[#F3F4F6] ${isEditing ? 'bg-[#FFF8F8]' : 'hover:bg-black/[0.02]'}`}>
                            <td className="py-3 px-3 text-[14px] font-[600] text-[#111] text-center">{fare.day}</td>
                            <td className="py-3 px-3 text-center">
                                {isEditing ? (
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editValues.base_fare}
                                        onChange={(e) => handleChange('base_fare', e.target.value)}
                                        className="w-[80px] px-2 py-2 border border-[#D10000]/30 rounded-lg text-[14px] font-[600] text-[#111] text-center focus:outline-none focus:border-[#D10000] bg-white"
                                    />
                                ) : (
                                    <span className="text-[14px] font-[600] text-[#111]">${fare.base_fare}</span>
                                )}
                            </td>
                            <td className="py-3 px-3 text-center">
                                {isEditing ? (
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editValues.per_km_fare}
                                        onChange={(e) => handleChange('per_km_fare', e.target.value)}
                                        className="w-[80px] px-2 py-2 border border-[#D10000]/30 rounded-lg text-[14px] font-[600] text-[#111] text-center focus:outline-none focus:border-[#D10000] bg-white"
                                    />
                                ) : (
                                    <span className="text-[14px] font-[600] text-[#111]">${fare.per_km_fare}</span>
                                )}
                            </td>
                            <td className="py-3 px-3 text-center">
                                {isEditing ? (
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            value={editValues.waiting_min}
                                            onChange={(e) => handleChange('waiting_min', e.target.value)}
                                            className="w-[50px] px-1 py-2 border border-[#D10000]/30 rounded-lg text-[13px] font-[600] text-[#111] text-center focus:outline-none focus:border-[#D10000] bg-white"
                                        />
                                        <span className="text-gray-400">/</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={editValues.waiting_charges}
                                            onChange={(e) => handleChange('waiting_charges', e.target.value)}
                                            className="w-[60px] px-1 py-2 border border-[#D10000]/30 rounded-lg text-[13px] font-[600] text-[#111] text-center focus:outline-none focus:border-[#D10000] bg-white"
                                        />
                                    </div>
                                ) : (
                                    <span className="text-[14px] font-[600] text-[#6B7280]">{fare.waiting_min}m / ${fare.waiting_charges}</span>
                                )}
                            </td>
                            <td className="py-3 px-3 text-center">
                                {isEditing ? (
                                    <div className="flex flex-col gap-1">
                                        <input
                                            type="text"
                                            placeholder="Start (HH:mm)"
                                            value={editValues.night_start_time || ''}
                                            onChange={(e) => handleChange('night_start_time', e.target.value)}
                                            className="w-full px-2 py-1 border border-[#D10000]/30 rounded text-[12px] font-[600] text-[#111] text-center"
                                        />
                                        <input
                                            type="text"
                                            placeholder="End (HH:mm)"
                                            value={editValues.night_end_time || ''}
                                            onChange={(e) => handleChange('night_end_time', e.target.value)}
                                            className="w-full px-2 py-1 border border-[#D10000]/30 rounded text-[12px] font-[600] text-[#111] text-center"
                                        />
                                    </div>
                                ) : (
                                    <span className="text-[13px] font-[600] text-[#6B7280]">
                                        {fare.night_start_time ? `${fare.night_start_time} - ${fare.night_end_time}` : 'N/A'}
                                    </span>
                                )}
                            </td>
                            <td className="py-3 px-3 text-center">
                                {isEditing ? (
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editValues.night_charges}
                                        onChange={(e) => handleChange('night_charges', e.target.value)}
                                        className="w-[70px] px-2 py-2 border border-[#D10000]/30 rounded-lg text-[14px] font-[600] text-[#D10000] text-center focus:outline-none focus:border-[#D10000] bg-white"
                                    />
                                ) : (
                                    <span className="text-[14px] font-[600] text-[#D10000]">${fare.night_charges}</span>
                                )}
                            </td>
                            <td className="py-3 px-3 text-center">
                                {isEditing ? (
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editValues.peak_charges}
                                        onChange={(e) => handleChange('peak_charges', e.target.value)}
                                        className="w-[70px] px-2 py-2 border border-[#D10000]/30 rounded-lg text-[14px] font-[600] text-[#D10000] text-center focus:outline-none focus:border-[#D10000] bg-white"
                                    />
                                ) : (
                                    <span className="text-[14px] font-[600] text-[#D10000]">${fare.peak_charges}</span>
                                )}
                            </td>
                            <td className="py-3 px-3 text-center">
                                {isEditing ? (
                                    <div className="flex flex-col items-center justify-center gap-1.5">
                                        <button
                                            onClick={saveEditing}
                                            disabled={updating === fare.id}
                                            className="w-full px-4 py-1.5 bg-[#12B76A] text-white text-[11px] font-[600] rounded-full hover:bg-[#039855] transition-all disabled:opacity-50"
                                        >
                                            {updating === fare.id ? 'Saving...' : 'Update'}
                                        </button>
                                        <button
                                            onClick={cancelEditing}
                                            className="w-full px-4 py-1.5 bg-gray-100 text-gray-500 text-[11px] font-[600] rounded-full hover:bg-gray-200 transition-all font-[600]"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => startEditing(fare)}
                                        className="px-5 py-2 bg-white border border-[#E5E7EB] text-[#111] text-[12px] font-[600] rounded-full hover:bg-gray-50 transition-all flex items-center gap-1.5 mx-auto"
                                    >
                                        <i className="bi bi-pencil-square text-[#10B981]"></i> Edit
                                    </button>
                                )}
                            </td>
                        </tr>
                    );
                })}
            </Table>
        </AdminLayout>
    );
}
