import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { InputWrapper, Input, useToast, Loader, Tooltip, Avatar } from '@/components/UI';
import { getPassengerById, updatePassenger, togglePassengerStatus, deletePassenger } from '@/api/passengerApi';
import { getBookings } from '@/api/bookingApi';
import { getImageUrl } from '@/api/api';
import api from '@/api/api';
import { formatDate } from '@/utils/formatters';
import { reverseGeocode, isPlusCode } from '@/utils/geoUtils';
import { useJsApiLoader, GoogleMap, DirectionsService, DirectionsRenderer } from '@react-google-maps/api';

const LIBRARIES = ['places'];
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

export default function PassengerDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('personal');
    const [modalType, setModalType] = useState(null);
    const [showAllRides, setShowAllRides] = useState(false);
    const [passengerStatus, setPassengerStatus] = useState('active'); // 'active', 'blocked'
    const [isEditing, setIsEditing] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [passenger, setPassenger] = useState(null);
    const [originalPassenger, setOriginalPassenger] = useState(null);
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [selectedRide, setSelectedRide] = useState(null);
    const [directions, setDirections] = useState(null);
    const [driversMap, setDriversMap] = useState({});

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: GOOGLE_MAPS_KEY,
        libraries: LIBRARIES
    });

    useEffect(() => {
        if (!selectedRide) setDirections(null);
    }, [selectedRide]);

    // Keep selectedRide in sync with enriched data
    useEffect(() => {
        if (selectedRide && passenger?.rides) {
            const latestData = passenger.rides.find(r => String(r.id) === String(selectedRide.id));
            if (latestData) {
                const hasUpdates = latestData.pickup_address !== selectedRide.pickup_address ||
                    latestData.dropoff_address !== selectedRide.dropoff_address ||
                    latestData.driver_name !== selectedRide.driver_name;
                if (hasUpdates) setSelectedRide(latestData);
            }
        }
    }, [passenger?.rides, selectedRide?.id]);

    const fetchPassengerDetail = useCallback(async () => {
        try {
            setLoading(true);
            const response = await getPassengerById(id);
            const data = response.data || response;

            if (!data) {
                setPassenger(null);
                return;
            }

            // Use bookings directly from the passenger detail response — no separate API call needed
            const rawBookings = data.bookings || data.rides || [];
            const ridesData = Array.isArray(rawBookings) ? rawBookings : [];
            const totalRideCount = ridesData.length;
            console.log(`DEBUG: Passenger has ${totalRideCount} bookings from detail response`);

            const formatted = {
                ...data,
                name: data.name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'N/A',
                since: data.created_at ? `Since ${formatDate(data.created_at)}` : (data.since || 'N/A'),
                rating: data.rating || 5.0,
                id: data.id || id,
                rides: ridesData,
                stats: {
                    total_rides: totalRideCount,
                    completed_rides: data.completed_rides || data.stats?.completed_rides || 0,
                    cancelled_rides: data.cancelled_rides || data.stats?.cancelled_rides || 0
                },
                payments: data.payments || { p1: 'N/A', p2: 'N/A', p3: 'N/A', o1: 'N/A', o2: 'N/A' }
            };

            setPassenger(formatted);
            setOriginalPassenger(JSON.parse(JSON.stringify(formatted)));

            const rawStatus = data.status?.toLowerCase() || 'active';
            setPassengerStatus((rawStatus === 'inactive' || rawStatus === 'block' || rawStatus === 'blocked') ? 'blocked' : 'active');

            // Quick enrichment for names
            try {
                const missingDrivers = ridesData.filter(r => !r.driver_name && r.driver_id);
                if (missingDrivers.length > 0) {
                    const dRes = await api.get('/admin/drivers', { params: { limit: 500 } }).catch(() => null);
                    if (dRes) {
                        const dMap = {};
                        const driversList = dRes.data?.data?.data || dRes.data?.data || [];
                        if (Array.isArray(driversList)) {
                            driversList.forEach(d => {
                                dMap[d.id] = {
                                    name: `${d.first_name || d.name || ''} ${d.last_name || ''}`.trim(),
                                    email: d.email || 'N/A',
                                    phone: d.phone || 'N/A'
                                };
                            });
                            setDriversMap(dMap);
                            setPassenger(prev => ({
                                ...prev,
                                rides: Array.isArray(prev?.rides) ? prev.rides.map(r => ({
                                    ...r,
                                    driver_name: r.driver_name || dMap[r.driver_id]?.name
                                })) : []
                            }));
                        }
                    }
                }
            } catch (e) { /* ignore */ }

        } catch (error) {
            console.error("Error fetching passenger:", error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        const resolveMissingData = async () => {
            if (!Array.isArray(passenger?.rides) || passenger.rides.length === 0) return;
            let updated = false;
            const newRides = await Promise.all(passenger.rides.map(async (ride) => {
                let r = { ...ride };
                if ((!r.pickup_address || isPlusCode(r.pickup_address)) && r.pickup_lat) {
                    const addr = await reverseGeocode(r.pickup_lat, r.pickup_lng);
                    if (addr) { r.pickup_address = addr; updated = true; }
                }
                if ((!r.dropoff_address || isPlusCode(r.dropoff_address)) && r.dropoff_lat) {
                    const addr = await reverseGeocode(r.dropoff_lat, r.dropoff_lng);
                    if (addr) { r.dropoff_address = addr; updated = true; }
                }
                if (!r.driver_name && r.driver_id) {
                    const mapped = driversMap[r.driver_id];
                    if (mapped) {
                        r.driver_name = mapped.name; r.driver_email = mapped.email; r.driver_phone = mapped.phone;
                        updated = true;
                    } else {
                        const res = await api.get(`/admin/drivers/${r.driver_id}`).catch(() => null);
                        if (res) {
                            const d = res.data?.data || res.data;
                            const dData = { name: `${d.first_name || d.name || ''} ${d.last_name || ''}`.trim(), email: d.email || 'N/A', phone: d.phone || 'N/A' };
                            setDriversMap(prev => ({ ...prev, [d.id]: dData }));
                            r.driver_name = dData.name; updated = true;
                        }
                    }
                }
                return r;
            }));
            if (updated) setPassenger(prev => ({ ...prev, rides: newRides }));
        };
        const timeout = setTimeout(resolveMissingData, 1000);
        return () => clearTimeout(timeout);
    }, [passenger?.id, passenger?.rides?.length]);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPassengerDetail();
    }, [fetchPassengerDetail]);

    const handleEditClick = () => {
        if (!isEditing) {
            setOriginalPassenger(JSON.parse(JSON.stringify(passenger)));
            setIsEditing(true);
        } else {
            setPassenger(JSON.parse(JSON.stringify(originalPassenger)));
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
            const nameParts = passenger.name.trim().split(' ');
            const updateData = {
                first_name: nameParts[0] || '',
                last_name: nameParts.slice(1).join(' ') || '',
                email: passenger.email,
                phone: passenger.phone,
                gender: passenger.gender,
                payments: passenger.payments
            };

            await updatePassenger(id, updateData);
            setOriginalPassenger(JSON.parse(JSON.stringify(passenger)));
            setIsEditing(false);
            showToast("Passenger details updated successfully", "success");
        } catch (error) {
            console.error("Update error:", error);
            showToast("Failed to update passenger", "error");
        } finally {
            setUpdating(false);
        }
    };

    const handleStatusAction = async () => {
        try {
            setUpdating(true);
            if (modalType === 'delete') {
                await deletePassenger(id);
                showToast("Passenger deleted successfully", "success");
                navigate('/passenger');
                return;
            }

            if (modalType === 'block') {
                await updatePassenger(id, { status: 'Blocked' });
                setPassengerStatus('blocked');
                setPassenger(prev => ({ ...prev, status: 'Blocked' }));
                showToast("Passenger blocked successfully", "success");
            } else if (modalType === 'unblock') {
                await updatePassenger(id, { status: 'Active' });
                setPassengerStatus('active');
                setPassenger(prev => ({ ...prev, status: 'Active' }));
                showToast("Passenger unblocked successfully", "success");
            }
            setModalType(null);
        } catch (error) {
            console.error("Status action error:", error);
            showToast("Failed to process action", "error");
        } finally {
            setUpdating(false);
        }
    };

    const tabs = [
        { id: 'personal', label: 'Personal Information', icon: 'bi bi-person-fill' },
        { id: 'rides', label: 'All Rides', icon: 'bi bi-truck-front-fill' },
        { id: 'payments', label: 'Payment Methods', icon: 'bi bi-wallet-fill' }
    ];

    if (loading) {
        return <Loader />;
    }

    if (!passenger) {
        return (
            <AdminLayout title="Passenger Detail">
                <div className="flex flex-col items-center justify-center h-[600px] text-center px-4">
                    <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6">
                        <i className="bi bi-person-x-fill text-4xl text-[#D10000]"></i>
                    </div>
                    <h3 className="text-xl font-[600] text-gray-800 mb-2">Passenger not found</h3>
                    <p className="text-gray-500 mb-8 max-w-sm">We couldn't find the passenger you're looking for.</p>
                    <Link to="/passenger" className="bg-[#D10000] text-white px-8 py-3 rounded-full font-[600] hover:bg-[#b00000] transition-colors">
                        Back to Passengers
                    </Link>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="Passenger Profile">
            <div className="max-w-6xl mx-auto mb-4">

                {/* Header - EXACT SAME AS DRIVER */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link to="/passenger" className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors">
                            <i className="bi bi-chevron-left text-sm"></i>
                        </Link>
                        <div className="relative">
                            <Avatar
                                src={avatarPreview || (passenger.avatar ? getImageUrl(passenger.avatar) : passenger.avatar_url)}
                                fullName={passenger.name}
                                size="w-14 h-14"
                            />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-[600] text-black">{passenger.name}</h2>
                                <span className={`text-[10px] font-[600] px-2 py-0.5 rounded-full uppercase tracking-wider ${passengerStatus === 'active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    {passengerStatus === 'active' ? 'Active' : 'Blocked'}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 mt-0.5 text-xs font-semibold text-gray-500">
                                <div className="flex gap-0.5 text-[#FBBF24]">
                                    {[1, 2, 3, 4].map(s => <i key={s} className="bi bi-star-fill text-[12px]"></i>)}
                                    <i className="bi bi-star-fill text-[12px] opacity-30"></i>
                                </div>
                                <span className="ml-1">({passenger.rating})</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right mr-2">
                            <div className="text-[10px] font-[600] text-gray-400 uppercase tracking-widest">{passenger.since}</div>
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
                                        <><i className="bi bi-check-circle-fill"></i> Update Passenger</>
                                    )}
                                </button>
                            ) : (
                                <>
                                    {passengerStatus === 'blocked' ? (
                                        <button onClick={() => setModalType('unblock')} className="w-full py-3.5 rounded-full bg-white border border-[#D10000] text-[#D10000] font-[600] text-sm flex items-center justify-center gap-2 hover:bg-red-50 transition-colors shadow-sm">
                                            <i className="bi bi-slash-circle font-[600]"></i> unblock Passenger
                                        </button>
                                    ) : (
                                        <button onClick={() => setModalType('block')} className="w-full py-3.5 rounded-full bg-[#D10000] text-white font-[600] text-sm flex items-center justify-center gap-2 hover:bg-[#b00000] transition-colors shadow-sm">
                                            <i className="bi bi-slash-circle font-[600]"></i> Block Passenger
                                        </button>
                                    )}
                                    <button onClick={() => setModalType('delete')} className="w-full py-3.5 rounded-full bg-white border border-[#D10000] text-[#D10000] font-[600] text-sm flex items-center justify-center gap-2 hover:bg-red-50 transition-colors">
                                        <i className="bi bi-trash-fill"></i> Delete Passenger
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
                            <div className="p-6">
                                {activeTab === 'personal' && (
                                    <div className="flex flex-col">
                                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                            <span className="text-sm font-semibold text-gray-500 w-1/3">Profile Image</span>
                                            <div className="w-2/3 flex items-center gap-4">
                                                <Avatar
                                                    src={avatarPreview || (passenger.avatar ? getImageUrl(passenger.avatar) : passenger.avatar_url)}
                                                    fullName={passenger.name}
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
                                                            value={passenger.name}
                                                            onChange={e => setPassenger({ ...passenger, name: e.target.value })}
                                                        />
                                                    </InputWrapper>
                                                </div>
                                            ) : (
                                                <span className="text-sm font-[600] text-gray-900 w-2/3">{passenger.name}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between py-6 border-b border-gray-100">
                                            <span className="text-sm font-semibold text-gray-500 w-1/3">ID</span>
                                            {isEditing ? (
                                                <div className="w-2/3">
                                                    <InputWrapper icon="bi bi-person" className="h-10 mb-0">
                                                        <Input
                                                            value={passenger.id}
                                                            onChange={e => setPassenger({ ...passenger, id: e.target.value })}
                                                        />
                                                    </InputWrapper>
                                                </div>
                                            ) : (
                                                <span className="text-sm font-[600] text-gray-900 w-2/3">{passenger.id}</span>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between py-6 border-b border-gray-100">
                                            <span className="text-sm font-semibold text-gray-500 w-1/3">Email Address</span>
                                            {isEditing ? (
                                                <div className="w-2/3">
                                                    <InputWrapper icon="bi bi-envelope" className="h-10 mb-0">
                                                        <Input
                                                            value={passenger.email}
                                                            onChange={e => setPassenger({ ...passenger, email: e.target.value })}
                                                        />
                                                    </InputWrapper>
                                                </div>
                                            ) : (
                                                <span className="text-sm font-[600] text-[#D10000] w-2/3">{passenger.email}</span>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between py-6 border-b border-gray-100">
                                            <span className="text-sm font-semibold text-gray-500 w-1/3">Phone Number</span>
                                            {isEditing ? (
                                                <div className="w-2/3">
                                                    <InputWrapper icon="bi bi-telephone" className="h-10 mb-0">
                                                        <Input
                                                            value={passenger.phone}
                                                            onChange={e => setPassenger({ ...passenger, phone: e.target.value })}
                                                        />
                                                    </InputWrapper>
                                                </div>
                                            ) : (
                                                <span className="text-sm font-[600] text-[#D10000] w-2/3">{passenger.phone}</span>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between py-6 border-b border-gray-100">
                                            <span className="text-sm font-semibold text-gray-500 w-1/3">Gender</span>
                                            {isEditing ? (
                                                <div className="w-2/3">
                                                    <select
                                                        className="w-full h-10 border border-gray-200 rounded-xl px-4 text-sm outline-none focus:border-[#D10000] font-medium bg-white"
                                                        value={passenger.gender}
                                                        onChange={e => setPassenger({ ...passenger, gender: e.target.value })}
                                                    >
                                                        <option value="Male">Male</option>
                                                        <option value="Female">Female</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                </div>
                                            ) : (
                                                <span className="text-sm font-[600] text-gray-900 w-2/3">{passenger.gender || 'N/A'}</span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'rides' && (
                                    <div className="flex flex-col">
                                        <div className="overflow-x-auto">
                                            {!Array.isArray(passenger?.rides) || passenger.rides.length === 0 ? (
                                                <div className="text-center py-20 bg-gray-50 rounded-2xl">
                                                    <i className="bi bi-car-front text-4xl text-gray-300 mb-3 block"></i>
                                                    <p className="text-gray-500 font-medium">No rides found for this passenger</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <table className="w-full text-left border-collapse">
                                                        <thead>
                                                            <tr className="bg-[#FFEAEA] text-xs font-[600] text-gray-900 border-none">
                                                                <th className="py-4 px-6 rounded-l-xl">ID</th>
                                                                <th className="py-4 px-6">Driver</th>
                                                                <th className="py-4 px-6 text-center">Pickup</th>
                                                                <th className="py-4 px-6 text-center">Dropoff</th>

                                                            </tr>
                                                        </thead>
                                                        <tbody className="text-sm">
                                                            {(showAllRides ? passenger.rides : passenger.rides.slice(0, 5)).map((ride, idx) => (
                                                                <tr
                                                                    key={idx}
                                                                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-all cursor-pointer group"
                                                                    onClick={() => {
                                                                        setSelectedRide(ride);
                                                                        setModalType('ride_detail');
                                                                    }}
                                                                >
                                                                    <td className="py-4 px-6 text-gray-400 font-bold">#{ride.id}</td>
                                                                    <td className="py-4 px-6 text-gray-600 font-medium whitespace-nowrap">
                                                                        {ride.driver_name ? (
                                                                            <Tooltip content={
                                                                                <div className="p-2 space-y-1">
                                                                                    <div className="flex items-center gap-2"><i className="bi bi-person-badge text-[#D10000]"></i> <span className="font-bold">{ride.driver_name}</span></div>
                                                                                    <div className="flex items-center gap-2"><i className="bi bi-telephone text-[#D10000]"></i> <span>{ride.driver_phone || 'N/A'}</span></div>
                                                                                </div>
                                                                            }>
                                                                                <span className="hover:text-[#D10000] cursor-help border-b border-dotted border-gray-300 transition-colors">
                                                                                    {ride.driver_name}
                                                                                </span>
                                                                            </Tooltip>
                                                                        ) : (
                                                                            <span className="text-gray-400 italic">Loading...</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="py-4 px-6 text-gray-600 font-medium text-xs max-w-[150px] truncate" title={ride.pickup_address}>
                                                                        {ride.pickup_address || (ride.pickup_lat ? <span className="text-gray-400 italic">Resolving Address...</span> : 'N/A')}
                                                                    </td>
                                                                    <td className="py-4 px-6 text-gray-600 font-medium text-xs max-w-[150px] truncate" title={ride.dropoff_address}>
                                                                        {ride.dropoff_address || (ride.dropoff_lat ? <span className="text-gray-400 italic">Resolving Address...</span> : 'N/A')}
                                                                    </td>

                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                    {passenger.rides.length > 5 && (
                                                        <div className="mt-4 text-center">
                                                            <button
                                                                onClick={() => setShowAllRides(!showAllRides)}
                                                                className="text-[#D10000] text-sm font-bold hover:underline"
                                                            >
                                                                {showAllRides ? 'Show Less' : `View All ${passenger.rides.length} Rides`}
                                                            </button>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'payments' && (
                                    <div className="flex flex-col gap-8">
                                        {/* Primary Methods */}
                                        <div className="flex flex-col">
                                            <h4 className="text-[#D10000] font-[600] text-sm mb-4">Primary Methods</h4>
                                            <div className="flex flex-col">
                                                <div className="flex items-center justify-between py-6 border-b border-gray-100">
                                                    <span className="text-sm font-[600] text-gray-900 w-1/3">Canadian Western Bank</span>
                                                    {isEditing ? (
                                                        <div className="w-2/3"><InputWrapper icon="bi bi-bank" className="h-10 mb-0"><Input value={passenger.payments.p1} onChange={e => setPassenger({ ...passenger, payments: { ...passenger.payments, p1: e.target.value } })} /></InputWrapper></div>
                                                    ) : <span className="text-sm font-semibold text-gray-600 w-2/3">{passenger.payments.p1}</span>}
                                                </div>
                                                <div className="flex items-center justify-between py-6 border-b border-gray-100">
                                                    <div className="flex items-center gap-3 w-1/3">
                                                        <div className="w-9 h-5 bg-blue-700 rounded text-white flex items-center justify-center text-[8px] font-[600] italic tracking-wider">VISA</div>
                                                        <span className="text-sm font-[600] text-gray-900">Visa</span>
                                                    </div>
                                                    {isEditing ? (
                                                        <div className="w-2/3"><InputWrapper icon="bi bi-credit-card" className="h-10 mb-0"><Input value={passenger.payments.p2} onChange={e => setPassenger({ ...passenger, payments: { ...passenger.payments, p2: e.target.value } })} /></InputWrapper></div>
                                                    ) : <span className="text-sm font-semibold text-gray-600 w-2/3">{passenger.payments.p2}</span>}
                                                </div>
                                                <div className="flex items-center justify-between py-6 border-b border-gray-100">
                                                    <div className="flex items-center gap-2 w-1/3">
                                                        <div className="h-6 px-2 border border-gray-300 rounded flex items-center justify-center text-gray-800 text-[10px] font-[600]"><i className="bi bi-apple mr-0.5 mt-[-2px]"></i> Pay</div>
                                                        <span className="text-sm font-[600] text-gray-900">Apple Pay</span>
                                                    </div>
                                                    {isEditing ? (
                                                        <div className="w-2/3"><InputWrapper icon="bi bi-credit-card" className="h-10 mb-0"><Input value={passenger.payments.p3} onChange={e => setPassenger({ ...passenger, payments: { ...passenger.payments, p3: e.target.value } })} /></InputWrapper></div>
                                                    ) : <span className="text-sm font-semibold text-gray-600 w-2/3">{passenger.payments.p3}</span>}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Other Methods */}
                                        <div className="flex flex-col">
                                            <h4 className="text-[#D10000] font-[600] text-sm mb-4">Other Methods</h4>
                                            <div className="flex flex-col">
                                                <div className="flex items-center justify-between py-6 border-b border-gray-100">
                                                    <span className="text-sm font-[600] text-gray-900 w-1/3">Canadian Western Bank</span>
                                                    {isEditing ? (
                                                        <div className="w-2/3"><InputWrapper icon="bi bi-bank" className="h-10 mb-0"><Input value={passenger.payments.o1} onChange={e => setPassenger({ ...passenger, payments: { ...passenger.payments, o1: e.target.value } })} /></InputWrapper></div>
                                                    ) : <span className="text-sm font-semibold text-gray-600 w-2/3">{passenger.payments.o1}</span>}
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
                                                        <div className="w-2/3"><InputWrapper icon="bi bi-credit-card" className="h-10 mb-0"><Input value={passenger.payments.o2} onChange={e => setPassenger({ ...passenger, payments: { ...passenger.payments, o2: e.target.value } })} /></InputWrapper></div>
                                                    ) : <span className="text-sm font-semibold text-gray-600 w-2/3">{passenger.payments.o2}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ride Detail Modal */}
                {modalType === 'ride_detail' && selectedRide && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setModalType(null)}>
                        <div className="bg-white translate-y-9 translate-x-10 rounded-[24px] w-full max-w-[800px] flex overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.2)] animate-in zoom-in-95 duration-500 max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                            {/* Left Side: Map & Passenger */}
                            <div className="hidden lg:flex flex-col w-[50%] bg-gray-50 border-r border-gray-100 overflow-y-auto custom-scrollbar">
                                <div className="h-[400px] w-full relative shrink-0 bg-gray-100">
                                    {isLoaded ? (
                                        <GoogleMap
                                            mapContainerStyle={{ width: '100%', height: '100%' }}
                                            center={{ lat: parseFloat(selectedRide.pickup_lat) || 0, lng: parseFloat(selectedRide.pickup_lng) || 0 }}
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
                                                        travelMode: 'DRIVING'
                                                    }}
                                                    callback={(result, status) => { if (status === 'OK' && result) setDirections(result); }}
                                                />
                                            )}
                                            {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: false }} />}
                                        </GoogleMap>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#D10000]"></div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">LOADING MAP...</p>
                                        </div>
                                    )}
                                    <button onClick={() => setModalType(null)} className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center text-gray-600 hover:text-black transition-all z-20"><i className="bi bi-x-lg text-[10px]"></i></button>
                                </div>
                                <div className="p-5 space-y-4">
                                    <div className="bg-[#D10000] text-white px-4 py-2 rounded-[10px] text-[11px] font-bold tracking-wider uppercase">PASSENGER</div>
                                    <div className="flex items-center gap-4 px-1 pb-1">
                                        <Avatar
                                            src={null} // Consistent with original logic which only used initials here
                                            fullName={passenger.name}
                                            size="w-[48px] h-[48px]"
                                            className="bg-[#FFF9E6] text-[#92712D] text-[16px] rounded-[14px]"
                                        />
                                        <div>
                                            <p className="text-[14px] font-bold text-gray-900 leading-tight">{passenger.name}</p>
                                            <p className="text-[11px] font-medium text-gray-400 mt-1">Passenger ID: {passenger.id}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Right Side: Details */}
                            <div className="w-full lg:w-[50%] p-6 overflow-y-auto bg-white custom-scrollbar">
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="bg-[#D10000] text-white px-4 py-2 rounded-[10px] text-[11px] font-bold tracking-wider flex justify-between items-center uppercase">
                                            <span>BOOKING DETAILS</span>
                                            <span className="text-[11px] font-bold opacity-100 uppercase tracking-widest">Booking ID: {selectedRide.id}</span>
                                        </div>
                                        <div className="space-y-4 px-1">
                                            <div className="flex gap-3 items-start">
                                                <div className="mt-1.5 w-2 h-2 rounded-full bg-black flex-shrink-0"></div>
                                                <div>
                                                    <p className="text-[13px] font-bold text-gray-800 leading-tight">Pickup Location</p>
                                                    <p className="text-[11px] text-gray-400 font-medium leading-tight mt-1">{selectedRide.pickup_address || 'Resolving...'}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3 items-start">
                                                <i className="bi bi-geo-alt-fill text-[#D10000] text-sm mt-0.5 flex-shrink-0"></i>
                                                <div>
                                                    <p className="text-[13px] font-bold text-gray-800 leading-tight">Dropoff Location</p>
                                                    <p className="text-[11px] text-gray-400 font-medium leading-tight mt-1">{selectedRide.dropoff_address || 'Resolving...'}</p>
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
                                    <div className="grid grid-cols-2 gap-4 py-0 border-y border-gray-50">
                                        <div className="text-center py-4">
                                            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider mb-1.5 text-center">PICKUP AT</p>
                                            <p className="text-[12px] font-bold text-gray-900 leading-tight">{new Date(selectedRide.pickup_time || selectedRide.created_at).toLocaleDateString()}</p>
                                            <p className="text-[11px] font-medium text-gray-500 mt-1">{new Date(selectedRide.pickup_time || selectedRide.created_at).toLocaleTimeString()}</p>
                                        </div>
                                        <div className="text-center border-l border-gray-100 py-4 text-center">
                                            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider mb-1.5 text-center ">DROPOFF AT</p>
                                            {selectedRide.dropoff_time ? (
                                                <>
                                                    <p className="text-[12px] font-bold text-gray-900 leading-tight">{new Date(selectedRide.dropoff_time).toLocaleDateString()}</p>
                                                    <p className="text-[11px] font-medium text-gray-500 mt-1">{new Date(selectedRide.dropoff_time).toLocaleTimeString()}</p>
                                                </>
                                            ) : <p className="text-[14px] font-bold text-gray-300 mt-1 text-center">—</p>}
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="bg-[#D10000] uppercase text-white px-4 py-2 rounded-[10px]">DRIVER INFORMATION</div>
                                        <div className="flex items-center gap-4 px-1 pb-1">
                                            <div className="w-[48px] h-[48px] bg-[#F3F4F6] rounded-[14px] flex items-center justify-center text-gray-400 shrink-0"><i className="bi bi-person-badge text-xl"></i></div>
                                            <div className="space-y-1">
                                                <p className="text-[15px] font-bold text-gray-900 leading-tight">{selectedRide.driver_name || 'N/A'}</p>
                                                <p className="text-[11px] font-medium text-gray-400 mt-1">Driver ID: {selectedRide.driver_id || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modals Overlay */}
                {['block', 'unblock', 'delete'].includes(modalType) && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                        <div className="bg-white rounded-[32px] p-8 w-[90%] max-w-sm flex flex-col items-center text-center shadow-2xl">
                            <div className="mb-4">
                                <i className={`text-[40px] text-[#EE1B24] ${modalType === 'delete' ? 'bi bi-trash-fill' : 'bi bi-slash-circle font-[600]'}`}></i>
                            </div>

                            <h3 className="text-xl font-[600] text-gray-900 mb-3">
                                {modalType === 'block' ? 'Block Passenger' : modalType === 'unblock' ? 'unblock Passenger' : 'Delete Passenger'}
                            </h3>

                            <p className="text-xs font-semibold text-gray-600 mb-8 max-w-[250px] mx-auto">
                                {modalType === 'delete' ? (
                                    <>Are you sure to Delete the <span className="text-[#EE1B24]">{passenger.name}</span> Passenger. This action can't be undone.</>
                                ) : (
                                    <>Are you sure to {modalType === 'block' ? 'Block' : 'unblock'} the <span className="text-[#EE1B24]">{passenger.name}</span> Passenger</>
                                )}
                            </p>

                            <div className="flex items-center gap-3 w-full">
                                <button className="flex-1 py-3 bg-[#EE1B24] text-white rounded-[12px] font-[600] text-sm hover:bg-[#d01019] transition-colors" onClick={handleStatusAction}>
                                    Confirm
                                </button>
                                <button className="flex-1 py-3 bg-white text-gray-900 border border-gray-900 rounded-[12px] font-[600] text-sm hover:bg-gray-50 transition-colors" onClick={() => setModalType(null)}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
