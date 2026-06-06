import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/layouts/AdminLayout';

export default function CommissionCreate() {
    const navigate = useNavigate();
    const [view, setView] = useState('set'); // Not strictly needed here but kept for state logic if needed
    const [selectedCarType, setSelectedCarType] = useState('');
    const [selectedArea, setSelectedArea] = useState('');
    const [selectedDays, setSelectedDays] = useState([]);
    const [commType, setCommType] = useState('percentage'); // 'fixed' or 'percentage'
    const [commValue, setCommValue] = useState('');

    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    const toggleDay = (day) => {
        setSelectedDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const handleSave = () => {
        // Logic to save the rule would go here
        navigate('/commission-management');
    };

    return (
        <AdminLayout title="Commission Management">
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate('/commission-management')}
                    className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                >
                    <i className="bi bi-chevron-left text-sm"></i>
                </button>
                <h2 className="text-xl font-[600] text-gray-900 tracking-tight">Set Vehicle Type Commission</h2>
            </div>

            <div className="max-w-6xl mx-auto bg-white border border-gray-100 rounded-[30px] overflow-hidden shadow-2xl shadow-gray-100">
                {/* Form Header */}
                <div className="bg-[#D10000] px-8 py-6 flex items-center gap-4">
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
                                    <select
                                        value={selectedCarType}
                                        onChange={(e) => setSelectedCarType(e.target.value)}
                                        className="w-full h-[60px] px-6 bg-gray-50/50 border border-[#E5E7EB] rounded-[15px] text-[15px] font-[600] text-[#111] focus:border-[#D10000] focus:bg-white focus:ring-4 focus:ring-red-50 outline-none appearance-none transition-all cursor-pointer"
                                    >
                                        <option value="">Select a vehicle type...</option>
                                        <option value="STANDARD">STANDARD</option>
                                        <option value="SUV">SUV</option>
                                        <option value="VAN">VAN</option>
                                        <option value="PREMIUM">PREMIUM</option>
                                    </select>
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <i className="bi bi-chevron-down text-lg"></i>
                                    </div>
                                </div>
                            </div>

                            {/* Service Area */}
                            <div className="space-y-2">
                                <label className="block text-[14px] font-[600] text-[#4B5563] uppercase tracking-widest">
                                    Service Area <span className="text-[#D10000]">*</span>
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedArea}
                                        onChange={(e) => setSelectedArea(e.target.value)}
                                        className="w-full h-[60px] px-6 bg-gray-50/50 border border-[#E5E7EB] rounded-[15px] text-[15px] font-[600] text-[#111] focus:border-[#D10000] focus:bg-white focus:ring-4 focus:ring-red-50 outline-none appearance-none transition-all cursor-pointer"
                                    >
                                        <option value="">Select an area...</option>
                                        <option value="Downtown">Downtown</option>
                                        <option value="Airport">Airport</option>
                                        <option value="Suburbs">Suburbs</option>
                                    </select>
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <i className="bi bi-chevron-down text-lg"></i>
                                    </div>
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
                                    className="py-3 px-6 h-[60px] bg-white border border-[#E5E7EB] rounded-full text-[14px] font-[600] text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-95 uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="py-3 px-6 h-[60px] bg-[#D10000] rounded-full text-[14px] font-[600] text-white hover:bg-[#B00000] transition-all shadow-xl shadow-red-100 active:scale-95 uppercase tracking-widest flex items-center justify-center gap-2"
                                >
                                    <i className="bi bi-save2-fill text-lg"></i>
                                    Save New Rule
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div >
        </AdminLayout >
    );
}
