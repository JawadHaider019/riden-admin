import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { InputWrapper, Input, useToast, Loader, Tooltip, Avatar } from '@/components/UI';
import { getDriverById, updateDriver, toggleDriverStatus, deleteDriver, updateDocumentStatus } from '../../api/driverApi';
import { getImageUrl } from '@/api/api';
import api from '@/api/api';
import { formatDate } from '@/utils/formatters';
import { reverseGeocode, isPlusCode } from '@/utils/geoUtils';
import { useJsApiLoader, GoogleMap, DirectionsService, DirectionsRenderer } from '@react-google-maps/api';

const LIBRARIES = ['places'];

export default function DriverDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('personal');
    const [openDocIndex, setOpenDocIndex] = useState(null);
    const [openVehicleIndex, setOpenVehicleIndex] = useState(0);
    const [modalType, setModalType] = useState(null);
    const [showAllRides, setShowAllRides] = useState(false);
    const [directions, setDirections] = useState(null);

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY,
        libraries: LIBRARIES
    });

    const [mapInstance, setMapInstance] = useState(null);

    const onLoad = useCallback((map) => {
        setMapInstance(map);
    }, []);

    const [driverStatus, setDriverStatus] = useState('requested'); // 'approved', 'blocked', 'suspended', 'requested'
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [driver, setDriver] = useState(null);
    const [originalDriver, setOriginalDriver] = useState(null);
    const [updating, setUpdating] = useState(false);
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [selectedRide, setSelectedRide] = useState(null);
    const [timeLeft, setTimeLeft] = useState(null);
    const [passengersMap, setPassengersMap] = useState({});

    useEffect(() => {
        if (!selectedRide) setDirections(null);
    }, [selectedRide]);

    // Keep selectedRide in sync with enriched data in driver.rides
    useEffect(() => {
        if (selectedRide && driver?.rides) {
            const latestData = driver.rides.find(r => String(r.id) === String(selectedRide.id));
            if (latestData) {
                // If any key data is updated in the list, update our selected snapshot
                const hasUpdates = latestData.pickup_address !== selectedRide.pickup_address ||
                    latestData.dropoff_address !== selectedRide.dropoff_address ||
                    latestData.passenger_name !== selectedRide.passenger_name;

                if (hasUpdates) {
                    setSelectedRide(latestData);
                }
            }
        }
    }, [driver?.rides, selectedRide?.id]);
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
                    revenue: driverData.revenue || driverData.stats?.revenue || 'C$0.00'
                },
                vehicles: driverData.vehicles || (driverData.vehicle ? [{
                    ...driverData.vehicle,
                    license_plate: driverData.vehicle.license_plate || 'Not Assigned',
                    type: driverData.vehicle.type || 'Not Assigned'
                }] : [{
                    model: driverData.vehicle_model || 'Not Assigned',
                    year: driverData.vehicle_year || 'Not Assigned',
                    color: driverData.vehicle_color || 'Not Assigned',
                    license_plate: driverData.license_plate || 'Not Assigned',
                    type: driverData.vehicle_type || 'Not Assigned'
                }]),
                gender: driverData.gender || 'N/A',
                phone: driverData.phone || 'N/A',
                email: driverData.email || 'N/A',
                avatar: driverData.avatar || driverData.profile_image || null,
                documents: driverData.documents || [],
                rides: [],
                payments: driverData.payments || {
                    p1: 'N/A', p2: 'N/A', p3: 'N/A',
                    o1: 'N/A', o2: 'N/A'
                }
            };

            // Strategy: Enrich vehicle types by cross-referencing /admin/vehicles if info is missing
            try {
                const vehiclesToEnrich = finalDriver.vehicles.filter(v => !v.type || typeof v.type !== 'object');
                if (vehiclesToEnrich.length > 0) {
                    const vRes = await api.get('/admin/vehicles');
                    const allVehicles = vRes.data?.data?.data || vRes.data?.data || [];
                    const typesMap = {};
                    allVehicles.forEach(item => {
                        if (item.vehicle_type_id && item.type) {
                            typesMap[item.vehicle_type_id] = item.type;
                        }
                    });

                    finalDriver.vehicles = finalDriver.vehicles.map(v => {
                        if (!v.type || typeof v.type !== 'object') {
                            const typeId = v.vehicle_type_id || v.vehicle_type;
                            if (typeId && typesMap[typeId]) {
                                return { ...v, type: typesMap[typeId] };
                            }
                        }
                        return v;
                    });
                }
            } catch (e) {
                console.error("DEBUG: Failed to enrich vehicle types:", e);
            }


            // Use bookings directly from the driver detail response — no separate API call needed
            const rawBookings = driverData.bookings || driverData.rides || [];
            const enrichedRides = Array.isArray(rawBookings) ? rawBookings : [];
            const totalRideCount = enrichedRides.length;

            finalDriver.stats.total_rides = totalRideCount;
            console.log(`DEBUG: Driver has ${totalRideCount} bookings from detail response`);

            finalDriver.rides = enrichedRides.map(r => ({
                ...r,
                unique_id: r.unique_id || r.id,
                passenger_name: r.passenger_name || (r.passenger ? `${r.passenger.first_name || ''} ${r.passenger.last_name || ''}`.trim() : null),
                passenger_email: r.passenger_email || r.passenger?.email || 'N/A',
                passenger_phone: r.passenger_phone || r.passenger?.phone || 'N/A',
                pickup_address: r.pickup_address || r.pickup_location || null,
                dropoff_address: r.dropoff_address || r.dropoff_location || null
            }));

            console.log("DEBUG: Finalized Driver Data with Rides:", finalDriver);
            setDriver(finalDriver);
            setOriginalDriver(JSON.parse(JSON.stringify(finalDriver)));
            const rawStatus = driverData.status?.toLowerCase() || 'requested';

            // Stricter suspension check: must have a valid date string AND that date must be in the future
            const suspensionDate = driverData.suspended_until ? new Date(driverData.suspended_until) : null;
            const isSuspendedDate = suspensionDate && !isNaN(suspensionDate.getTime()) && suspensionDate > new Date();

            // Strictly separate status logic - only trust the explicit backend status
            let normalizedStatus = rawStatus;

            if (rawStatus === 'rejected') {
                normalizedStatus = 'rejected';
            } else if (rawStatus === 'suspended') {
                normalizedStatus = 'suspended';
            } else if (rawStatus === 'approved') {
                // For already approved drivers, check if they are currently under a timed suspension
                normalizedStatus = isSuspendedDate ? 'suspended' : 'approved';
            } else if (rawStatus === 'requested' || rawStatus === 'pending') {
                normalizedStatus = 'requested';
            } else {
                normalizedStatus = rawStatus;
            }

            console.log(`[StatusDebug] Final UI Status: ${normalizedStatus}`);
            setDriverStatus(normalizedStatus);
        } catch (error) {
            console.error("Error fetching driver:", error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchDriverDetail();
    }, [fetchDriverDetail]);

    // Async resolution for remaining coordinates and names
    useEffect(() => {
        const resolveMissingData = async () => {
            if (!driver?.rides || driver.rides.length === 0) return;

            let updated = false;
            const newRides = await Promise.all(driver.rides.map(async (ride) => {
                let r = { ...ride };

                // 1. Resolve Address if null or it's a Plus Code, but coords exist
                if ((!r.pickup_address || isPlusCode(r.pickup_address)) && r.pickup_lat) {
                    const addr = await reverseGeocode(r.pickup_lat, r.pickup_lng);
                    if (addr) {
                        r.pickup_address = addr;
                        updated = true;
                    }
                }
                if ((!r.dropoff_address || isPlusCode(r.dropoff_address)) && r.dropoff_lat) {
                    const addr = await reverseGeocode(r.dropoff_lat, r.dropoff_lng);
                    if (addr) {
                        r.dropoff_address = addr;
                        updated = true;
                    }
                }

                // 2. Resolve Name if null but ID exists using local map first
                if (!r.passenger_name && r.passenger_id) {
                    const mapped = passengersMap[r.passenger_id];
                    if (mapped) {
                        r.passenger_name = mapped.name;
                        r.passenger_email = mapped.email;
                        r.passenger_phone = mapped.phone;
                        updated = true;
                    } else {
                        // Efficiency: Only fetch if NOT in map and NOT already tried this cycle
                        try {
                            const res = await api.get(`/admin/passengers/${r.passenger_id}`).catch(() => null);
                            if (res) {
                                const p = res.data?.data || res.data;
                                const userData = {
                                    name: `${p.first_name || p.name || ''} ${p.last_name || ''}`.trim(),
                                    email: p.email || 'N/A',
                                    phone: p.phone || 'N/A'
                                };
                                setPassengersMap(prev => ({ ...prev, [p.id]: userData }));
                                r.passenger_name = userData.name;
                                r.passenger_email = userData.email;
                                r.passenger_phone = userData.phone;
                                updated = true;
                            }
                        } catch (e) { /* skip individual failure */ }
                    }
                }

                return r;
            }));

            if (updated) {
                setDriver(prev => ({ ...prev, rides: newRides }));
            }
        };

        const timeout = setTimeout(() => {
            resolveMissingData();
        }, 1000); // Small delay to prioritize main load

        return () => clearTimeout(timeout);
    }, [driver?.id, driver?.rides?.length]);

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
                vehicle_model: driver.vehicles?.[0]?.model,
                vehicle_year: driver.vehicles?.[0]?.year,
                vehicle_color: driver.vehicles?.[0]?.color,
                license_plate: driver.vehicles?.[0]?.license_plate || driver.license_plate,
                vehicle_type: driver.vehicles?.[0]?.type,
                card_number: driver.card_number,
                card_holder_name: driver.card_holder_name,
                cvv: driver.cvv,
                expiry_date: driver.expiry_date,
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
    ].filter(tab => {
        if (driverStatus === 'requested') {
            return tab.id !== 'rides' && tab.id !== 'vehicle';
        }
        return true;
    });

    const requiredDocs = [
        'proof_of_work_eligibility',
        'profile_photo',
        'class_5_drivers_licence',
        'commercial_driving_record',
        'owners_certificate_of_insurance_and_vehicle_registration',
        'vehicle_inspection',
        'child_abuse',
        'police_clearence'
    ];

    const allDocumentsApproved = requiredDocs.every(key => {
        const doc = driver?.documents?.find(d => d.document_name === key);
        return doc && doc.status === 'Verified';
    });

    if (loading) {
        return <Loader />;
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
                            <Avatar
                                src={avatarPreview || (driver.avatar ? getImageUrl(driver.avatar) : driver.avatar_url)}
                                fullName={driver.name}
                                size="w-14 h-14"
                            />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-[600] text-black">{driver.name}</h2>
                                <span className={`text-[10px] font-[600] px-2 py-0.5 rounded-full uppercase tracking-wider ${(driverStatus === 'approved' || driverStatus === 'active') ? 'bg-green-100 text-green-600' :
                                    driverStatus === 'rejected' ? 'bg-red-100 text-red-600' :
                                        driverStatus === 'suspended' ? 'bg-yellow-100 text-yellow-600' :
                                            'bg-blue-100 text-blue-600'
                                    }`}>
                                    {(driverStatus === 'approved' || driverStatus === 'active') ? 'Approved' : driverStatus === 'rejected' ? 'Rejected' : driverStatus === 'suspended' ? 'Suspended' : 'Requested'}
                                </span>
                            </div>
                            {driverStatus !== 'requested' && (
                                <div className="flex items-center gap-1 mt-0.5 text-xs font-semibold text-gray-500">
                                    <div className="flex gap-0.5 text-[#FBBF24]">
                                        {[1, 2, 3, 4, 5].map(s => <i key={s} className="bi bi-star-fill text-[12px]"></i>)}
                                    </div>
                                    <span className="ml-1">({driver.reviews_count || 0})</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right mr-2">
                            <div className="text-[10px] font-[600] text-gray-400 uppercase tracking-widest">{driver.since}</div>
                            <div className="text-xs font-[600] text-black uppercase tracking-tighter">Registered</div>
                        </div>
                        {/* <button
                            onClick={handleEditClick}
                            className="px-6 py-2 rounded-full text-xs font-[600] uppercase tracking-widest transition-all shadow-sm bg-[#D10000] text-white hover:bg-[#b00000] active:scale-95"
                        >
                            {isEditing ? 'Cancel' : 'Edit profile'}
                        </button> */}
                    </div>
                </div>

                {/* Stats Banner */}
                {driverStatus !== 'requested' && (
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
                )}

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
                                    {/* Requested drivers: show Approve / Reject */}
                                    {driverStatus === 'requested' && (
                                        <>
                                            <button
                                                onClick={() => setModalType('approve')}
                                                disabled={!allDocumentsApproved}
                                                title={!allDocumentsApproved ? "All documents must be approved first" : ""}
                                                className={`w-full py-3.5 rounded-full text-white font-[600] text-sm flex items-center justify-center gap-2 transition-colors shadow-sm ${!allDocumentsApproved ? 'bg-gray-400 cursor-not-allowed opacity-70' : 'bg-[#12B76A] hover:bg-[#039855]'}`}
                                            >
                                                <i className="bi bi-check-circle-fill"></i> Approve Driver
                                            </button>
                                            <button onClick={() => setModalType('reject')} className="w-full py-3.5 rounded-full bg-white border border-[#D10000] text-[#D10000] font-[600] text-sm flex items-center justify-center gap-2 hover:bg-red-50 transition-colors shadow-sm">
                                                <i className="bi bi-x-circle-fill"></i> Reject Driver
                                            </button>
                                        </>
                                    )}
                                    {/* Approved drivers: can block */}
                                    {driverStatus === 'approved' && (
                                        null
                                    )}
                                    {/* Rejected drivers: can re-approve */}
                                    {driverStatus === 'rejected' && (
                                        <button
                                            onClick={() => setModalType('approve')}
                                            disabled={!allDocumentsApproved}
                                            title={!allDocumentsApproved ? "All documents must be approved first" : ""}
                                            className={`w-full py-3.5 rounded-full text-white font-[600] text-sm flex items-center justify-center gap-2 transition-colors shadow-sm ${!allDocumentsApproved ? 'bg-gray-400 cursor-not-allowed opacity-70' : 'bg-[#12B76A] hover:bg-[#039855]'}`}
                                        >
                                            <i className="bi bi-star-fill"></i> Approve Driver
                                        </button>
                                    )}
                                </>
                            )}

                            {!isEditing && (
                                <>
                                    {(driverStatus === 'approved' || driverStatus === 'active') && (
                                        <button onClick={() => setModalType('suspend')} className="w-full py-3.5 rounded-full bg-white border border-[#D10000] text-[#D10000] font-[600] text-sm flex items-center justify-center gap-2 hover:bg-red-50 transition-colors">
                                            <i className="bi bi-pause-circle-fill"></i> Suspend Driver
                                        </button>
                                    )}
                                    {driverStatus === 'suspended' && (
                                        <button onClick={() => setModalType('unsuspend')} className="w-full py-3.5 rounded-full bg-white border border-[#D10000] text-[#D10000] font-[600] text-sm flex items-center justify-center gap-2 hover:bg-red-50 transition-colors shadow-sm">
                                            <i className="bi bi-play-circle-fill"></i> Unsuspend Driver
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
                            </div>

                            {/* Content Body */}
                            <div className="p-6 ">
                                {activeTab === 'personal' && (
                                    <div className="flex flex-col">
                                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                            <span className="text-sm font-semibold text-gray-500 w-1/3">Profile Image</span>
                                            <div className="w-2/3 flex items-center gap-4">
                                                <Avatar
                                                    src={avatarPreview || (driver.avatar ? getImageUrl(driver.avatar) : driver.avatar_url)}
                                                    fullName={driver.name}
                                                    size="w-12 h-12"
                                                />
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
                                            <span className="text-sm font-semibold text-gray-500 w-1/3">ID</span>
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
                                                <span className="text-sm font-[600] text-gray-900 w-2/3">{driver.id}</span>
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
                                            { key: 'class_5_drivers_licence', name: "Class 1, 2 or 4 Driver's Licence" },
                                            { key: 'commercial_driving_record', name: 'ICBC Commercial driving record' },
                                            { key: 'owners_certificate_of_insurance_and_vehicle_registration', name: "Owner's certificate of insurance and vehicle registration" },
                                            { key: 'vehicle_inspection', name: 'Vehicle Inspection' },
                                            { key: 'child_abuse', name: 'Child Abuse Registry Check' },
                                            { key: 'police_clearence', name: 'Police Clearance Certificate' },
                                        ].map((docType, idx) => {
                                            const doc = driver.documents?.find(d => d.document_name === docType.key);
                                            const isOpen = openDocIndex === idx;
                                            const status = doc ? (doc.status || 'Pending') : 'Missing';

                                            return (
                                                <div key={idx} className="flex flex-col border-b border-gray-100">
                                                    <div
                                                        className={`flex items-center justify-between py-5 px-4 cursor-pointer hover:bg-gray-50 transition-colors ${isOpen ? 'bg-gray-50' : ''}`}
                                                        onClick={(e) => {
                                                            if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'LABEL') {
                                                                setOpenDocIndex(isOpen ? null : idx);
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-sm font-[600] text-gray-900">{docType.name}</span>
                                                            {status === 'Missing' ? (
                                                                <span className="text-xs font-[600] text-gray-400 bg-gray-100 px-3 py-1 rounded-full uppercase tracking-wider">Missing</span>
                                                            ) : (
                                                                <div className="flex items-center gap-2">
                                                                    {driverStatus !== 'approved' && (
                                                                        <>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleDocumentStatusChange(doc?.id, 'Verified', docType.name);
                                                                                }}
                                                                                className={`px-4 py-1.5 rounded-full text-[11px] font-[700] uppercase tracking-wider transition-all border ${status === 'Verified'
                                                                                    ? 'bg-[#12B76A] text-white border-[#12B76A] shadow-sm'
                                                                                    : 'bg-white text-gray-500 border-gray-200 hover:border-[#12B76A] hover:text-[#12B76A]'
                                                                                    }`}
                                                                            >
                                                                                Approve
                                                                            </button>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleDocumentStatusChange(doc?.id, 'Rejected', docType.name);
                                                                                }}
                                                                                className={`px-4 py-1.5 rounded-full text-[11px] font-[700] uppercase tracking-wider transition-all border ${status === 'Rejected'
                                                                                    ? 'bg-[#D10000] text-white border-[#D10000] shadow-sm'
                                                                                    : 'bg-white text-gray-500 border-gray-200 hover:border-[#D10000] hover:text-[#D10000]'
                                                                                    }`}
                                                                            >
                                                                                Reject
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                    {status === 'Pending' && (
                                                                        <span className="px-4 py-1.5 rounded-full text-[11px] font-[700] uppercase tracking-wider bg-amber-100 text-amber-600 border border-amber-200">
                                                                            Pending
                                                                        </span>
                                                                    )}
                                                                    {driverStatus === 'approved' && status === 'Verified' && (
                                                                        <span className="px-4 py-1.5 rounded-full text-[11px] font-[700] uppercase tracking-wider bg-green-50 text-green-600 border border-green-100">
                                                                            Verified
                                                                        </span>
                                                                    )}
                                                                </div>
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
                                                                            className="text-xs font-[600] bg-[#D10000] px-4 py-1.5 rounded-full text-white hover:underline"
                                                                        >
                                                                            View Full
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
                                    <div className="flex flex-col  overflow-hidden border-b border-gray-100 ">


                                        <div className="flex flex-col">
                                            {driver.vehicles?.length === 0 ? (
                                                <div className="text-center py-6">
                                                    <i className="bi bi-car-front text-5xl text-gray-200"></i>
                                                    <p className="text-gray-400 mt-4 font-medium uppercase tracking-widest text-[10px]">Not Assigned</p>
                                                </div>
                                            ) : (
                                                driver.vehicles.map((v, vIdx) => {
                                                    const isvOpen = openVehicleIndex === vIdx;
                                                    return (
                                                        <div key={vIdx} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                                                            {/* List Item - Numbered style from image */}
                                                            <div
                                                                className="px-8 py-6 flex items-center justify-between cursor-pointer group"
                                                                onClick={() => setOpenVehicleIndex(isvOpen ? null : vIdx)}
                                                            >
                                                                <div className="flex items-center gap-5">
                                                                    <span className="text-sm font-[800] text-black w-6">#{vIdx + 1}</span>
                                                                    <h4 className={`text-[15px] font-[600] group-hover:text-[#EE1B24] transition-colors ${isvOpen ? 'text-[#EE1B24]' : 'text-gray-900'}`}>
                                                                        {v.model || 'Unknown Vehicle'}
                                                                    </h4>
                                                                    {!isvOpen && (
                                                                        <span className="text-[10px] font-[700] text-gray-400 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded-md ml-2">
                                                                            {v.license_plate}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <i className={`bi bi-chevron-${isvOpen ? 'up' : 'right'} text-sm font-bold ${isvOpen ? 'text-[#EE1B24]' : 'text-gray-400 group-hover:text-gray-600'} transition-all`}></i>
                                                            </div>

                                                            {/* Content - Designing matching 'before' as requested */}
                                                            {isvOpen && (
                                                                <div className="px-8 pb-8 pt-2 animate-in slide-in-from-top-2 duration-300">
                                                                    <div className="relative w-full h-[240px] rounded-[24px] overflow-hidden mb-8 shadow-inner bg-gray-100 border border-gray-100">
                                                                        <img
                                                                            src={v.type?.image_path ? getImageUrl(v.type.image_path) : (v.front_image ? getImageUrl(v.front_image) : "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=1000")}
                                                                            className="w-full h-full object-cover p-8 bg-gray-50"
                                                                            alt="Vehicle"
                                                                            onError={(e) => {
                                                                                e.target.src = "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=1000";
                                                                                e.target.className = "w-full h-full object-cover p-0";
                                                                            }}
                                                                        />
                                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                                                                        <div className="absolute bottom-6 left-8 text-white text-left">
                                                                            <h3 className="text-xl font-[600] tracking-tight">{v.color} {v.model}</h3>
                                                                            <p className="text-xs font-semibold text-white/70 uppercase tracking-[0.2em]">{v.license_plate}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
                                                                        {[
                                                                            { label: 'Vehicle Model', value: v.model, key: 'model', icon: 'bi bi-truck' },
                                                                            { label: 'Vehicle Year', value: v.year, key: 'year', icon: 'bi bi-calendar-event' },
                                                                            { label: 'Vehicle Color', value: v.color, key: 'color', icon: 'bi bi-palette' },
                                                                            { label: 'License Plate', value: v.license_plate, key: 'license_plate', icon: 'bi bi-card-text' },
                                                                            { label: 'Capacity', value: v.type?.capacity || 'N/A', key: 'capacity', icon: 'bi bi-people-fill' },
                                                                            { label: 'Vehicle Type', value: v.type?.category || v.type || 'N/A', key: 'type', icon: 'bi bi-car-front-fill' }
                                                                        ].map((item, idx) => (
                                                                            <div key={idx} className="flex items-center justify-between py-5 border-b border-gray-100 last:md:border-b-0">
                                                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest w-1/3 text-left">{item.label}</span>
                                                                                {isEditing ? (
                                                                                    <div className="w-2/3">
                                                                                        <InputWrapper icon={item.icon} className="h-10 mb-0">
                                                                                            <Input
                                                                                                value={item.value}
                                                                                                onChange={e => {
                                                                                                    const newVehicles = [...driver.vehicles];
                                                                                                    newVehicles[vIdx][item.key] = e.target.value;
                                                                                                    setDriver({ ...driver, vehicles: newVehicles });
                                                                                                }}
                                                                                            />
                                                                                        </InputWrapper>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="w-2/3 flex items-center gap-2">
                                                                                        {item.key === 'type' && (
                                                                                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[#EE1B24] bg-red-50 shrink-0">
                                                                                                <i className={`${item.icon} text-[10px]`}></i>
                                                                                            </div>
                                                                                        )}
                                                                                        <span className={`text-[13px] font-[700] text-left ${item.key === 'license_plate' ? 'text-[#EE1B24] tracking-wider' : 'text-gray-900'}`}>{item.value}</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            )}
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
                                                            <th className="py-4 px-6 rounded-l-xl"> ID</th>
                                                            <th className="py-4 px-6">Passenger </th>

                                                            <th className="py-4 px-6 text-center">Pickup</th>
                                                            <th className="py-4 px-6 rounded-r-xl text-center">Dropoff</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="text-sm">
                                                        {(showAllRides ? driver.rides : driver.rides.slice(0, 5)).map((ride, idx) => (
                                                            <tr
                                                                key={idx}
                                                                onClick={() => {
                                                                    setSelectedRide(ride);
                                                                    setModalType('ride_detail');
                                                                }}
                                                                className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer group/row"
                                                            >
                                                                <td className="py-4 px-6 text-gray-800 font-[600] whitespace-nowrap group-hover/row:text-[#D10000]">{ride.unique_id}</td>
                                                                <td className="py-4 px-6 text-gray-600 font-medium whitespace-nowrap">
                                                                    {ride.passenger_name ? (
                                                                        <Tooltip content={
                                                                            <div className="flex flex-col gap-1 py-1">
                                                                                <div className="flex items-center gap-2"><i className="bi bi-person text-[#D10000]"></i> <span>ID: {ride.passenger_id}</span></div>
                                                                                <div className="flex items-center gap-2"><i className="bi bi-telephone text-[#D10000]"></i> <span>{ride.passenger_phone || 'N/A'}</span></div>
                                                                                <div className="flex items-center gap-2"><i className="bi bi-envelope text-[#D10000]"></i> <span className="lowercase">{ride.passenger_email || 'N/A'}</span></div>
                                                                            </div>
                                                                        }>
                                                                            <span className="text-[#D10000] cursor-help border-b border-dotted border-gray-300 transition-colors">
                                                                                {ride.passenger_name}
                                                                            </span>
                                                                        </Tooltip>
                                                                    ) : (
                                                                        <span className="text-gray-400 italic">Loading...</span>
                                                                    )}
                                                                </td>

                                                                <td className="py-4 px-6 text-gray-600 font-medium text-xs max-w-[200px] truncate" title={ride.pickup_address}>
                                                                    {ride.pickup_address || (ride.pickup_lat ? <span className="text-gray-400 italic">Resolving Address...</span> : 'N/A')}
                                                                </td>
                                                                <td className="py-4 px-6 text-gray-600 font-medium text-xs max-w-[200px] truncate" title={ride.dropoff_address}>
                                                                    {ride.dropoff_address || (ride.dropoff_lat ? <span className="text-gray-400 italic">Resolving Address...</span> : 'N/A')}
                                                                </td>
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
                                    <div className="flex flex-col">
                                        {[
                                            { label: 'Card Holder Name', value: driver.card_holder_name || 'N/A', key: 'card_holder_name', icon: 'bi bi-person-fill' },
                                            { label: 'Card Number', value: driver.card_number ? driver.card_number.replace(/\d(?=\d{4})/g, "*") : 'N/A', key: 'card_number', icon: 'bi bi-credit-card-2-front-fill' },
                                            { label: 'Expiry Date', value: driver.expiry_date ? formatDate(driver.expiry_date) : 'N/A', key: 'expiry_date', icon: 'bi bi-calendar-check-fill' },
                                            { label: 'CVV', value: driver.cvv || 'N/A', key: 'cvv', icon: 'bi bi-shield-lock-fill' },
                                        ].map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between py-6 border-b border-gray-100 last:border-0">
                                                <span className="text-sm font-semibold text-gray-500 w-1/3">{item.label}</span>
                                                {isEditing ? (
                                                    <div className="w-2/3">
                                                        <InputWrapper icon={item.icon} className="h-10 mb-0">
                                                            <Input
                                                                value={driver[item.key] || ''}
                                                                onChange={e => setDriver({ ...driver, [item.key]: e.target.value })}
                                                                placeholder={`Enter ${item.label}`}
                                                            />
                                                        </InputWrapper>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm font-[600] text-gray-900 w-2/3 flex items-center gap-2">
                                                        {item.key === 'card_number' && <i className="bi bi-credit-card text-[#D10000]"></i>}
                                                        {item.value}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modals Overlay */}
                {
                    ['unsuspend', 'approve', 'reject', 'delete'].includes(modalType) && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                            <div className="bg-white rounded-[32px] p-8 w-[90%] max-w-sm flex flex-col items-center text-center shadow-2xl">
                                <div className="mb-4">
                                    <i className={`text-[40px] ${modalType === 'delete' ? 'bi bi-trash-fill text-[#EE1B24]' :
                                        modalType === 'approve' ? 'bi bi-check-circle-fill text-[#12B76A]' :
                                            modalType === 'reject' ? 'bi bi-x-circle-fill text-[#EE1B24]' :
                                                'bi bi-slash-circle text-[#EE1B24]'
                                        }`}></i>
                                </div>

                                <h3 className="text-xl font-[600] text-gray-900 mb-3">
                                    {modalType === 'approve' ? 'Approve Driver' :
                                        modalType === 'reject' ? 'Reject Driver' :
                                            modalType === 'unsuspend' ? 'Unsuspend Driver' :
                                                'Delete Driver'}
                                </h3>

                                <p className="text-xs font-semibold text-gray-600 mb-8 max-w-[250px] mx-auto">
                                    {modalType === 'delete' ? (
                                        <>Are you sure to Delete the <span className="text-[#EE1B24]">{driver.name}</span> Driver. This action can't be undone.</>
                                    ) : modalType === 'approve' ? (
                                        <>Are you sure to <span className="text-[#12B76A]">Approve</span> the <span className="text-[#EE1B24]">{driver.name}</span> Driver?</>
                                    ) : modalType === 'unsuspend' ? (
                                        <>Are you sure to <span className="text-[#12B76A]">Unsuspend</span> the <span className="text-[#EE1B24]">{driver.name}</span> Driver?</>
                                    ) : (
                                        <>Are you sure to <span className="text-[#EE1B24]">Reject</span> the <span className="text-[#EE1B24]">{driver.name}</span> Driver?</>
                                    )}
                                </p>

                                <div className="flex items-center gap-3 w-full">
                                    <button
                                        className={`flex-1 py-3 text-white rounded-[12px] font-[600] text-sm transition-colors ${modalType === 'approve' ? 'bg-[#12B76A] hover:bg-[#039855]' : 'bg-[#EE1B24] hover:bg-[#d01019]'
                                            }`}
                                        onClick={async () => {
                                            console.log("Modal action triggered:", modalType);
                                            try {
                                                if (modalType === 'approve') {
                                                    const payload = { status: 'Approved', suspended_until: null };
                                                    console.log("Approving driver. Payload:", payload);
                                                    const response = await toggleDriverStatus(driver.id, payload);
                                                    console.log("Approval response:", response);
                                                    setDriverStatus('approved');
                                                    setDriver(prev => ({ ...prev, status: 'Approved', suspended_until: null }));
                                                    showToast("Driver approved successfully", "success");
                                                } else if (modalType === 'reject') {
                                                    const payload = { status: 'Rejected' };
                                                    console.log("Rejecting driver. Payload:", payload);
                                                    const response = await toggleDriverStatus(driver.id, payload);
                                                    console.log("Rejection response:", response);

                                                    // Immediately update UI to Rejected
                                                    setDriverStatus('rejected');
                                                    setDriver(prev => ({ ...prev, status: 'rejected' }));
                                                    showToast("Driver rejected successfully", "success");

                                                    // Small delay before fetching to ensure DB consistency
                                                    setTimeout(() => fetchDriverDetail(), 1000);
                                                } else if (modalType === 'unsuspend') {
                                                    const payload = { status: 'Approved', suspended_until: null };
                                                    console.log("Unsuspending driver. Payload:", payload);
                                                    const response = await toggleDriverStatus(driver.id, payload);
                                                    console.log("Unsuspension response:", response);
                                                    setDriverStatus('approved');
                                                    setDriver(prev => ({ ...prev, status: 'Approved', suspended_until: null }));
                                                    showToast("Driver unsuspended", "success");
                                                } else if (modalType === 'delete') {
                                                    await deleteDriver(driver.id);
                                                    showToast("Driver deleted successfully", "success");
                                                    navigate('/drivers');
                                                }
                                            } catch (error) {
                                                showToast("Action failed", "error");
                                            }
                                            setModalType(null);
                                        }}
                                    >
                                        Confirm
                                    </button>
                                    <button className="flex-1 py-3 bg-white text-gray-900 border border-gray-900 rounded-[12px] font-[600] text-sm hover:bg-gray-50 transition-colors" onClick={() => setModalType(null)}>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {
                    modalType === 'suspend' && (
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

                                                    // Prepare data for API - use 'suspended' as the primary status
                                                    const updateData = {
                                                        status: 'suspended',
                                                        suspended_until: until,
                                                        suspension_reason: suspensionForm.reason
                                                    };
                                                    console.log("Suspending driver. Payload:", updateData);

                                                    // Use the status-specific endpoint to ensure suspension is processed correctly
                                                    await toggleDriverStatus(driver.id, updateData);

                                                    setDriver(prev => ({
                                                        ...prev,
                                                        status: 'suspended',
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
                    )
                }

                {
                    modalType === 'suspend_success' && (
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
                    )
                }


                {/* Document Rejection Modal */}
                {
                    rejectionModal.isOpen && (
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
                    )
                }
                {/* Ride Detail Modal - Reorganized Layout */}
                {
                    modalType === 'ride_detail' && selectedRide && (
                        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setModalType(null)}>
                            <div className="bg-white translate-y-9 translate-x-20 rounded-[24px] w-full max-w-[800px] flex overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.2)] animate-in zoom-in-95 duration-500 max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                                {/* Left Side: Map & Passenger */}
                                <div className="hidden lg:flex flex-col w-[50%] bg-gray-50 border-r border-gray-100 overflow-y-auto custom-scrollbar">
                                    {/* Map (Top Half) */}
                                    <div className="h-[400px] w-full relative shrink-0 bg-gray-100">
                                        {isLoaded ? (
                                            <GoogleMap
                                                onLoad={onLoad}
                                                mapContainerStyle={{ width: '100%', height: '100%' }}
                                                center={{
                                                    lat: parseFloat(selectedRide.pickup_lat) || 0,
                                                    lng: parseFloat(selectedRide.pickup_lng) || 0
                                                }}
                                                zoom={13}
                                                options={{
                                                    disableDefaultUI: true,
                                                    zoomControl: true,
                                                    styles: [
                                                        {
                                                            featureType: "all",
                                                            elementType: "all",
                                                            stylers: [{ saturation: -100 }]
                                                        }
                                                    ]
                                                }}
                                            >
                                                {selectedRide.pickup_lat && selectedRide.dropoff_lat && !directions && (
                                                    <DirectionsService
                                                        options={{
                                                            origin: { lat: parseFloat(selectedRide.pickup_lat), lng: parseFloat(selectedRide.pickup_lng) },
                                                            destination: { lat: parseFloat(selectedRide.dropoff_lat), lng: parseFloat(selectedRide.dropoff_lng) },
                                                            travelMode: 'DRIVING',
                                                            provideRouteAlternatives: true
                                                        }}
                                                        callback={(result, status) => {
                                                            if (status === 'OK' && result) {
                                                                // Sort routes by distance to ensure we pick the shortest one
                                                                if (result.routes && result.routes.length > 1) {
                                                                    result.routes.sort((a, b) => {
                                                                        const distA = a.legs.reduce((acc, leg) => acc + (leg.distance?.value || 0), 0);
                                                                        const distB = b.legs.reduce((acc, leg) => acc + (leg.distance?.value || 0), 0);
                                                                        return distA - distB;
                                                                    });
                                                                }
                                                                setDirections(result);
                                                            }
                                                        }}
                                                    />
                                                )}
                                                {directions && (
                                                    <DirectionsRenderer
                                                        directions={directions}
                                                        options={{ suppressMarkers: false }}
                                                    />
                                                )}
                                            </GoogleMap>
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#D10000]"></div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">LOADING MAP...</p>
                                            </div>
                                        )}
                                        <button onClick={() => setModalType(null)} className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center text-gray-600 hover:text-black transition-all z-20">
                                            <i className="bi bi-x-lg text-[10px]"></i>
                                        </button>
                                    </div>

                                    {/* Passenger Details (Bottom Half) */}
                                    <div className="p-5 space-y-4">
                                        <div className="bg-[#D10000] text-white px-4 py-2 rounded-[10px] text-[11px] font-bold tracking-wider uppercase">PASSENGER</div>
                                        <div className="flex items-center gap-4 px-1 pb-1">
                                            <Avatar
                                                src={null} // Force initials for now as per previous manual logic, or use passenger image if available
                                                fullName={passengersMap[selectedRide.passenger_id]?.name || selectedRide.passenger_name || 'Passenger'}
                                                size="w-[48px] h-[48px]"
                                                className="bg-[#FFF9E6] text-[#92712D] text-[16px] rounded-[14px]"
                                            />
                                            <div>
                                                <p className="text-[14px] font-bold text-gray-900 leading-tight">
                                                    {passengersMap[selectedRide.passenger_id]?.name || selectedRide.passenger_name || 'Anonymous'}
                                                </p>
                                                <p className="text-[11px] font-medium text-gray-400 mt-1">Passenger ID: {selectedRide.passenger_id}</p>
                                            </div>
                                        </div>


                                    </div>
                                </div>

                                {/* Right Side: Booking Details, Timestamps & Vehicle */}
                                <div className="w-full lg:w-[50%] p-6 overflow-y-auto bg-white custom-scrollbar">
                                    <div className="space-y-6">
                                        {/* BOOKING DETAILS */}
                                        <div className="space-y-4">
                                            <div className="bg-[#D10000] text-white px-4 py-2 rounded-[10px] text-[11px] font-bold tracking-wider flex justify-between items-center uppercase"><span>BOOKING DETAILS</span>
                                                <span className="text-[11px] font-bold opacity-100 uppercase tracking-widest">Booking ID: {selectedRide.id}</span>
                                            </div>
                                            <div className="space-y-4 px-1">
                                                <div className="flex gap-3 items-start">
                                                    <div className="mt-1.5 w-2 h-2 rounded-full bg-black flex-shrink-0"></div>
                                                    <div>
                                                        <p className="text-[13px] font-bold text-gray-800 leading-tight">Pickup Location</p>
                                                        <p className="text-[11px] text-gray-400 font-medium leading-tight mt-1">
                                                            {selectedRide.pickup_address || (selectedRide.pickup_lat ? 'Resolving address...' : 'N/A')}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3 items-start">
                                                    <i className="bi bi-geo-alt-fill text-[#D10000] text-sm mt-0.5 flex-shrink-0"></i>
                                                    <div>
                                                        <p className="text-[13px] font-bold text-gray-800 leading-tight">Dropoff Location</p>
                                                        <p className="text-[11px] text-gray-400 font-medium leading-tight mt-1">
                                                            {selectedRide.dropoff_address || (selectedRide.dropoff_lat ? 'Resolving address...' : 'N/A')}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 pt-0">
                                                    <div className="bg-white rounded-xl text-center">
                                                        <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">EST DISTANCE</p>
                                                        <p className="text-[12px] font-black text-gray-900 mt-1">{selectedRide.estimated_distance ? `${parseFloat(selectedRide.estimated_distance).toFixed(3)} km` : '0.0 km'}</p>
                                                    </div>
                                                    <div className="bg-white rounded-xl text-center">
                                                        <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">EST TIME</p>
                                                        <p className="text-[12px] font-black text-gray-900 mt-1">{selectedRide.estimated_time || '00:00:00'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* TIMESTAMPS */}
                                        <div className="grid grid-cols-2 gap-4 py-0 border-y border-gray-50">
                                            <div className="text-center">
                                                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">PICKUP AT</p>
                                                <p className="text-[12px] font-bold text-gray-900 leading-tight">
                                                    {new Date(selectedRide.pickup_time || selectedRide.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </p>
                                                <p className="text-[11px] font-medium text-gray-500 mt-1">
                                                    {new Date(selectedRide.pickup_time || selectedRide.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                </p>
                                            </div>
                                            <div className="text-center border-l border-gray-100">
                                                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">DROPOFF AT</p>
                                                {selectedRide.dropoff_time ? (
                                                    <>
                                                        <p className="text-[12px] font-bold text-gray-900 leading-tight">{new Date(selectedRide.dropoff_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}</p>
                                                        <p className="text-[11px] font-medium text-gray-500 mt-1">{new Date(selectedRide.dropoff_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                    </>
                                                ) : (
                                                    <p className="text-[14px] font-bold text-gray-300 mt-1">—</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* VEHICLE INFORMATION */}
                                        <div className="space-y-3">
                                            {(() => {
                                                const v = driver?.vehicles?.find(val => String(val.id) === String(selectedRide.vehicle_id)) || driver?.vehicles?.[0];
                                                return (
                                                    <>
                                                        <div className="bg-[#D10000] text-white px-4 py-2 rounded-[10px] text-[11px] font-bold tracking-wider flex justify-between items-center uppercase">
                                                            VEHICLE INFORMATION

                                                        </div>

                                                        <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-1">
                                                            <div className="col-span-2 flex items-center gap-4 pb-2 border-b border-gray-50">
                                                                <div className="w-[48px] h-[48px] bg-[#F3F4F6] rounded-[14px] flex items-center justify-center text-gray-400 shrink-0">
                                                                    <i className="bi bi-car-front text-xl"></i>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <p className="text-[15px] font-bold text-gray-900 leading-tight">{v?.model || 'N/A'}</p>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="bg-[#FFEAEA] text-[#D10000] px-3 py-0.5 rounded-full text-[10px] font-bold border border-[#FFD9D9]">
                                                                            {v?.license_plate || '—'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-[#D10000]">
                                                                    <i className="bi bi-calendar-event text-xs"></i>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Year</p>
                                                                    <p className="text-[12px] font-bold text-gray-900">{v?.year || 'N/A'}</p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-[#D10000]">
                                                                    <i className="bi bi-palette text-xs"></i>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Color</p>
                                                                    <p className="text-[12px] font-bold text-gray-900">{v?.color || 'N/A'}</p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-[#D10000]">
                                                                    <i className="bi bi-people text-xs"></i>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Capacity</p>
                                                                    <p className="text-[12px] font-bold text-gray-900">{v?.type?.capacity || 'N/A'} Seats</p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-[#D10000]">
                                                                    <i className="bi bi-tag text-xs"></i>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Category</p>
                                                                    <p className="text-[12px] font-bold text-gray-900">{v?.type?.category || 'N/A'}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

            </div >
        </AdminLayout >
    );
}
