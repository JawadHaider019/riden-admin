import React, { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { format, parse } from 'date-fns';
import { Table, Select, InputWrapper, useToast, Loader } from '@/components/UI';
import { getFares, updateFare } from '@/api/fareApi';
import { getImageUrl } from '@/api/api';
import { BsTruck, BsChevronDown, BsGeoAltFill, BsPersonFill, BsPencilSquare, BsInfoCircle } from 'react-icons/bs';

export default function FareManagement() {
    const { showToast } = useToast();
    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const [fares, setFares] = useState(DAYS.map(day => ({
        id: `initial-${day.toLowerCase()}`,
        day: day,
        base_fare: 0,
        per_km_fare: 0,
        waiting_min: 0,
        waiting_charges: 0,
        night_start_time: '-:--:--',
        night_end_time: '-:--:--',
        night_charges: 0,
        peak_charges: 0,
        is_new: true
    })));
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(null);

    const formatTime = (timeStr) => {
        if (!timeStr) return 'N/A';
        try {
            // Handle HH:mm or HH:mm:ss
            const timePart = timeStr.split(' ')[0]; // Basic sanitization
            const parsed = parse(timePart, timePart.length > 5 ? 'HH:mm:ss' : 'HH:mm', new Date());
            return format(parsed, 'hh:mm a');
        } catch (e) {
            console.error("Time Parse Error:", e);
            return timeStr;
        }
    };

    const [editingId, setEditingId] = useState(null);
    const [editValues, setEditValues] = useState({});
    const [isSelectOpen, setIsSelectOpen] = useState(false);
    const [selectedCarType, setSelectedCarType] = useState('');
    const [carTypes, setCarTypes] = useState([]);

    const [selectedArea, setSelectedArea] = useState('');
    const [isAreaSelectOpen, setIsAreaSelectOpen] = useState(false);
    const [areas, setAreas] = useState([]);

    const fetchFares = async (vehicleType = selectedCarType, area = selectedArea) => {
        if (!vehicleType || !area) return;
        try {
            setLoading(true);
            const data = await getFares(vehicleType, area);
            const backendFares = Array.isArray(data.fares) ? data.fares : [];

            // Ensure all 7 days are represented in the table
            const completeFares = DAYS.map(day => {
                const existing = backendFares.find(f => f.day && f.day.toLowerCase() === day.toLowerCase());
                return existing ? { ...existing, is_new: false } : {
                    id: `new-${day.toLowerCase()}`,
                    day: day,
                    base_fare: 0,
                    per_km_fare: 0,
                    waiting_min: 0,
                    waiting_charges: 0,
                    night_start_time: '-:--:--',
                    night_end_time: '-:--:--',
                    night_charges: 0,
                    peak_charges: 0,
                    is_new: true
                };
            });

            setFares(completeFares);
        } catch (error) {
            console.error("Error fetching fares:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            try {
                setLoading(true);
                const data = await getFares();

                if (data.available_categories && data.available_categories.length > 0) {
                    const categories = data.available_categories.map(c => ({
                        id: c.id,
                        name: c.id.toString(),
                        category: c.category,
                        capacity: c.capacity,
                        image: c.image_path,
                        label: `${c.category} (${c.capacity})`
                    }));
                    setCarTypes(categories);
                }

                if (data.service_areas && data.service_areas.length > 0) {
                    const serviceAreas = data.service_areas.map(a => ({
                        id: a.id,
                        name: a.id.toString(),
                        code: a.area_code,
                        label: a.area_name,
                        city: a.city,
                        country: a.country
                    }));
                    setAreas(serviceAreas);
                }

                setLoading(false);
            } catch (error) {
                console.error("Error fetching initial fare data:", error);
                setLoading(false);
            }
        };
        init();
    }, []);

    // Watch for changes to selected vehicle or area
    useEffect(() => {
        if (selectedCarType && selectedArea) {
            fetchFares(selectedCarType, selectedArea);
        }
    }, [selectedCarType, selectedArea]);

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

            // Construct payload exactly as requested
            const payload = {
                vehicle_type_id: Number(selectedCarType),
                service_areas_id: Number(selectedArea),
                day: editValues.day,
                base_fare: parseFloat(editValues.base_fare),
                per_km_fare: parseFloat(editValues.per_km_fare),
                waiting_charges: parseFloat(editValues.waiting_charges),
                waiting_min: parseInt(editValues.waiting_min),
                night_start_time: editValues.night_start_time,
                night_end_time: editValues.night_end_time,
                night_charges: parseFloat(editValues.night_charges),
                peak_charges: parseFloat(editValues.peak_charges)
            };

            // Only include ID if it's a valid numeric ID (not a temp frontend ID)
            const numericId = parseInt(editingId);
            if (!isNaN(numericId)) {
                payload.id = numericId;
            }

            console.log("🚀 SENDING FARE PAYLOAD:", payload);

            const response = await updateFare(payload);

            if (response.status === 'success' || response.status === true) {
                showToast(`Fare for ${editValues.day} updated successfully`, 'success');
                setEditingId(null);
                fetchFares(selectedCarType, selectedArea);
            } else {
                showToast(response.message || 'Failed to update fare in database', 'error');
            }
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
            <div className="flex flex-col lg:flex-row justify-start items-start lg:items-center gap-4 mb-4">
                {/* Vehicle Type Select */}
                <div className="relative w-full md:w-64">
                    <div
                        onClick={() => {
                            setIsSelectOpen(!isSelectOpen);
                            setIsAreaSelectOpen(false);
                        }}
                        className={`group relative flex items-center bg-[#fdfdfd] border-[1.5px] rounded-[30px] px-[18px] py-[13px] cursor-pointer transition-all duration-200 ${isSelectOpen ? 'border-[#D10000] ring-[5px] ring-[#e13437]/10' : 'border-[#E5E7EB] hover:border-[#D10000]'}`}
                    >
                        {(() => {
                            const selected = carTypes.find(c => c.name === selectedCarType);
                            if (selected && selected.image) {
                                return <img src={getImageUrl(selected.image)} alt={selected.category} className="w-8 h-8 object-contain mr-3" />;
                            }
                            return <BsTruck className={`mr-3 text-[18px] transition-colors ${isSelectOpen ? 'text-[#D10000]' : 'text-[#999]'}`} />;
                        })()}
                        <span className="flex-1 text-[14px] font-[600] text-[#111] truncate whitespace-nowrap mr-2">
                            {carTypes.find(c => c.name === selectedCarType)?.category || 'Select Vehicle'}
                        </span>
                        <BsChevronDown className={`text-[#111] text-[12px] transition-transform duration-300 ${isSelectOpen ? 'rotate-180' : 'rotate-0'}`} />
                    </div>

                    {isSelectOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsSelectOpen(false)}></div>
                            <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-[#E5E7EB] rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.12)] z-50 overflow-hidden py-3 animate-scale-up-dropdown origin-top w-72">
                                {carTypes.map((category) => (
                                    <div
                                        key={category.id}
                                        onClick={() => {
                                            setSelectedCarType(category.name);
                                            setIsSelectOpen(false);
                                        }}
                                        className={`px-5 py-2 cursor-pointer transition-all duration-200 border-b border-gray-50 last:border-0 flex items-center gap-4 ${selectedCarType === category.name
                                            ? 'bg-[#FDF2F2]'
                                            : 'hover:bg-[#D10000]/10'
                                            }`}
                                    >
                                        {category.image && (
                                            <img src={getImageUrl(category.image)} alt={category.category} className="w-12 h-10 object-contain" />
                                        )}

                                        <span className={`text-[14px] font-[700] ${selectedCarType === category.name ? 'text-[#D10000]' : 'text-[#111]'}`}>
                                            {category.category}
                                        </span>
                                        <span className="text-[12px] font-[500] text-gray-500 flex items-center gap-0.5 uppercase tracking-wider">
                                            <BsPersonFill /> {category.capacity}
                                        </span>

                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Area Select */}
                <div className="relative w-full md:w-64">
                    <div
                        onClick={() => {
                            setIsAreaSelectOpen(!isAreaSelectOpen);
                            setIsSelectOpen(false);
                        }}
                        className={`group relative flex items-center bg-[#fdfdfd] border-[1.5px] rounded-[30px] px-[18px] py-[13px] cursor-pointer transition-all duration-200 ${isAreaSelectOpen ? 'border-[#D10000] ring-[5px] ring-[#e13437]/10' : 'border-[#E5E7EB] hover:border-[#D10000]'}`}
                    >
                        <BsGeoAltFill className={`mr-3 text-[18px] transition-colors ${isAreaSelectOpen ? 'text-[#D10000]' : 'text-[#999]'}`} />
                        <span className="flex-1 text-[14px] font-[600] text-[#111] truncate whitespace-nowrap mr-2">
                            {areas.find(a => a.name === selectedArea)?.label || 'Select Area'}
                        </span>
                        <BsChevronDown className={`text-[#111] text-[12px] transition-transform duration-300 ${isAreaSelectOpen ? 'rotate-180' : 'rotate-0'}`} />
                    </div>

                    {isAreaSelectOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsAreaSelectOpen(false)}></div>
                            <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-[#E5E7EB] rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.12)] z-50 overflow-hidden py-3 animate-scale-up-dropdown origin-top w-80">
                                {areas.map((area) => (
                                    <div
                                        key={area.id}
                                        onClick={() => {
                                            setSelectedArea(area.name);
                                            setIsAreaSelectOpen(false);
                                        }}
                                        className={`px-5 py-3 cursor-pointer transition-all duration-200 border-b border-gray-50 last:border-0 ${selectedArea === area.name
                                            ? 'bg-[#FDF2F2]'
                                            : 'hover:bg-[#D10000]/10'
                                            }`}
                                    >
                                        <div className="flex flex-col gap-1 text-left">
                                            <div className="flex items-center justify-between">
                                                <span className={`text-[14px] font-[700] ${selectedArea === area.name ? 'text-[#D10000]' : 'text-[#111]'}`}>
                                                    {area.label}
                                                </span>
                                                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-[700]">
                                                    {area.code}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[11px] font-[600] text-gray-500 uppercase italic">
                                                <span>{area.city}</span>
                                                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                <span>{area.country}</span>
                                            </div>
                                        </div>
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

            <Table headers={['Days', 'Base Fare (C$)', 'Per KM (C$)', 'Wait Min / C$', 'Night Time', 'Night (C$)', 'Peak (C$)', 'Actions']} tableClassName="table-fixed" headerAlign="text-center">
                {loading ? (
                    <tr>
                        <td colSpan="8" className="py-20 text-center">
                            <Loader />
                        </td>
                    </tr>
                ) : !selectedCarType || !selectedArea ? (
                    <tr>
                        <td colSpan="8" className="py-32 text-center">
                            <div className="flex flex-col items-center justify-center gap-3 animate-fade-in">
                                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                    <BsInfoCircle className="text-[#D10000] text-3xl" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <h3 className="text-[18px] font-[700] text-[#111]">Select Vehicle & Area</h3>
                                    <p className="text-[14px] font-[500] text-gray-500 max-w-[280px] mx-auto leading-relaxed">
                                        Please choose a vehicle type and service area to view and manage fare rates.
                                    </p>
                                </div>
                            </div>
                        </td>
                    </tr>
                ) : fares.length === 0 ? (
                    <tr>
                        <td colSpan="8" className="py-20 text-center text-gray-500 font-medium">
                            No fare data found for this selection
                        </td>
                    </tr>
                ) : fares.map((fare) => {
                    const isEditing = editingId === fare.id;

                    return (
                        <tr key={fare.id} className={`transition-colors border-b border-[#F3F4F6] ${isEditing ? 'bg-[#FFF8F8]' : 'hover:bg-black/[0.02]'}`}>
                            <td className="py-3 px-2 text-[14px] font-[600] text-[#111] text-center">{fare.day}</td>
                            <td className="py-3 px-2 text-center">
                                {isEditing ? (
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editValues.base_fare}
                                        onChange={(e) => handleChange('base_fare', e.target.value)}
                                        className="w-[80px] px-2 py-2 border border-[#D10000]/30 rounded-lg text-[14px] font-[600] text-[#111] text-center focus:outline-none focus:border-[#D10000] bg-white"
                                    />
                                ) : (
                                    <span className="text-[14px] font-[600] text-[#111]">{Number(fare.base_fare)}</span>
                                )}
                            </td>
                            <td className="py-3 px-2 text-center">
                                {isEditing ? (
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editValues.per_km_fare}
                                        onChange={(e) => handleChange('per_km_fare', e.target.value)}
                                        className="w-[80px] px-2 py-2 border border-[#D10000]/30 rounded-lg text-[14px] font-[600] text-[#111] text-center focus:outline-none focus:border-[#D10000] bg-white"
                                    />
                                ) : (
                                    <span className="text-[13px] font-[600] text-[#111]">{Number(fare.per_km_fare)}</span>
                                )}
                            </td>
                            <td className="py-3 px-2 text-center">
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
                                    <span className="text-[14px] font-[600] text-[#6B7280]">{fare.waiting_min} / {Number(fare.waiting_charges)}</span>
                                )}
                            </td>
                            <td className="py-3 px-2 text-center">
                                {isEditing ? (
                                    <div className="flex flex-col gap-1">
                                        <input
                                            type="time"
                                            value={editValues.night_start_time || ''}
                                            onChange={(e) => handleChange('night_start_time', e.target.value)}
                                            className="w-full px-2 py-1 border border-[#D10000]/30 rounded text-[12px] font-[600] text-[#111] text-center"
                                        />
                                        <input
                                            type="time"
                                            value={editValues.night_end_time || ''}
                                            onChange={(e) => handleChange('night_end_time', e.target.value)}
                                            className="w-full px-2 py-1 border border-[#D10000]/30 rounded text-[12px] font-[600] text-[#111] text-center"
                                        />
                                    </div>
                                ) : (
                                    <span className="text-[13px] font-[600] text-[#6B7280]">
                                        <span>
                                            {fare.night_start_time ? `${formatTime(fare.night_start_time)}` : 'N/A'}
                                        </span>
                                        <br />
                                        <span>
                                            {fare.night_end_time ? `${formatTime(fare.night_end_time)}` : 'N/A'}
                                        </span>
                                    </span>
                                )}
                            </td>
                            <td className="py-3 px-2 text-center">
                                {isEditing ? (
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editValues.night_charges}
                                        onChange={(e) => handleChange('night_charges', e.target.value)}
                                        className="w-[70px] px-2 py-2 border border-[#D10000]/30 rounded-lg text-[14px] font-[600] text-[#D10000] text-center focus:outline-none focus:border-[#D10000] bg-white"
                                    />
                                ) : (
                                    <span className="text-[14px] font-[600] text-[#111]">{Number(fare.night_charges)}</span>
                                )}
                            </td>
                            <td className="py-3 px-2 text-center">
                                {isEditing ? (
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editValues.peak_charges}
                                        onChange={(e) => handleChange('peak_charges', e.target.value)}
                                        className="w-[70px] px-2 py-2 border border-[#D10000]/30 rounded-lg text-[14px] font-[600] text-[#D10000] text-center focus:outline-none focus:border-[#D10000] bg-white"
                                    />
                                ) : (
                                    <span className="text-[14px] font-[600] text-[#111]">{Number(fare.peak_charges)}</span>
                                )}
                            </td>
                            <td className="py-3 px-2 text-center">
                                {isEditing ? (
                                    <div className="flex flex-col items-center justify-center gap-1">
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
                                        className="px-5 py-2 bg-white border border-[#E5E7EB] text-[#111] text-[12px] font-[600] rounded-full hover:bg-gray-200 transition-all flex items-center gap-1.5 mx-auto shadow-sm"
                                    >
                                        <BsPencilSquare className="text-[#10B981]" /> Edit
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
