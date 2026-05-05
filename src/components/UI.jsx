import React, { createContext, useContext, useState, useCallback } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export const Table = ({ headers, children, headerBg = 'bg-[#FFEEEE]', tableClassName = '', headerAlign = '', headerTextColor = 'text-[#222]' }) => (
    <div className="overflow-x-auto rounded-[30px] border border-[#E5E7EB] shadow-riden">
        <table className={`w-full text-left border-collapse ${tableClassName}`}>
            <thead>
                <tr className={`${headerBg}`}>
                    {headers.map((header, i) => {
                        const isObject = typeof header === 'object';
                        const label = isObject ? header.label : header;
                        const align = isObject ? header.align : headerAlign;
                        return (
                            <th key={i} className={`py-[22px] px-[30px] text-sm font-[800] ${headerTextColor} capitalize whitespace-nowrap ${align}`}>
                                {label}
                            </th>
                        );
                    })}
                </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
                {children}
            </tbody>
        </table>
    </div>
);

export const Badge = ({ children, variant = 'info' }) => {
    const variants = {
        online: 'bg-[#D1F8D3] text-[#065F46]',
        offline: 'bg-[#FFE4E6] text-[#9F1239]',
        blocked: 'bg-[#FEE2E2] text-[#991B1B]',
        suspended: 'bg-[#FEF3C7] text-[#92400E]',
        success: 'bg-[#D1F8D3] text-[#065F46]',
        danger: 'bg-[#FFE4E6] text-[#9F1239]',
        warning: 'bg-[#FFFBEB] text-[#92400E]',
        info: 'bg-[#EFF6FF] text-[#1E40AF]',
    };
    return (
        <span className={`px-[20px] py-[6px] rounded-[30px] text-[12px] font-[800] inline-flex items-center justify-center ${variants[variant] || variants.info}`}>
            {children}
        </span>
    );
};

export const Button = ({ children, variant = 'primary', className = '', ...props }) => {
    const variants = {
        primary: 'bg-[#D10000] text-white hover:bg-[#A30000] shadow-[0_4px_12px_rgba(209,0,0,0.1)]',
        secondary: 'bg-[#4B49AC] text-white hover:bg-[#3f3e91]',
        outline: 'border-2 border-[#D10000] bg-white text-[#111] hover:bg-[#F9FAFB]',
        dark: 'border-2 border-[#111] bg-white text-[#111] hover:bg-[#111] hover:text-white',
        pill: 'bg-[#D10000] text-white hover:bg-[#A30000] rounded-full px-8 py-3 shadow-lg',
    };
    return (
        <button
            className={`px-[24px] py-[10px] rounded-[12px] font-[800] text-[13px] transition-all duration-300 flex items-center justify-center gap-[10px] uppercase  tracking-wider ${variants[variant] || variants.primary} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

export const Label = ({ children, className = '' }) => (
    <label className={`block text-[13px] font-[800] text-[#111] mb-[10px] uppercase tracking-[0.5px] ${className}`}>
        {children}
    </label>
);

export const InputWrapper = ({ icon, children, className = '', style = {} }) => (
    <div
        className={`relative flex items-center bg-[#fdfdfd] border-[1.5px] border-[#E5E7EB] rounded-[14px] px-[18px] py-[14px] focus-within:border-[#D10000] focus-within:ring-[5px] focus-within:ring-[#e13437]/10 transition-all duration-200 ${className}`}
        style={style}
    >
        {icon && <i className={`${icon} text-[#999] mr-[15px] text-[18px]`}></i>}
        {children}
    </div>
);

export const Input = ({ className = '', ...props }) => (
    <input
        className={`bg-transparent border-none outline-none text-[14px] font-[600] w-full text-[#111] placeholder-[#999] p-0 ${className}`}
        {...props}
    />
);

export const Select = ({ children, className = '', ...props }) => (
    <select
        className={`bg-transparent border-none outline-none text-[14px] font-[600] w-full text-[#111] appearance-none p-0 cursor-pointer ${className}`}
        {...props}
    >
        {children}
    </select >
);

export const PageContainer = ({ children, className = '' }) => (
    <div className={`max-w-[1600px] mx-auto ${className}`}>
        {children}
    </div>
);

export const SearchBar = ({ placeholder = 'Search...', className = '', ...props }) => (
    <div className={`relative flex items-center group ${className}`}>
        <div className="absolute left-1.5 w-10 h-10 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)] rounded-full flex items-center justify-center z-10 transition-transform group-focus-within:scale-[0.98]">
            <i className="bi bi-search text-[#D10000] text-[18px]"></i>
        </div>
        <input
            type="text"
            placeholder={placeholder}
            className="w-full pl-14 pr-4 py-[14px] bg-[#EEEEEE] border-none rounded-full text-[14px] font-[600] text-[#111] placeholder-[#999] focus:outline-none focus:ring-2 focus:ring-[#D10000]/10 transition-all duration-200"
            {...props}
        />
    </div>
);

export const MiniChart = ({ variant = 'green', data = [30, 50, 40, 75, 100, 60, 25] }) => {
    const colors = {
        green: 'bg-[#10B981]',
        yellow: 'bg-[#FBBF24]',
    };
    return (
        <div className="flex items-end gap-2 h-[80px]">
            {data.map((h, i) => (
                <div
                    key={i}
                    className={`w-[14px] rounded-full ${colors[variant] || colors.green}`}
                    style={{ height: `${h}%` }}
                ></div>
            ))}
        </div>
    );
};

export const Tabs = ({ options, activeTab, onTabChange, className = '' }) => (
    <div className={`bg-[#D10000] rounded-full p-1.5 flex flex-wrap gap-2 w-fit mb-4 ${className}`}>
        {options.map((opt) => (
            <button
                key={opt.id}
                onClick={() => onTabChange(opt.id)}
                className={`px-8 py-3 rounded-full text-[14px] font-[700] transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === opt.id
                    ? 'bg-white text-[#D10000] shadow-md'
                    : 'text-white hover:bg-white/10'
                    }`}
            >
                {opt.label || opt.id}
                {opt.count !== undefined && (
                    <span className={`text-[12px] px-2 py-0.5 rounded-full ${activeTab === opt.id ? 'bg-[#D10000]/10 text-[#D10000]' : 'bg-black/20 text-white'}`}>
                        {opt.count}
                    </span>
                )}
            </button>
        ))}
    </div>
);

export const PillTabs = ({ options, activeTab, onTabChange, className = '' }) => (
    <div className={`bg-[#D10000] rounded-full p-1.5 flex w-fit ${className}`}>
        {options.map((tab) => (
            <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-8 py-3 rounded-full text-[15px] font-[700] transition-all duration-300 ${activeTab === tab.id
                    ? 'bg-white text-[#D10000] shadow-md'
                    : 'text-white hover:bg-white/10'
                    }`}
            >
                {tab.label}
            </button>
        ))}
    </div>
);

export const PeriodFilter = ({ value, onChange, className = '' }) => (
    <div className={`relative group ${className}`}>
        <select
            value={value}
            onChange={onChange}
            className="pl-5 pr-15 py-2.5 bg-white border-[1.5px] border-[#666]/20 rounded-full text-[14px] font-[600] text-[#111] appearance-none outline-none focus:border-[#D10000] cursor-pointer shadow-sm"
        >
            <option>Today</option>
            <option>This Week</option>
            <option>This Month</option>
            <option>This Year</option>
        </select>
        <i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-[#D10000] text-[12px] pointer-events-none"></i>
    </div>
);

export const DateRangePicker = ({ startDate, endDate, onStartDateChange, onEndDateChange, className = '' }) => (
    <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex gap-2">
            <div className="relative border border-[#D10000] w-[180px] rounded-full">
                <div className="absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#D10000] flex items-center justify-center text-white z-10">
                    <i className="bi bi-calendar-check text-[14px]"></i>
                </div>
                <DatePicker
                    selected={startDate}
                    onChange={onStartDateChange}
                    placeholderText="From"
                    maxDate={new Date()}
                    dateFormat="d-MMM-yyyy"
                    className="pl-11 pr-4 py-2.5 bg-white text-[14px] font-[600] w-full outline-none transition-all rounded-full"
                />
            </div>
            <div className="relative border border-[#D10000] w-[180px] rounded-full">
                <div className="absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#D10000] flex items-center justify-center text-white z-10">
                    <i className="bi bi-calendar-check text-[14px]"></i>
                </div>
                <DatePicker
                    selected={endDate}
                    onChange={onEndDateChange}
                    placeholderText="To"
                    minDate={startDate}
                    maxDate={new Date()}
                    dateFormat="d-MMM-yyyy"
                    className="pl-11 pr-4 py-2.5 bg-white text-[14px] font-[600] w-full outline-none transition-all rounded-full"
                />
            </div>
        </div>
    </div>
);

export const DatePickerStyles = () => (
    <style dangerouslySetInnerHTML={{
        __html: `
        .react-datepicker-wrapper { display: block; }
        .react-datepicker__input-container input { width: 100%; border: none; background: transparent; }
        .react-datepicker-popper { z-index: 9999 !important; }
        .react-datepicker {
            border: 1.5px solid #D10000 !important;
            border-radius: 20px !important;
            overflow: hidden;
            font-family: inherit !important;
            box-shadow: 0 10px 30px rgba(209,0,0,0.15) !important;
        }
        .react-datepicker__header {
            background-color: #D10000 !important;
            border-bottom: none !important;
            padding-top: 15px !important;
        }
        .react-datepicker__navigation {
            top: 15px !important;
        }
        .react-datepicker__current-month {
            color: white !important;
            font-weight: 700 !important;
            font-size: 15px !important;
            margin-bottom: 8px !important;
        }
        .react-datepicker__day-name {
            color: #111 !important;
            font-weight: 700 !important;
        }
        .react-datepicker__day--selected, .react-datepicker__day--keyboard-selected {
            background-color: #D10000 !important;
            color: white !important;
            border-radius: 8px !important;
        }
        .react-datepicker__day:hover {
            background-color: #FFF1F1 !important;
            border-radius: 8px !important;
        }
        .react-datepicker__navigation-icon::before {
            border-color: white !important;
        }
    ` }} />
);

export const Pagination = ({ totalItems, itemsPerPage = 10, currentPage = 1, onPageChange }) => {
    if (!totalItems || totalItems <= itemsPerPage) return null;

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const handlePrev = () => {
        if (currentPage > 1) onPageChange(currentPage - 1);
    };

    const handleNext = () => {
        if (currentPage < totalPages) onPageChange(currentPage + 1);
    };

    // Simple page numbers generator
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
    }

    return (
        <div className="flex justify-end items-center gap-2 mt-6 list-none">
            <button
                onClick={handlePrev}
                disabled={currentPage === 1}
                className={`w-[34px] h-[34px] flex items-center justify-center rounded-full transition-all ${currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-[#f1f1f1] text-[#111] hover:bg-[#D10000] hover:text-white'
                    }`}
            >
                <i className="bi bi-chevron-left"></i>
            </button>

            {pages.map(page => (
                <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`w-[34px] h-[34px] flex items-center justify-center rounded-full font-[800] text-[13px] transition-all ${currentPage === page
                        ? 'bg-[#D10000] text-white shadow-lg shadow-red-100 ring-2 ring-[#D10000]/20'
                        : 'border border-gray-100 text-[#374151] hover:bg-[#D10000] hover:text-white'
                        }`}
                >
                    {page}
                </button>
            ))}

            <button
                onClick={handleNext}
                disabled={currentPage === totalPages}
                className={`w-[34px] h-[34px] flex items-center justify-center rounded-full transition-all ${currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-[#D10000] text-white shadow-lg shadow-red-100 ring-2 ring-[#D10000]/20'
                    }`}
            >
                <i className="bi bi-chevron-right text-lg"></i>
            </button>
        </div>
    );
};

export const DeleteModal = ({ isOpen, onClose, onConfirm, title = "Are you sure?", itemName = "" }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}></div>
            <div className="bg-white rounded-[30px] p-8 w-full max-w-md relative z-10 shadow-2xl animate-scale-up text-center border border-gray-100">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-100">
                    <i className="bi bi-trash3-fill text-[#D10000] text-[32px]"></i>
                </div>
                <h3 className="text-[22px] font-[800] text-[#111] mb-2 tracking-tight">{title}</h3>
                <p className="text-[14px] font-[600] text-[#6B7280] mb-8 leading-relaxed">
                    Once you delete <span className="text-[#111] font-[800]">{itemName || "this item"}</span>, it cannot be undone. Are you certain?
                </p>
                <div className="flex flex-col gap-3">
                    <button
                        onClick={onConfirm}
                        className="w-full py-4 bg-[#D10000] text-white rounded-full font-[800] text-[15px] uppercase tracking-wider hover:bg-[#A30000] transition-all shadow-lg shadow-red-100"
                    >
                        Yes, Delete it
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-white text-[#4B5563] border-none rounded-full font-[800] text-[15px] uppercase tracking-wider hover:bg-gray-50 transition-all font-black"
                    >
                        No, Keep it
                    </button>
                </div>
            </div>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes scale-up { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .animate-fade-in { animation: fade-in 0.3s ease-out; }
                .animate-scale-up { animation: scale-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
            ` }} />
        </div>
    );
};

export const ConfirmationModal = ({ isOpen, onClose, onConfirm, type = "approve", targetName = "", actionName = "" }) => {
    if (!isOpen) return null;
    const isApprove = type === 'approve';
    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}></div>
            <div className="bg-white rounded-[24px] p-8 w-full max-w-[420px] relative z-10 shadow-2xl animate-scale-up text-center border border-gray-100">
                <div className="flex items-center justify-center mx-auto mb-6">
                    {isApprove ? (
                        <svg width="56" height="56" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M24 0L29.35 6.27L37.5 5.25L40.03 13.06L47.53 16.34L45.41 24L47.53 31.66L40.03 34.94L37.5 42.75L29.35 41.73L24 48L18.65 41.73L10.5 42.75L7.97 34.94L0.47 31.66L2.59 24L0.47 16.34L7.97 13.06L10.5 5.25L18.65 6.27L24 0Z" fill="#12B76A" />
                            <path d="M20 30L14 24L16.8 21.2L20 24.4L31.2 13.2L34 16L20 30Z" fill="white" />
                        </svg>
                    ) : (
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="24" cy="24" r="24" fill="#F03D3D" />
                            <path d="M30 18L18 30" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
                            <path d="M18 18L30 30" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                    )}
                </div>
                <p className="text-[16px] font-[500] text-[#111] mb-8 leading-relaxed">
                    Are you sure to {isApprove ? 'approve' : 'Reject'} the <span className="text-[#F03D3D]">{targetName}</span>
                    <br />
                    {actionName} request
                </p>
                <div className="flex gap-4">
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-3.5 bg-[#F03D3D] hover:bg-[#D10000] text-white rounded-[12px] font-[800] text-[16px] transition-all"
                    >
                        Confirm
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 py-3.5 bg-white text-[#111] border border-[#111] rounded-[12px] font-[800] text-[16px] hover:bg-gray-50 transition-all font-black"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ImageModal = ({ isOpen, onClose, imageUrl }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in" onClick={onClose}></div>
            <div className="relative max-w-[90vw] max-h-[90vh] z-10 animate-scale-up group">
                <button
                    onClick={onClose}
                    className="absolute -top-12 right-0 w-10 h-10 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center transition-all"
                >
                    <i className="bi bi-x-lg"></i>
                </button>
                <img
                    src={imageUrl}
                    className="w-full h-full object-contain rounded-2xl shadow-2xl border-4 border-white/10"
                    alt="Preview"
                />
            </div>
        </div>
    );
};

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const getToastStyle = (type) => {
        switch (type) {
            case 'error':
            case 'delete':
                return 'bg-[#111111] text-white shadow-black/20';
            case 'success':
            case 'add':
            case 'update':
            case 'info':
            default:
                return 'bg-[#12B76A] text-white shadow-green-100';
        }
    };

    const getToastIcon = (type) => {
        switch (type) {
            case 'error':
                return 'bi-exclamation-triangle-fill';
            case 'delete':
                return 'bi-trash3-fill';
            case 'success':
            case 'add':
            case 'update':
                return 'bi-check-all';
            case 'info':
            default:
                return 'bi-info-circle-fill';
        }
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed top-12 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
                {toasts.map(toast => (
                    <div key={toast.id} className={`min-w-[320px] px-6 py-4 rounded-[20px] shadow-2xl flex items-center justify-between gap-4 animate-slide-in-right pointer-events-auto border-l-4 ${getToastStyle(toast.type)} ${toast.type === 'error' || toast.type === 'delete' ? 'border-red-500' : 'border-white/20'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${toast.type === 'error' || toast.type === 'delete' ? 'bg-red-500' : 'bg-white/20'}`}>
                                <i className={`bi ${getToastIcon(toast.type)} text-lg`}></i>
                            </div>
                            <div className="flex flex-col">
                                <span className="font-[800] text-[14px] uppercase tracking-wide">{toast.type}</span>
                                <span className="font-[600] text-[13px] opacity-90">{toast.message}</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
                        >
                            <i className="bi bi-x text-xl"></i>
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast must be used within ToastProvider");
    return context;
};
