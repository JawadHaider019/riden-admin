import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/layouts/AdminLayout';
import { useToast, Loader } from '@/components/UI';
import { getFares } from '@/api/fareApi';
import { updateCommissionSetting } from '@/api/commissionApi';
import { getImageUrl } from '@/api/api';
import { BsTruck, BsChevronDown, BsGeoAltFill, BsPersonFill } from 'react-icons/bs';

export default function CommissionCreate() {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form fields
    const [selectedCarType, setSelectedCarType] = useState('');
    const [isSelectOpen, setIsSelectOpen] = useState(false);

    const [selectedArea, setSelectedArea] = useState('');
    const [isAreaSelectOpen, setIsAreaSelectOpen] = useState(false);

    const [selectedDays, setSelectedDays] = useState(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']);
    const [commType, setCommType] = useState('percentage'); // 'fixed' or 'percentage'
    const [commValue, setCommValue] = useState('');
    const [isActive, setIsActive] = useState(1);

    // Metadata
    const [carTypes, setCarTypes] = useState([]);
    const [areas, setAreas] = useState([]);

    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                setLoading(true);
                const data = await getFares();

                if (data.available_categories) {
                    setCarTypes(data.available_categories.map(c => ({
                        id: c.id,
                        name: c.id.toString(),
                        category: c.category,
                        capacity: c.capacity,
                        image: c.image_path,
                        label: `${c.category} (${c.capacity} PAX)`
                    })));
                }

                if (data.service_areas) {
                    setAreas(data.service_areas.map(a => ({
                        id: a.id,
                        name: a.id.toString(),
                        code: a.area_code,
                        label: a.area_name,
                        city: a.city,
                        country: a.country
                    })));
                }
            } catch (error) {
                console.error("Error fetching metadata:", error);
                showToast("Failed to load vehicle types and service areas", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchMetadata();
    }, []);

    const toggleDay = (day) => {
        setSelectedDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const handleSave = async () => {
        if (!selectedCarType || !selectedArea || !commValue || selectedDays.length === 0) {
            showToast("Please fill in all required fields", "warning");
            return;
        }

        try {
            setSaving(true);
            const payload = {
                vehicle_type_id: selectedCarType,
                service_areas_id: selectedArea,
                applicable_days: selectedDays,
                commission_type: commType,
                commission_value: Number(commValue),
                is_active: isActive
            };

            const response = await updateCommissionSetting(payload);

            if (response.status === 'success') {
                showToast(response.message || "Commission rule saved successfully", "success");
                navigate('/commission-management');
            } else {
                showToast(response.message || "Failed to save commission rule", "error");
            }
        } catch (error) {
            console.error("Error saving commission:", error);
            showToast(error.response?.data?.message || "An error occurred while saving", "error");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <AdminLayout title="Commission Management">
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="Commission Management">
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes scale-up-dropdown {
                    from { opacity: 0; transform: scaleY(0.95) translateY(-5px); }
                    to { opacity: 1; transform: scaleY(1) translateY(0); }
                }
                .animate-scale-up-dropdown { animation: scale-up-dropdown 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
            ` }} />

            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate('/commission-management')}
                    className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                >
                    <i className="bi bi-chevron-left text-sm"></i>
                </button>
                <h2 className="text-xl font-[600] text-gray-900 tracking-tight">Set Vehicle Type Commission</h2>
            </div>

            <div className="max-w-6xl mx-auto bg-white border border-gray-100 rounded-[30px] shadow-2xl shadow-gray-100">
                {/* Form Header */}
                <div className="bg-[#D10000] px-8 py-6 flex items-center gap-4 rounded-t-[30px]">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-sm">
                        <i className="bi bi-gear-fill text-xl"></i>
                    </div>
                    <h2 className="text-white text-xl font-[600] tracking-tight truncate">New Rule Configuration</h2>
                </div>

                <div className="p-6 lg:p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Left Side: Configuration Fields */}
                        <div className="space-y-5">
                            {/* Target Vehicle Type */}
                            <div className="space-y-2">
                                <label className="block text-[14px] font-[600] text-[#4B5563] uppercase tracking-widest">
                                    Target Vehicle Type <span className="text-[#D10000]">*</span>
                                </label>
                                <div className="relative">
                                    <div
                                        onClick={() => {
                                            setIsSelectOpen(!isSelectOpen);
                                            setIsAreaSelectOpen(false);
                                        }}
                                        className={`group relative flex items-center h-[60px] bg-gray-50/50 border-[1.5px] rounded-[15px] px-[18px] cursor-pointer transition-all duration-200 ${isSelectOpen ? 'border-[#D10000] bg-white ring-4 ring-red-50' : 'border-[#E5E7EB] hover:border-[#D10000]'}`}
                                    >
                                        {(() => {
                                            const selected = carTypes.find(c => c.name === selectedCarType);
                                            if (selected && selected.image) {
                                                return <img src={getImageUrl(selected.image)} alt={selected.category} className="w-8 h-8 object-contain mr-3" />;
                                            }
                                            return <BsTruck className={`mr-3 text-[18px] transition-colors ${isSelectOpen ? 'text-[#D10000]' : 'text-[#999]'}`} />;
                                        })()}
                                        <span className="flex-1 text-[15px] font-[600] text-[#111] truncate whitespace-nowrap mr-2">
                                            {carTypes.find(c => c.name === selectedCarType)?.category || 'Select Vehicle Type'}
                                        </span>
                                        <BsChevronDown className={`text-[#111] text-[12px] transition-transform duration-300 ${isSelectOpen ? 'rotate-180' : 'rotate-0'}`} />
                                    </div>

                                    {isSelectOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setIsSelectOpen(false)}></div>
                                            <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-[#E5E7EB] rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.12)] z-50 overflow-hidden py-3 animate-scale-up-dropdown origin-top">
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
                                                        <span className="text-[12px] font-[500] text-gray-500 flex items-center gap-0.5 uppercase tracking-wider ml-auto">
                                                            <BsPersonFill /> {category.capacity}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Service Area */}
                            <div className="space-y-2">
                                <label className="block text-[14px] font-[600] text-[#4B5563] uppercase tracking-widest">
                                    Service Area <span className="text-[#D10000]">*</span>
                                </label>
                                <div className="relative">
                                    <div
                                        onClick={() => {
                                            setIsAreaSelectOpen(!isAreaSelectOpen);
                                            setIsSelectOpen(false);
                                        }}
                                        className={`group relative flex items-center h-[60px] bg-gray-50/50 border-[1.5px] rounded-[15px] px-[18px] cursor-pointer transition-all duration-200 ${isAreaSelectOpen ? 'border-[#D10000] bg-white ring-4 ring-red-50' : 'border-[#E5E7EB] hover:border-[#D10000]'}`}
                                    >
                                        <BsGeoAltFill className={`mr-3 text-[18px] transition-colors ${isAreaSelectOpen ? 'text-[#D10000]' : 'text-[#999]'}`} />
                                        <span className="flex-1 text-[15px] font-[600] text-[#111] truncate whitespace-nowrap mr-2">
                                            {areas.find(a => a.name === selectedArea)?.label || 'Select Service Area'}
                                        </span>
                                        <BsChevronDown className={`text-[#111] text-[12px] transition-transform duration-300 ${isAreaSelectOpen ? 'rotate-180' : 'rotate-0'}`} />
                                    </div>

                                    {isAreaSelectOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setIsAreaSelectOpen(false)}></div>
                                            <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-[#E5E7EB] rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.12)] z-50 overflow-hidden py-3 animate-scale-up-dropdown origin-top">
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

                            {/* Applicable Days */}
                            <div className="space-y-4">
                                <label className="block text-[14px] font-[600] text-[#4B5563] uppercase tracking-widest">Applicable Days</label>
                                <div className="grid grid-cols-4 gap-3">
                                    {days.map((day) => (
                                        <label
                                            key={day}
                                            className={`flex items-center gap-3 h-[52px] px-4 border rounded-[15px] cursor-pointer transition-all ${selectedDays.includes(day)
                                                ? 'border-[#D10000] bg-red-50/50'
                                                : 'border-[#E5E7EB] hover:border-gray-300'
                                                }`}
                                        >
                                            <div className="relative flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedDays.includes(day)}
                                                    onChange={() => toggleDay(day)}
                                                    className="peer absolute opacity-0 w-full h-full cursor-pointer"
                                                />
                                                <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${selectedDays.includes(day)
                                                    ? 'border-[#D10000] bg-[#D10000]'
                                                    : 'border-[#D10000]/20 bg-white'
                                                    }`}>
                                                    {selectedDays.includes(day) && (
                                                        <i className="bi bi-check text-white text-sm leading-none"></i>
                                                    )}
                                                </div>
                                            </div>
                                            <span className={`text-[13px] font-[600] ${selectedDays.includes(day) ? 'text-[#111]' : 'text-[#4B5563]'}`}>
                                                {day}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Commission & Actions */}
                        <div className="bg-[#F9FAFB] p-6 rounded-3xl border border-[#F3F4F6] space-y-6 ">
                            <div className="space-y-5">
                                {/* Commission Type */}
                                <div className="space-y-4">
                                    <label className="block text-[14px] font-[600] text-[#4B5563] uppercase tracking-widest">Commission Type</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button
                                            onClick={() => setCommType('fixed')}
                                            className={`flex items-center gap-4 h-[64px] px-6 bg-white border-2 rounded-[20px] transition-all shadow-sm ${commType === 'fixed'
                                                ? 'border-[#D10000] ring-4 ring-red-50/50'
                                                : 'border-transparent hover:border-gray-200'
                                                }`}
                                        >
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${commType === 'fixed' ? 'border-[#0066FF] bg-blue-50' : 'border-gray-300'}`}>
                                                {commType === 'fixed' && <div className="w-3 h-3 rounded-full bg-[#0066FF] shadow-sm animate-in zoom-in-50 duration-300"></div>}
                                            </div>
                                            <span className={`text-[15px] font-[600] ${commType === 'fixed' ? 'text-[#111]' : 'text-gray-500'}`}>Fixed Amount</span>
                                        </button>

                                        <button
                                            onClick={() => setCommType('percentage')}
                                            className={`flex items-center gap-4 h-[64px] px-6 bg-white border-2 rounded-[20px] transition-all shadow-sm ${commType === 'percentage'
                                                ? 'border-[#D10000] ring-4 ring-red-50/50'
                                                : 'border-transparent hover:border-gray-200'
                                                }`}
                                        >
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${commType === 'percentage' ? 'border-[#0066FF] bg-blue-50' : 'border-gray-300'}`}>
                                                {commType === 'percentage' && <div className="w-3 h-3 rounded-full bg-[#0066FF] shadow-sm animate-in zoom-in-50 duration-300"></div>}
                                            </div>
                                            <span className={`text-[15px] font-[600] ${commType === 'percentage' ? 'text-[#111]' : 'text-gray-500'}`}>Percentage</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Commission Value */}
                                <div className="space-y-3">
                                    <label className="block text-[14px] font-[600] text-[#4B5563] uppercase tracking-widest">
                                        Commission Value <span className="text-[#D10000]">*</span>
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[18px] font-[600] text-[#D10000] bg-red-50/50 px-3 py-1 rounded-lg">
                                            {commType === 'fixed' ? 'C$' : '%'}
                                        </div>
                                        <input
                                            type="number"
                                            value={commValue}
                                            placeholder="0.00"
                                            onChange={(e) => setCommValue(e.target.value)}
                                            className="w-full h-[60px] pl-20 pr-6 bg-gray-50 border border-[#E5E7EB] rounded-3xl text-[22px] font-[600] text-[#111] placeholder:text-gray-300 focus:border-[#D10000] focus:bg-white focus:ring-8 focus:ring-red-50 transition-all outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="flex flex-col sm:flex-row gap-2 ">
                                <button
                                    onClick={() => navigate('/commission-management')}
                                    disabled={saving}
                                    className="py-3 px-6 h-[60px] bg-white border border-[#E5E7EB] rounded-full text-[14px] font-[600] text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-95 uppercase tracking-widest disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="py-3 px-6 h-[60px] bg-[#D10000] rounded-full text-[14px] font-[600] text-white hover:bg-[#B00000] transition-all shadow-xl shadow-red-100 active:scale-95 uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {saving ? (
                                        <><i className="bi bi-hourglass-split animate-spin text-lg"></i> Saving...</>
                                    ) : (
                                        <><i className="bi bi-save2-fill text-lg"></i> Save New Rule</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div >
        </AdminLayout >
    );
}
