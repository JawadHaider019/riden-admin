import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { InputWrapper, Input, useToast } from '@/components/UI';
import { getDriverById, updateDriver, toggleDriverStatus, deleteDriver, updateDocumentStatus } from '../../api/driverApi';
import { getImageUrl } from '@/api/api';
import { formatDate } from '@/utils/formatters';

export default function DriverDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('personal');
    const [openDocIndex, setOpenDocIndex] = useState(null);
    const [modalType, setModalType] = useState(null);
    const [showAllRides, setShowAllRides] = useState(false);
    const [driverStatus, setDriverStatus] = useState('active'); // 'active', 'blocked', 'suspended'
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [driver, setDriver] = useState(null);
    const [originalDriver, setOriginalDriver] = useState(null);
    const [updating, setUpdating] = useState(false);
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [timeLeft, setTimeLeft] = useState(null);
    const [suspensionForm, setSuspensionForm] = useState({
        type: 'Minutes',
        duration: '',
        reason: ''
    });
    const [rejectionModal, setRejectionModal] = useState({
        isOpen: false,
        docId: null,
        docName: '',
        rejectionReason: ''
    });

    const checkSuspensionTimeout = (until) => {
        if (!until) return null;
        const now = new Date().getTime();
        const end = new Date(until).getTime();
        const diff = end - now;

        if (diff <= 0) return 0;

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        return `${hours}h ${minutes}m ${seconds}s`;
    };

    useEffect(() => {
        if (driverStatus === 'suspended' && driver?.suspended_until) {
            console.log("Suspension timer started for:", driver.suspended_until);
            const timer = setInterval(() => {
                const remaining = checkSuspensionTimeout(driver.suspended_until);
                if (remaining === 0) {
                    console.log("Suspension expired, reverting to active");
                    clearInterval(timer);
                    showToast("Suspension period completed. Driver is now active.", "success");
                    setDriverStatus('active');
                    setDriver(prev => ({ ...prev, status: 'Active', suspended_until: null }));
                } else {
                    setTimeLeft(remaining);
                }
            }, 1000);
            return () => clearInterval(timer);
        } else {
            console.log("Suspension timer not running. Status:", driverStatus, "Until:", driver?.suspended_until);
        }
    }, [driverStatus, driver?.suspended_until]);

    const fetchDriverDetail = useCallback(async () => {
        try {
            setLoading(true);
            const response = await getDriverById(id);
            const driverData = response.data || response;

            if (!driverData) {
                setDriver(null);
                return;
            }

            const finalDriver = {
                ...driverData,
                id: driverData.id,
                unique_id: driverData.unique_id,
                name: driverData.name || `${driverData.first_name || ''} ${driverData.last_name || ''}`.trim() || 'N/A',
                since: driverData.created_at ? `Since ${formatDate(driverData.created_at)}` : 'N/A',
                rating: driverData.rating || 5,
                reviews_count: driverData.reviews_count || 0,
                stats: {
                    total_rides: driverData.total_rides || driverData.stats?.total_rides || 0,
                    completed_rides: driverData.completed_rides || driverData.stats?.completed_rides || 0,
                    revenue: driverData.revenue || driverData.stats?.revenue || '$0.00'
                },
                vehicle: driverData.vehicle ? {
                    ...driverData.vehicle,
                    license_plate: driverData.vehicle.license_plate || 'N/A',
                    type: driverData.vehicle.type || 'N/A'
                } : {
                    model: driverData.vehicle_model || 'N/A',
                    year: driverData.vehicle_year || 'N/A',
                    color: driverData.vehicle_color || 'N/A',
                    license_plate: driverData.license_plate || 'N/A',
                    type: driverData.vehicle_type || 'N/A'
                },
                gender: driverData.gender || 'N/A',
                phone: driverData.phone || 'N/A',
                email: driverData.email || 'N/A',
                avatar: driverData.avatar || driverData.profile_image || null,
                documents: driverData.documents || [],
                payments: driverData.payments || {
                    p1: 'N/A', p2: 'N/A', p3: 'N/A',
                    o1: 'N/A', o2: 'N/A'
                }
            };
            setDriver(finalDriver);
            setOriginalDriver(JSON.parse(JSON.stringify(finalDriver)));
            const rawStatus = driverData.status?.toLowerCase() || 'active';
            const hasSuspension = !!driverData.suspended_until || rawStatus === 'inactive' || rawStatus === 'suspend' || rawStatus === 'suspended';
            const normalizedStatus =
                hasSuspension ? 'suspended' :
                    (rawStatus === 'block' || rawStatus === 'blocked') ? 'blocked' :
                        rawStatus;
            setDriverStatus(normalizedStatus);
        } catch (error) {
            console.error("Error fetching driver:", error);
            showToast("Failed to load driver details", "error");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchDriverDetail();
    }, [fetchDriverDetail]);

    const handleEditClick = () => {
        if (!isEditing) {
            setOriginalDriver(JSON.parse(JSON.stringify(driver)));
            setIsEditing(true);
        } else {
            // Cancel case
            setDriver(JSON.parse(JSON.stringify(originalDriver)));
            setAvatarFile(null);
            setAvatarPreview(null);
            setIsEditing(false);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleUpdate = async () => {
        try {
            setUpdating(true);
            // Split name back into first and last
            const nameParts = driver.name.trim().split(' ');
            const updateData = {
                first_name: nameParts[0] || '',
                last_name: nameParts.slice(1).join(' ') || '',
                email: driver.email,
                phone: driver.phone,
                gender: driver.gender,
                // Vehicle Info (often required by backend even on partial updates)
                vehicle_model: driver.vehicle?.model,
                vehicle_year: driver.vehicle?.year,
                vehicle_color: driver.vehicle?.color,
                license_plate: driver.vehicle?.license_plate || driver.license_plate,
                vehicle_type: driver.vehicle?.type,
            };

            const response = await updateDriver(driver.id, updateData);
            if (response.status === 'success') {
                showToast("Driver updated successfully", "success");
                setOriginalDriver(JSON.parse(JSON.stringify(driver)));
                setIsEditing(false);
            }
        } catch (error) {
            console.error("Update error:", error);

            // Comprehensive error handling for 422 validation errors
            const errorData = error.response?.data;
            let errorMessage = errorData?.message || "Update failed";

            if (errorData?.errors) {
                // Get the first validation error message
                const firstErrorKey = Object.keys(errorData.errors)[0];
                errorMessage = errorData.errors[firstErrorKey][0];
            }

            showToast(errorMessage, "error");
        } finally {
            setUpdating(false);
        }
    };

    const handleDocumentStatusChange = async (docId, status, docName) => {
        if (!docId) {
            showToast("Document ID missing. Select another document or refresh.", "error");
            return;
        }

        if (status === 'Rejected') {
            setRejectionModal({
                isOpen: true,
                docId,
                docName,
                rejectionReason: ''
            });
            return;
        }

        try {
            setUpdating(true);
            await updateDocumentStatus(driver.id, docId, { status });
            showToast(`${docName} status updated to ${status}`, "success");
            fetchDriverDetail();
        } catch (error) {
            console.error("Error updating document status:", error);
            const errorData = error.response?.data;
            let errorMessage = errorData?.message || "Failed to update document status";

            if (errorData?.errors) {
                const firstErrorKey = Object.keys(errorData.errors)[0];
                errorMessage = errorData.errors[firstErrorKey][0];
            }
            showToast(errorMessage, "error");
        } finally {
            setUpdating(false);
        }
    };

    const handleRejectionSubmit = async () => {
        if (!rejectionModal.rejectionReason.trim()) {
            showToast("Please provide a rejection reason", "error");
            return;
        }

        try {
            setUpdating(true);
            await updateDocumentStatus(driver.id, rejectionModal.docId, {
                status: 'Rejected',
                rejection_reason: rejectionModal.rejectionReason
            });
            showToast(`${rejectionModal.docName} rejected`, "success");
            setRejectionModal({ ...rejectionModal, isOpen: false });
            fetchDriverDetail();
        } catch (error) {
            console.error("Error rejecting document:", error);
            const errorData = error.response?.data;
            let errorMessage = errorData?.message || "Failed to reject document";

            if (errorData?.errors) {
                const firstErrorKey = Object.keys(errorData.errors)[0];
                errorMessage = errorData.errors[firstErrorKey][0];
            }
            showToast(errorMessage, "error");
        } finally {
            setUpdating(false);
        }
    };

    const tabs = [
        { id: 'personal', label: 'Personal Information', icon: 'bi bi-person-fill' },
        { id: 'documents', label: 'Documents', icon: 'bi bi-file-text-fill' },
        { id: 'vehicle', label: 'Vehicle Information', icon: 'bi bi-car-front-fill' },
        { id: 'rides', label: 'All Rides', icon: 'bi bi-truck-front-fill' },
        { id: 'payments', label: 'Payment Methods', icon: 'bi bi-wallet-fill' }
    ];

    if (loading) {
        return (
            <AdminLayout title="Driver Details">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin inline-block w-8 h-8 border-4 border-red-600 rounded-full border-t-transparent"></div>
                </div>
            </AdminLayout>
        );
    }

    if (!driver) {
        return (
            <AdminLayout title="Driver Details">
                <div className="text-center py-20">
                    <h3 className="text-xl font-[600] text-gray-800">Driver not found</h3>
                    <Link to="/drivers" className="text-red-600 hover:underline mt-4 inline-block font-semibold">Back to Drivers</Link>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="Driver Details">
            <div className="max-w-6xl mx-auto mb-4">

                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <Link to="/drivers" className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors">
                            <i className="bi bi-chevron-left text-sm"></i>
                        </Link>
                        <div className="relative">
                            <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 bg-gray-200">
                                <img
                                    src={
                                        avatarPreview ||
                                        (driver.avatar ? getImageUrl(driver.avatar) : driver.avatar_url)
                                    }
                                    className="w-full h-full object-cover"
                                    alt=""
                                    onError={(e) => {
                                        if (!e.target.src.includes('ui-avatars.com')) {
                                            e.target.src = `https://ui-avatars.com/api/?name=${driver.name || driver.first_name}&background=random`;
                                        }
                                    }}
                                />
                            </div>
                            <div className={`absolute top-0 -left-1 w-3.5 h-3.5 border-2 border-white rounded-full ${driverStatus === 'active' ? 'bg-green-500' : driverStatus === 'blocked' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-[600] text-black">{driver.name}</h2>
                                <span className={`text-[10px] font-[600] px-2 py-0.5 rounded-full uppercase tracking-wider ${driverStatus === 'active' ? 'bg-green-100 text-green-600' : driverStatus === 'blocked' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                    {driverStatus === 'active' ? 'Active' : driverStatus === 'blocked' ? 'Blocked' : 'Suspended'}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 mt-0.5 text-xs font-semibold text-gray-500">
                                <div className="flex gap-0.5 text-[#FBBF24]">
                                    {[1, 2, 3, 4, 5].map(s => <i key={s} className="bi bi-star-fill text-[12px]"></i>)}
                                </div>
                                <span className="ml-1">({driver.reviews_count})</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right mr-2">
                            <div className="text-[10px] font-[600] text-gray-400 uppercase tracking-widest">{driver.since}</div>
                            <div className="text-xs font-[600] text-black uppercase tracking-tighter">Registered</div>
                        </div>
                        <button
                            onClick={handleEditClick}
                            className="px-6 py-2 rounded-full text-xs font-[600] uppercase tracking-widest transition-all shadow-sm bg-[#D10000] text-white hover:bg-[#b00000] active:scale-95"
                        >
                            {isEditing ? 'Cancel' : 'Edit profile'}
                        </button>
                    </div>
                </div>

                {/* Stats Banner */}
                <div className="bg-[#FFEAEA] rounded-[16px] py-6 px-10 mb-8 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm">
                    {/* Total Rides */}
                    <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#D10000] shadow-sm shrink-0">
                            <i className="bi bi-car-front-fill text-xl"></i>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold text-gray-800 mb-0.5">Total Rides</span>
                            <span className="text-2xl font-[600] text-black leading-none">{driver.stats.total_rides}</span>
                        </div>
                    </div>

                    <div className="hidden md:block w-0.5 h-12 bg-[#D10000]"></div>

                    {/* Completed Rides */}
                    <div className="flex items-center gap-4 flex-1 justify-center">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#D10000] shadow-sm shrink-0">
                            <i className="bi bi-check-circle-fill text-xl"></i>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold text-gray-800 mb-0.5">Completed Rides</span>
                            <span className="text-2xl font-[600] text-black leading-none">{driver.stats.completed_rides}</span>
                        </div>
                    </div>

                    <div className="hidden md:block w-0.5 h-12 bg-[#D10000]"></div>

                    {/* Cancelled Rides */}
                    <div className="flex items-center gap-4 flex-1 justify-center">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#D10000] shadow-sm shrink-0">
                            <i className="bi bi-x-circle-fill text-xl"></i>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold text-gray-800 mb-0.5">Cancelled Rides</span>
                            <span className="text-2xl font-[600] text-black leading-none"> 0</span>
                        </div>
                    </div>

                    <div className="hidden md:block w-0.5 h-12 bg-[#D10000]"></div>

                    {/* Revenue */}
                    <div className="flex items-center gap-4 flex-1 justify-end">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#D10000] shadow-sm shrink-0">
                            <i className="bi bi-bar-chart-line-fill text-xl"></i>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold text-gray-800 mb-0.5">Revenue</span>
                            <span className="text-2xl font-[600] text-black leading-none">{driver.stats.revenue}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Left Sidebar */}
                    <div className="lg:col-span-4 flex flex-col gap-6">
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden py-4">
                            {tabs.map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className="w-full relative flex items-center gap-4 py-4 px-8 text-sm font-semibold transition-colors hover:bg-gray-50"
                                    >
                                        {isActive && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-[#D10000] rounded-r-md"></div>
                                        )}
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0 ${isActive ? 'bg-[#FFEAEA] text-[#D10000]' : 'bg-gray-100 text-black'}`}>
                                            <i className={`${tab.icon} text-lg`}></i>
                                        </div>
                                        <span className={`${isActive ? 'text-black font-[600]' : 'text-gray-600'}`}>
                                            {tab.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex flex-col gap-3">
                            {isEditing ? (
                                <button
                                    onClick={handleUpdate}
                                    disabled={updating}
                                    className="w-full py-3.5 rounded-full bg-[#D10000] text-white font-[600] text-sm flex items-center justify-center gap-2 hover:bg-[#b00000] transition-colors shadow-lg active:scale-95"
                                >
                                    {updating ? (
                                        <><i className="bi bi-hourglass-split animate-spin"></i> Updating...</>
                                    ) : (
                                        <><i className="bi bi-check-circle-fill"></i> Update Driver</>
                                    )}
                                </button>
                            ) : (
                                <>
                                    {driverStatus === 'blocked' ? (
                                        <button onClick={() => setModalType('unblock')} className="w-full py-3.5 rounded-full bg-white border border-[#D10000] text-[#D10000] font-[600] text-sm flex items-center justify-center gap-2 hover:bg-red-50 transition-colors shadow-sm">
                                            <i className="bi bi-slash-circle font-[600]"></i> unblock Driver
                                        </button>
                                    ) : (
                                        <button onClick={() => setModalType('block')} className="w-full py-3.5 rounded-full bg-[#D10000] text-white font-[600] text-sm flex items-center justify-center gap-2 hover:bg-[#b00000] transition-colors shadow-sm">
                                            <i className="bi bi-slash-circle font-[600]"></i> Block Driver
                                        </button>
                                    )}
                                </>
                            )}

                            {!isEditing && (
                                <>
                                    {driverStatus === 'suspended' ? (
                                        <button onClick={() => setModalType('suspension_details')} className="w-full py-3.5 rounded-full bg-amber-50 border border-amber-500 text-amber-700 font-[600] text-sm flex items-center justify-center gap-2 hover:bg-amber-100 transition-colors">
                                            <i className="bi bi-info-circle-fill"></i> View Reason & {timeLeft || 'Time Left'}
                                        </button>
                                    ) : (
                                        <button onClick={() => setModalType('suspend')} className="w-full py-3.5 rounded-full bg-white border border-[#D10000] text-[#D10000] font-[600] text-sm flex items-center justify-center gap-2 hover:bg-red-50 transition-colors">
                                            <i className="bi bi-pause-circle-fill"></i> Suspend Driver
                                        </button>
                                    )}
                                    <button onClick={() => setModalType('delete')} className="w-full py-3.5 rounded-full bg-white border border-[#D10000] text-[#D10000] font-[600] text-sm flex items-center justify-center gap-2 hover:bg-red-50 transition-colors">
                                        <i className="bi bi-trash-fill"></i> Delete Driver
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Right Main Content */}
                    <div className="lg:col-span-8">
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                            {/* Active Tab Header */}
                            <div className="bg-[#D10000] px-8 py-5 flex items-center gap-3">
                                <i className={`text-white text-xl ${tabs.find(t => t.id === activeTab)?.icon}`}></i>
                                <h3 className="text-white font-[600] text-base">
                                    {tabs.find(t => t.id === activeTab)?.label}
                                </h3>
                                {/* Removed old edit button as it is now at the top right */}
                            </div>

                            {/* Content Body */}
                            <div className="p-6 ">
                                {activeTab === 'personal' && (
                                    <div className="flex flex-col">
                                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                            <span className="text-sm font-semibold text-gray-500 w-1/3">Profile Image</span>
                                            <div className="w-2/3 flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-gray-200">
                                                    <img
                                                        src={
                                                            avatarPreview ||
                                                            (driver.avatar ? getImageUrl(driver.avatar) : driver.avatar_url)
                                                        }
                                                        className="w-full h-full object-cover"
                                                        alt=""
                                                        onError={(e) => {
                                                            if (!e.target.src.includes('ui-avatars.com')) {
                                                                e.target.src = `https://ui-avatars.com/api/?name=${driver.name || driver.first_name}&background=random`;
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                {isEditing && (
                                                    <label className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-[600] rounded-lg cursor-pointer transition-colors shadow-sm">
                                                        Change Image
                                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                                    </label>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between py-6 border-b border-gray-100">
                                            <span className="text-sm font-semibold text-gray-500 w-1/3">Full Name</span>
                                            {isEditing ? (
                                                <div className="w-2/3">
                                                    <InputWrapper icon="bi bi-person" className="h-10 mb-0">
                                                        <Input
                                                            value={driver.name}
                                                            onChange={e => setDriver({ ...driver, name: e.target.value })}
                                                        />
                                                    </InputWrapper>
                                                </div>
                                            ) : (
                                                <span className="text-sm font-[600] text-gray-900 w-2/3">{driver.name}</span>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between py-6 border-b border-gray-100">
                                            <span className="text-sm font-semibold text-gray-500 w-1/3">Email</span>
                                            {isEditing ? (
                                                <div className="w-2/3">
                                                    <InputWrapper icon="bi bi-envelope" className="h-10 mb-0">
                                                        <Input
                                                            value={driver.email}
                                                            onChange={e => setDriver({ ...driver, email: e.target.value })}
                                                        />
                                                    </InputWrapper>
                                                </div>
                                            ) : (
                                                <span className="text-sm font-[600] text-[#D10000] w-2/3">{driver.email}</span>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between py-6 border-b border-gray-100">
                                            <span className="text-sm font-semibold text-gray-500 w-1/3">Phone Number</span>
                                            <div className="w-2/3 flex items-center gap-2">
                                                {isEditing ? (
                                                    <div className="w-full">
                                                        <InputWrapper icon="bi bi-telephone" className="h-10 mb-0">
                                                            <Input
                                                                value={driver.phone}
                                                                onChange={e => setDriver({ ...driver, phone: e.target.value })}
                                                            />
                                                        </InputWrapper>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm font-[600] text-[#D10000]">{driver.phone}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between py-6 border-b border-gray-100">
                                            <span className="text-sm font-semibold text-gray-500 w-1/3">Gender</span>
                                            {isEditing ? (
                                                <div className="w-2/3">
                                                    <select
                                                        className="w-full h-10 border border-gray-200 rounded-xl px-4 text-sm outline-none focus:border-[#D10000]"
                                                        value={driver.gender}
                                                        onChange={e => setDriver({ ...driver, gender: e.target.value })}
                                                    >
                                                        <option value="Male">Male</option>
                                                        <option value="Female">Female</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                </div>
                                            ) : (
                                                <span className="text-sm font-[600] text-gray-900 w-2/3">{driver.gender}</span>
                                            )}
                                        </div>


                                    </div>
                                )}

                                {activeTab === 'documents' && (
                                    <div className="flex flex-col">
                                        {[
                                            { key: 'proof_of_work_eligibility', name: 'Proof of work Eligibility' },
                                            { key: 'profile_photo', name: 'Profile Photo' },
                                            { key: "class_5_driver's_licence", name: "Class 1, 2 or 4 Driver's Licence" },
                                            { key: 'commercial_driving_record', name: 'ICBC Commercial driving record' },
                                            { key: "owner's_certificate_of_insurance_and_vehicle_registration", name: "Owner's certificate of insurance and vehicle registration" },
                                            { key: 'vehicle_inspection', name: 'Vehicle Inspection' },
                                            { key: 'legal_agreements', name: 'Legal Agreements' },
                                        ].map((docType, idx) => {
                                            const doc = driver.documents?.find(d => d.document_name === docType.key);
                                            const isOpen = openDocIndex === idx;
                                            const status = doc?.status || 'Missing';

                                            return (
                                                <div key={idx} className="flex flex-col border-b border-gray-100">
                                                    <div
                                                        className={`flex items-center justify-between py-5 px-4 cursor-pointer hover:bg-gray-50 transition-colors ${isOpen ? 'bg-gray-50' : ''}`}
                                                        onClick={(e) => {
                                                            if (e.target.tagName !== 'SELECT' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'LABEL') {
                                                                setOpenDocIndex(isOpen ? null : idx);
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-sm font-[600] text-gray-900">{docType.name}</span>
                                                            {isEditing ? (
                                                                <select
                                                                    className="border border-gray-300 rounded text-xs px-2 py-1.5 text-gray-700 outline-none focus:border-[#D10000]"
                                                                    value={status}
                                                                    onChange={(e) => handleDocumentStatusChange(doc?.id, e.target.value, docType.name)}
                                                                >
                                                                    <option value="Missing">Missing</option>
                                                                    <option value="Pending">Pending</option>
                                                                    <option value="Verified">Verified</option>
                                                                    <option value="Rejected">Rejected</option>
                                                                </select>
                                                            ) : (
                                                                <span className={`text-sm font-medium ${status?.toLowerCase() === 'verified' ? 'text-green-600' : status?.toLowerCase() === 'rejected' ? 'text-red-600' : 'text-amber-500'}`}>
                                                                    ({status})
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            {isEditing && (
                                                                <label className="text-xs bg-white border border-gray-300 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-gray-50 font-[600] transition-colors">
                                                                    Upload New
                                                                    <input type="file" className="hidden" />
                                                                </label>
                                                            )}
                                                            <i className={`bi bi-chevron-${isOpen ? 'down' : 'right'} text-gray-800 font-[600] transition-transform`}></i>
                                                        </div>
                                                    </div>
                                                    {isOpen && (
                                                        <div className="px-4 pb-6">
                                                            {doc && doc.file_url ? (
                                                                <div className="w-full rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                                                                    <img
                                                                        src={doc.file_url}
                                                                        alt={docType.name}
                                                                        className="w-full h-auto max-h-[600px] object-contain bg-gray-50"
                                                                        onError={(e) => {
                                                                            e.target.src = 'https://placehold.co/600x400?text=Document+Not+Found';
                                                                        }}
                                                                    />
                                                                    <div className="p-4 bg-white border-t border-gray-100 flex justify-between items-center">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-xs text-gray-500">Uploaded on {formatDate(doc.created_at)}</span>
                                                                            {doc.status?.toLowerCase() === 'rejected' && doc.rejection_reason && (
                                                                                <span className="text-[10px] font-[600] text-red-600 mt-1 italic">Reason: {doc.rejection_reason}</span>
                                                                            )}
                                                                        </div>
                                                                        <a
                                                                            href={doc.file_url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="text-xs font-[600] text-[#D10000] hover:underline"
                                                                        >
                                                                            View Original File
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="w-full py-10 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-500 bg-white">
                                                                    <i className="bi bi-folder-x text-4xl mb-3 text-gray-300"></i>
                                                                    <h4 className="text-base font-[600] text-gray-900 mb-1">No Document Found</h4>
                                                                    <p className="text-sm text-gray-400">This document is missing or still pending review.</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {activeTab === 'vehicle' && (
                                    <div className="flex flex-col">
                                        <div className="relative w-full h-[300px] rounded-2xl overflow-hidden mb-6 mt-2">
                                            <img src="https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=1000" className="w-full h-full object-cover" alt="Vehicle" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                                            <div className="absolute bottom-6 left-6 text-white">
                                                <h3 className="text-2xl font-[600]">{driver.vehicle.color} {driver.vehicle.model}, ({driver.vehicle.license_plate})</h3>
                                            </div>
                                        </div>
                                        <div className="flex flex-col border border-white">
                                            <div className="flex items-center justify-between py-6 border-b border-gray-100">
                                                <span className="text-sm font-semibold text-gray-500 w-1/3">Vehicle Model</span>
                                                {isEditing ? (
                                                    <div className="w-2/3"><InputWrapper icon="bi bi-truck" className="h-10 mb-0"><Input value={driver.vehicle.model} onChange={e => setDriver({ ...driver, vehicle: { ...driver.vehicle, model: e.target.value } })} /></InputWrapper></div>
                                                ) : <span className="text-sm font-[600] text-gray-900 w-2/3">{driver.vehicle.model}</span>}
                                            </div>
                                            <div className="flex items-center justify-between py-6 border-b border-gray-100">
                                                <span className="text-sm font-semibold text-gray-500 w-1/3">Vehicle Year</span>
                                                {isEditing ? (
                                                    <div className="w-2/3"><InputWrapper icon="bi bi-calendar-event" className="h-10 mb-0"><Input value={driver.vehicle.year} onChange={e => setDriver({ ...driver, vehicle: { ...driver.vehicle, year: e.target.value } })} /></InputWrapper></div>
                                                ) : <span className="text-sm font-[600] text-gray-900 w-2/3">{driver.vehicle.year}</span>}
                                            </div>
                                            <div className="flex items-center justify-between py-6 border-b border-gray-100">
                                                <span className="text-sm font-semibold text-gray-500 w-1/3">Vehicle Color</span>
                                                {isEditing ? (
                                                    <div className="w-2/3"><InputWrapper icon="bi bi-palette" className="h-10 mb-0"><Input value={driver.vehicle.color} onChange={e => setDriver({ ...driver, vehicle: { ...driver.vehicle, color: e.target.value } })} /></InputWrapper></div>
                                                ) : <span className="text-sm font-[600] text-gray-900 w-2/3">{driver.vehicle.color}</span>}
                                            </div>
                                            <div className="flex items-center justify-between py-6 border-b border-gray-100">
                                                <span className="text-sm font-semibold text-gray-500 w-1/3">License Plate</span>
                                                {isEditing ? (
                                                    <div className="w-2/3"><InputWrapper icon="bi bi-card-text" className="h-10 mb-0"><Input value={driver.vehicle.license_plate} onChange={e => setDriver({ ...driver, vehicle: { ...driver.vehicle, license_plate: e.target.value } })} /></InputWrapper></div>
                                                ) : <span className="text-sm font-[600] text-[#D10000] tracking-wider w-2/3">{driver.vehicle.license_plate}</span>}
                                            </div>
                                            <div className="flex items-center justify-between py-6 border-b border-gray-100">
                                                <span className="text-sm font-semibold text-gray-500 w-1/3">Vehicle Type</span>
                                                {isEditing ? (
                                                    <div className="w-2/3 flex items-center gap-2">
                                                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-[#D10000] bg-red-50 shrink-0"><i className="bi bi-car-front-fill text-sm"></i></div>
                                                        <InputWrapper icon="bi bi-truck" className="h-10 mb-0 w-full"><Input value={driver.vehicle.type} onChange={e => setDriver({ ...driver, vehicle: { ...driver.vehicle, type: e.target.value } })} /></InputWrapper>
                                                    </div>
                                                ) : (
                                                    <div className="w-2/3 flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[#D10000] bg-red-50"><i className="bi bi-car-front-fill text-sm"></i></div>
                                                        <span className="text-sm font-[600] text-gray-900">{driver.vehicle.type}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'rides' && (
                                    <div className="flex flex-col">
                                        <div className="overflow-x-auto ">
                                            {!driver.rides || driver.rides.length === 0 ? (
                                                <div className="text-center py-20 bg-gray-50 rounded-2xl">
                                                    <i className="bi bi-car-front text-4xl text-gray-300 mb-3 block"></i>
                                                    <p className="text-gray-500 font-medium">No rides found for this driver</p>
                                                </div>
                                            ) : (
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-[#FFEAEA] text-xs font-[600] text-gray-900 border-none">
                                                            <th className="py-4 px-6 rounded-l-xl">Date</th>
                                                            <th className="py-4 px-6">Booking ID</th>
                                                            <th className="py-4 px-6">Customer</th>
                                                            <th className="py-4 px-6 rounded-r-xl">Pickup</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="text-sm">
                                                        {(showAllRides ? driver.rides : driver.rides.slice(0, 5)).map((ride, idx) => (
                                                            <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                                                                <td className="py-4 px-6 text-gray-800 font-medium whitespace-nowrap">{formatDate(ride.created_at)}</td>
                                                                <td className="py-4 px-6 text-gray-800 font-[600] whitespace-nowrap">{ride.unique_id}</td>
                                                                <td className="py-4 px-6 text-gray-600 font-medium whitespace-nowrap">{ride.passenger_name}</td>
                                                                <td className="py-4 px-6 text-gray-600 font-medium">{ride.pickup_address}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                        {driver.rides && driver.rides.length > 5 && (
                                            <div className="mt-6 mb-2 px-6">
                                                <button
                                                    onClick={() => setShowAllRides(!showAllRides)}
                                                    className="text-[#D10000] text-xs font-[600] hover:underline transition-all"
                                                >
                                                    {showAllRides ? 'Show Less' : 'View All'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'payments' && (
                                    <div className="flex flex-col gap-8 mt-4">
                                        {/* Primary Methods */}
                                        <div className="flex flex-col">
                                            <h4 className="text-[#D10000] font-[600] text-sm mb-4">Primary Methods</h4>
                                            <div className="flex flex-col">
                                                <div className="flex items-center justify-between py-6 border-b border-gray-100">
                                                    <span className="text-sm font-[600] text-gray-900 w-1/3">Royal Bank of Canada</span>
                                                    {isEditing ? (
                                                        <div className="w-2/3"><InputWrapper icon="bi bi-credit-card" className="h-10 mb-0"><Input value={driver.payments.p1} onChange={e => setDriver({ ...driver, payments: { ...driver.payments, p1: e.target.value } })} /></InputWrapper></div>
                                                    ) : <span className="text-sm font-semibold text-gray-600 w-2/3">{driver.payments.p1}</span>}
                                                </div>
                                                <div className="flex items-center justify-between py-6 border-b border-gray-100">
                                                    <div className="flex items-center gap-3 w-1/3">
                                                        <div className="w-9 h-5 bg-blue-700 rounded text-white flex items-center justify-center text-[8px] font-[600] italic tracking-wider">VISA</div>
                                                        <span className="text-sm font-[600] text-gray-900">Visa</span>
                                                    </div>
                                                    {isEditing ? (
                                                        <div className="w-2/3"><InputWrapper icon="bi bi-credit-card" className="h-10 mb-0"><Input value={driver.payments.p2} onChange={e => setDriver({ ...driver, payments: { ...driver.payments, p2: e.target.value } })} /></InputWrapper></div>
                                                    ) : <span className="text-sm font-semibold text-gray-600 w-2/3">{driver.payments.p2}</span>}
                                                </div>
                                                <div className="flex items-center justify-between py-6 border-b border-gray-100">
                                                    <div className="flex items-center gap-2 w-1/3">
                                                        <div className="h-6 px-2 border border-gray-300 rounded flex items-center justify-center text-gray-800 text-[10px] font-[600]"><i className="bi bi-apple mr-0.5 mt-[-2px]"></i> Pay</div>
                                                        <span className="text-sm font-[600] text-gray-900">Apple Pay</span>
                                                    </div>
                                                    {isEditing ? (
                                                        <div className="w-2/3"><InputWrapper icon="bi bi-credit-card" className="h-10 mb-0"><Input value={driver.payments.p3} onChange={e => setDriver({ ...driver, payments: { ...driver.payments, p3: e.target.value } })} /></InputWrapper></div>
                                                    ) : <span className="text-sm font-semibold text-gray-600 w-2/3">{driver.payments.p3}</span>}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Other Methods */}
                                        <div className="flex flex-col border border-white mb-2">
                                            <h4 className="text-[#D10000] font-[600] text-sm mb-4">Other Methods</h4>
                                            <div className="flex flex-col">
                                                <div className="flex items-center justify-between py-6 border-b border-gray-100">
                                                    <span className="text-sm font-[600] text-gray-900 w-1/3">Canadian Western Bank</span>
                                                    {isEditing ? (
                                                        <div className="w-2/3"><InputWrapper icon="bi bi-credit-card" className="h-10 mb-0"><Input value={driver.payments.o1} onChange={e => setDriver({ ...driver, payments: { ...driver.payments, o1: e.target.value } })} /></InputWrapper></div>
                                                    ) : <span className="text-sm font-semibold text-gray-600 w-2/3">{driver.payments.o1}</span>}
                                                </div>
                                                <div className="flex items-center justify-between py-6 border-b border-gray-100">
                                                    <div className="flex items-center gap-3 w-1/3">
                                                        <div className="flex -space-x-2">
                                                            <div className="w-5 h-5 rounded-full bg-red-500 opacity-80 mix-blend-multiply"></div>
                                                            <div className="w-5 h-5 rounded-full bg-yellow-500 opacity-80 mix-blend-multiply"></div>
                                                        </div>
                                                        <span className="text-sm font-[600] text-gray-900">Mastercard</span>
                                                    </div>
                                                    {isEditing ? (
                                                        <div className="w-2/3"><InputWrapper icon="bi bi-credit-card" className="h-10 mb-0"><Input value={driver.payments.o2} onChange={e => setDriver({ ...driver, payments: { ...driver.payments, o2: e.target.value } })} /></InputWrapper></div>
                                                    ) : <span className="text-sm font-semibold text-gray-600 w-2/3">{driver.payments.o2}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modals Overlay */}
                {['block', 'unblock', 'delete'].includes(modalType) && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                        <div className="bg-white rounded-[32px] p-8 w-[90%] max-w-sm flex flex-col items-center text-center shadow-2xl">
                            <div className="mb-4">
                                <i className={`text-[40px] text-[#EE1B24] ${modalType === 'delete' ? 'bi bi-trash-fill' : 'bi bi-slash-circle font-[600]'}`}></i>
                            </div>

                            <h3 className="text-xl font-[600] text-gray-900 mb-3">
                                {modalType === 'block' ? 'Block Driver' : modalType === 'unblock' ? 'unblock Driver' : 'Delete Driver'}
                            </h3>

                            <p className="text-xs font-semibold text-gray-600 mb-8 max-w-[250px] mx-auto">
                                {modalType === 'delete' ? (
                                    <>Are you sure to Delete the <span className="text-[#EE1B24]">{driver.name}</span> Driver. This action can't be undone.</>
                                ) : (
                                    <>Are you sure to {modalType === 'block' ? 'Block' : 'unblock'} the <span className="text-[#EE1B24]">{driver.name}</span> Driver</>
                                )}
                            </p>

                            <div className="flex items-center gap-3 w-full">
                                <button className="flex-1 py-3 bg-[#EE1B24] text-white rounded-[12px] font-[600] text-sm hover:bg-[#d01019] transition-colors" onClick={async () => {
                                    try {
                                        if (modalType === 'block' || modalType === 'unblock') {
                                            const newStatus = modalType === 'block' ? 'Blocked' : 'Active';
                                            await updateDriver(driver.id, { status: newStatus });
                                            setDriverStatus(modalType === 'block' ? 'blocked' : 'active');
                                            setDriver(prev => ({ ...prev, status: newStatus }));
                                            showToast(`Driver ${modalType === 'block' ? 'blocked' : 'activated'} successfully`, "success");
                                        }
                                        if (modalType === 'delete') {
                                            await deleteDriver(driver.id);
                                            showToast("Driver deleted successfully", "success");
                                            navigate('/drivers');
                                        }
                                    } catch (error) {
                                        showToast("Action failed", "error");
                                    }
                                    setModalType(null);
                                }}>
                                    Confirm
                                </button>
                                <button className="flex-1 py-3 bg-white text-gray-900 border border-gray-900 rounded-[12px] font-[600] text-sm hover:bg-gray-50 transition-colors" onClick={() => setModalType(null)}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {modalType === 'suspend' && (
                    <div className="fixed top-16 inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                        <div className="bg-white rounded-[30px] p-2 w-[90%] max-w-[360px] flex flex-col shadow-2xl overflow-hidden ">
                            <div className="bg-[#EE1B24] py-3 px-4 rounded-full shadow-sm text-center">
                                <h3 className="text-white font-[600] text-[15px]">Temporarily Suspend Driver</h3>
                            </div>

                            <div className="p-6">
                                <p className="text-[13px] font-medium text-gray-800 mb-6 font-semibold">Driver : {driver.name} (ID: {driver.id})</p>

                                <div className="mb-6">
                                    <p className="text-[15px] font-[600] text-gray-900 mb-3">Duration Type</p>
                                    <div className="flex gap-6">
                                        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-800">
                                            <div className="relative flex items-center justify-center">
                                                <input type="radio" name="durationType" className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-full checked:border-[#EE1B24]" checked={suspensionForm.type === 'Minutes'} onChange={() => setSuspensionForm({ ...suspensionForm, type: 'Minutes' })} />
                                                <div className="absolute w-2.5 h-2.5 bg-[#EE1B24] rounded-full opacity-0 peer-checked:opacity-100"></div>
                                            </div>
                                            Minutes
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-800">
                                            <div className="relative flex items-center justify-center">
                                                <input type="radio" name="durationType" className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-full checked:border-[#EE1B24]" checked={suspensionForm.type === 'Hours'} onChange={() => setSuspensionForm({ ...suspensionForm, type: 'Hours' })} />
                                                <div className="absolute w-2.5 h-2.5 bg-[#EE1B24] rounded-full opacity-0 peer-checked:opacity-100"></div>
                                            </div>
                                            Hours
                                        </label>
                                    </div>
                                </div>

                                <div className="mb-5">
                                    <p className="text-[15px] font-[600] text-gray-900 mb-2">Duration</p>
                                    <input type="number" placeholder={`Enter ${suspensionForm.type}`} className="w-full border border-gray-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#EE1B24] font-medium placeholder:text-gray-400" value={suspensionForm.duration} onChange={(e) => setSuspensionForm({ ...suspensionForm, duration: e.target.value })} />
                                </div>

                                <div className="mb-8">
                                    <p className="text-[15px] font-[600] text-gray-900 mb-2">Reason<span className="text-gray-600 font-medium">(Optional)</span></p>
                                    <textarea placeholder="Write Reason..." rows={4} className="w-full border border-gray-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#EE1B24] resize-none font-medium placeholder:text-gray-400" value={suspensionForm.reason} onChange={(e) => setSuspensionForm({ ...suspensionForm, reason: e.target.value })}></textarea>
                                </div>

                                <div className="flex items-center gap-3 w-full">
                                    <button
                                        className="flex-1 py-3 bg-[#EE1B24] text-white rounded-xl font-[600] text-base hover:bg-[#d01019] transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                                        disabled={!suspensionForm.duration || updating}
                                        onClick={async () => {
                                            try {
                                                setUpdating(true);
                                                const now = new Date();
                                                const durationMs = suspensionForm.type === 'Minutes' ? suspensionForm.duration * 60000 : suspensionForm.duration * 3600000;
                                                const endTimestamp = now.getTime() + durationMs;
                                                const until = new Date(endTimestamp).toISOString();

                                                // Prepare data for API - use 'inactive' as requested for suspended state
                                                const updateData = {
                                                    status: 'inactive',
                                                    suspended_until: until,
                                                    suspension_reason: suspensionForm.reason
                                                };

                                                // Use the general update endpoint instead of toggleStatus to ensure all fields are saved
                                                await updateDriver(driver.id, updateData);

                                                setDriver(prev => ({
                                                    ...prev,
                                                    status: 'inactive',
                                                    suspended_until: until,
                                                    suspension_reason: suspensionForm.reason
                                                }));
                                                setDriverStatus('suspended');
                                                setModalType('suspend_success');
                                                showToast("Driver suspended successfully", "success");
                                            } catch (error) {
                                                console.error("Suspension error:", error);
                                                showToast("Failed to suspend driver", "error");
                                            } finally {
                                                setUpdating(false);
                                            }
                                        }}
                                    >
                                        {updating ? <i className="bi bi-hourglass-split animate-spin"></i> : 'Suspend'}
                                    </button>
                                    <button className="flex-[0.8] py-3 bg-white text-gray-900 border-[1.5px] border-black rounded-xl font-[600] text-base hover:bg-gray-50 transition-colors" onClick={() => setModalType(null)}>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {modalType === 'suspend_success' && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                        <div className="bg-white rounded-[32px] p-8 w-[90%] max-w-sm flex flex-col items-center text-center shadow-2xl pb-10 pt-10">
                            <div className="mb-4 text-[#16A34A]">
                                <i className="bi bi-patch-check-fill text-[75px]"></i>
                            </div>
                            <p className="text-[15px] font-medium text-gray-900 my-4 leading-relaxed px-2">
                                Your Driver <span className="text-[#EE1B24]">{driver.name}</span> is successfully suspended for {suspensionForm.duration} {suspensionForm.type.toLowerCase()}
                            </p>
                            <div className="w-full px-4 mt-2">
                                <button className="w-full py-3.5 bg-[#EE1B24] text-white rounded-[14px] font-[600] text-[17px] hover:bg-[#d01019] transition-colors" onClick={() => { setDriverStatus('suspended'); setModalType(null); }}>
                                    Okay
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Suspension Details Modal */}
                {modalType === 'suspension_details' && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white rounded-[28px] w-full max-w-[340px] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                            {/* Header - Compact Red Style */}
                            <div className="bg-[#EE1B24] p-4 text-white flex justify-between items-center px-6">
                                <h3 className="text-sm font-[600] uppercase tracking-wider">Suspension Details</h3>
                                <button onClick={() => setModalType(null)} className="text-white/80 hover:text-white transition-colors">
                                    <i className="bi bi-x-lg text-sm"></i>
                                </button>
                            </div>

                            <div className="p-6 space-y-5">
                                <div className="text-center">
                                    <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-2 border border-amber-100">
                                        <i className="bi bi-clock-history text-2xl text-amber-500"></i>
                                    </div>
                                    <p className="text-gray-500 text-xs font-semibold">Access restricted temporarily</p>
                                </div>

                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
                                    <div className="text-[9px] font-[600] text-gray-400 uppercase tracking-widest mb-1">Time Remaining</div>
                                    <div className="text-2xl font-[600] text-[#EE1B24] tracking-tighter">
                                        {timeLeft || '00h 00m 00s'}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-[9px] font-[600] text-gray-400 uppercase tracking-widest mb-1.5">Reason</div>
                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-[13px] text-gray-700 leading-snug italic">
                                        "{driver?.suspension_reason || 'No reason provided.'}"
                                    </div>
                                </div>

                                <div className="pt-1">
                                    <button
                                        onClick={() => setModalType(null)}
                                        className="w-full py-3 rounded-full bg-[#EE1B24] text-white font-[600] text-xs hover:bg-[#d01019] transition-all shadow-md active:scale-95"
                                    >
                                        Close Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Document Rejection Modal */}
                {rejectionModal.isOpen && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white rounded-[28px] w-full max-w-[400px] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                            <div className="bg-[#EE1B24] p-4 text-white flex justify-between items-center px-6">
                                <h3 className="text-sm font-[600] uppercase tracking-wider">Reject Document</h3>
                                <button onClick={() => setRejectionModal({ ...rejectionModal, isOpen: false })} className="text-white/80 hover:text-white transition-colors">
                                    <i className="bi bi-x-lg text-sm"></i>
                                </button>
                            </div>

                            <div className="p-6 space-y-5">
                                <div>
                                    <h4 className="text-sm font-[600] text-gray-900 mb-1">{rejectionModal.docName}</h4>
                                    <p className="text-xs text-gray-500">Please provide a reason why this document is being rejected. This will be shown to the driver.</p>
                                </div>

                                <textarea
                                    className="w-full border border-gray-300 rounded-2xl p-4 text-sm focus:outline-none focus:border-[#EE1B24] min-h-[120px] resize-none"
                                    placeholder="Enter rejection reason..."
                                    value={rejectionModal.rejectionReason}
                                    onChange={(e) => setRejectionModal({ ...rejectionModal, rejectionReason: e.target.value })}
                                ></textarea>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setRejectionModal({ ...rejectionModal, isOpen: false })}
                                        className="flex-1 py-3 rounded-full border border-gray-300 text-gray-700 font-[600] text-xs hover:bg-gray-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleRejectionSubmit}
                                        disabled={updating || !rejectionModal.rejectionReason.trim()}
                                        className="flex-1 py-3 rounded-full bg-[#EE1B24] text-white font-[600] text-xs hover:bg-[#d01019] transition-all shadow-md active:scale-95 disabled:opacity-50"
                                    >
                                        {updating ? 'Submitting...' : 'Confirm Rejection'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout >
    );
}
