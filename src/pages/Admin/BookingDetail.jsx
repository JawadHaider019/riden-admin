import React, { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { Link, useParams } from 'react-router-dom';
import { Badge, useToast, Loader } from '@/components/UI';
import { useJsApiLoader, GoogleMap, DirectionsService, DirectionsRenderer } from '@react-google-maps/api';
import { getBookingDetail } from '@/api/bookingApi';
import { getVehicleTypes } from '@/api/vehicleApi';
import api, { getImageUrl } from '@/api/api';
import { reverseGeocode } from '@/utils/geoUtils';
import { format } from 'date-fns';

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

export default function BookingDetail() {
    const { id } = useParams();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [bookingData, setBookingData] = useState(null);
    const [directions, setDirections] = useState(null);
    const [vehicleTypes, setVehicleTypes] = useState([]);

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: GOOGLE_MAPS_KEY
    });

    useEffect(() => {
        const fetchBooking = async () => {
            try {
                setLoading(true);
                const res = await getBookingDetail(id);
                // Handle different payload wrappers
                const data = res.data?.data || res.data || res;
                if (data) {
                    console.log('[BookingDetail] raw data:', data);
                    let enriched = { ...data };

                    // The detail endpoint omits requested_vehicle_type — fetch it from list if needed
                    if (!enriched.requested_vehicle_type && !enriched.vehicle_type) {
                        try {
                            for (let page = 1; page <= 10; page++) {
                                const loopRes = await api.get('/admin/bookings', { params: { page } });
                                const list = loopRes.data?.data?.data || loopRes.data?.data || [];
                                const match = list.find(b => b.id == id);
                                if (match) {
                                    enriched = {
                                        ...enriched,
                                        requested_vehicle_type: match.requested_vehicle_type || null,
                                        vehicle_type: match.vehicle_type || null,
                                    };
                                    break;
                                }
                                const meta = loopRes.data?.data || {};
                                if (meta.current_page >= meta.last_page || !meta.next_page_url) break;
                            }
                        } catch (_) { /* non-critical, ignore */ }
                    }

                    setBookingData(enriched);

                    // Resolve addresses
                    const pAddr = enriched.pickup_location || await reverseGeocode(enriched.pickup_lat, enriched.pickup_lng);
                    const dAddr = enriched.dropoff_location || await reverseGeocode(enriched.dropoff_lat, enriched.dropoff_lng);

                    setBookingData(prev => ({
                        ...prev,
                        pickup_location: pAddr,
                        dropoff_location: dAddr
                    }));
                }
            } catch (error) {
                console.error("Error fetching booking detail:", error);

                // Fallback loop if show method throws 500
                if (error.response?.status === 500) {
                    try {
                        for (let page = 1; page <= 10; page++) {
                            const loopRes = await api.get('/admin/bookings', { params: { page } });
                            const list = loopRes.data?.data?.data || loopRes.data?.data || [];
                            const match = list.find(b => b.id == id);
                            if (match) {
                                setBookingData(match);
                                break;
                            }
                            const meta = loopRes.data?.data || {};
                            if (meta.current_page >= meta.last_page || !meta.next_page_url) break;
                        }
                    } catch (e) {
                        console.error("Fallback fetch error:", e);
                    }
                }
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchBooking();
    }, [id]);

    useEffect(() => {
        const fetchTypes = async () => {
            try {
                const res = await getVehicleTypes();
                const types = res.vehicleTypes || res.data?.vehicleTypes || [];
                setVehicleTypes(types);
            } catch (err) {
                console.error("Error fetching vehicle types:", err);
            }
        };
        fetchTypes();
    }, []);

    if (loading) {
        return <Loader />;
    }

    if (!bookingData) {
        return (
            <AdminLayout title="Booking Management">
                <div className="flex flex-col items-center justify-center p-10 text-gray-500">
                    <i className="bi bi-file-earmark-x text-5xl mb-4"></i>
                    <h3 className="text-xl">Booking Not Found</h3>
                </div>
            </AdminLayout>
        );
    }

    const ongoingStatuses = ['requested', 'accepted', 'arrived', 'ongoing', 'pending'];
    const isOngoing = ongoingStatuses.includes(bookingData.status);
    const isCompleted = bookingData.status === 'completed' || bookingData.status === 'success';
    const isCancelled = bookingData.status === 'cancelled' || bookingData.status === 'danger' || bookingData.status === 'rejected';

    const statusVariant = isOngoing ? 'online' : isCompleted ? 'success' : 'danger';

    // Map to normalized object for rendering
    const booking = {
        id: `${bookingData.id}`,
        date: bookingData.created_at ? new Date(bookingData.created_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A',
        statusLabel: bookingData.status ? (bookingData.status.charAt(0).toUpperCase() + bookingData.status.slice(1)) : 'N/A',
        title: isOngoing ? 'Ongoing Ride' : isCompleted ? 'Completed Ride' : 'Cancelled Ride',
        driver: bookingData.driver ? {
            name: `${bookingData.driver.first_name || ''} ${bookingData.driver.last_name || ''}`.trim() || 'N/A',
            avatar: (bookingData.driver.avatar ? getImageUrl(bookingData.driver.avatar) : bookingData.driver.avatar_url) || null,
            rides: bookingData.driver.total_rides || bookingData.driver.rides_count || 0,
            reviews: bookingData.driver.reviews_count || 0
        } : { name: 'N/A', avatar: null, rides: 0, reviews: 0 },
        vehicle: (bookingData.vehicle || bookingData.driver?.vehicle) ? {
            name: (bookingData.vehicle?.model || bookingData.driver?.vehicle?.model) || 'N/A',
            vehNo: (bookingData.vehicle?.license_plate || bookingData.driver?.vehicle?.license_plate || bookingData.vehicle?.plate_number || bookingData.driver?.vehicle?.plate_number) || 'N/A'
        } : { name: 'N/A', vehNo: bookingData.vehicle_id || 'N/A' },
        pickup: {
            label: 'Pickup Location',
            address: bookingData.pickup_location || (bookingData.pickup_lat ? `${bookingData.pickup_lat}, ${bookingData.pickup_lng}` : 'N/A')
        },
        dropoff: {
            label: 'Dropoff Location',
            address: bookingData.dropoff_location || (bookingData.dropoff_lat ? `${bookingData.dropoff_lat}, ${bookingData.dropoff_lng}` : 'N/A')
        },
        distance: (bookingData.estimated_distance || bookingData.distance) ?
            (() => {
                const val = bookingData.estimated_distance || bookingData.distance;
                return typeof val === 'string' && (val.includes('km') || val.includes('meters')) ? val : `${val} km`;
            })() : 'N/A',
        time: (bookingData.estimated_time || bookingData.duration) ?
            (() => {
                const val = bookingData.estimated_time || bookingData.duration;
                return typeof val === 'string' && (val.includes('min') || val.includes('hour')) ? val : `${val} mins`;
            })() : 'N/A',
        fare: bookingData.fare ? `C$ ${bookingData.fare}` : '0.00',
        passenger: bookingData.passenger ? {
            name: `${bookingData.passenger.first_name || ''} ${bookingData.passenger.last_name || ''}`.trim() || 'N/A',
            avatar: (bookingData.passenger.avatar ? getImageUrl(bookingData.passenger.avatar) : bookingData.passenger.avatar_url) || null,
            rides: bookingData.passenger.total_rides || bookingData.passenger.rides_count || 0,
            reviews: bookingData.passenger.reviews_count || 0
        } : { name: 'N/A', avatar: null, rides: 0, reviews: 0 },
        payment: { brand: bookingData.payment_method || 'N/A', last4: bookingData.card_last_four || 'N/A' },
        rating: bookingData.rating || 0,
        reviewText: bookingData.review || 'N/A',
        tip: bookingData.tip_amount ? `Passenger gave C$ ${bookingData.tip_amount} as tip` : 'N/A',
        cancellationReason: bookingData.cancellation_reason || 'N/A',
        bookedAt: (() => {
            if (!bookingData.created_at) return 'N/A';
            const d = new Date(bookingData.created_at);
            return isNaN(d.getTime()) ? 'N/A' : format(d, 'MMM dd, yyyy HH:mm');
        })(),
        completedAt: (() => {
            if (bookingData.dropoff_time) {
                const d = new Date(bookingData.dropoff_time);
                return isNaN(d.getTime()) ? 'N/A' : format(d, 'MMM dd, yyyy HH:mm');
            }
            return bookingData.status === 'completed' ? 'N/A' : '—';
        })(),
        requested_vehicle_type:
            bookingData.requested_vehicle_type ||
            bookingData.vehicle_type ||
            bookingData.requestedVehicleType ||
            bookingData.requested_vehicle ||
            null,
        status: bookingData.status,
        vehicle_type_id: bookingData.vehicle_type_id || bookingData.vehicle_type?.id || bookingData.requested_vehicle_type?.id
    };

    // Find car image helper
    const getCarImage = () => {
        // 1. Try specific vehicle images if available
        const vehicle = bookingData.vehicle || bookingData.driver?.vehicle;
        if (vehicle?.front_image) return getImageUrl(vehicle.front_image);
        if (vehicle?.back_image) return getImageUrl(vehicle.back_image);

        // 2. Try type image from the booking object itself
        const type = booking.requested_vehicle_type || vehicle?.type;
        if (type?.image_path) return getImageUrl(type.image_path);

        // 3. Fallback to matching by ID from the global vehicleTypes list
        const typeId = booking.vehicle_type_id;
        if (typeId && vehicleTypes.length > 0) {
            const matchedType = vehicleTypes.find(t => String(t.id) === String(typeId));
            if (matchedType?.image_path) return getImageUrl(matchedType.image_path);
        }

        return null;
    };

    const carImage = getCarImage();



    return (
        <AdminLayout title="Booking Management">
            {/* Back + Header */}
            <div className="flex flex-col gap-3 mb-6">
                <div className="flex justify-between items-center gap-3">

                    <div className="flex items-center gap-3">
                        <Link to="/bookings" className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors bg-white">
                            <i className="bi bi-chevron-left text-sm"></i>
                        </Link>
                        <h2 className="text-xl font-[600] text-gray-900">Booking Detail</h2>
                    </div>

                    <Badge variant={statusVariant}>{booking.statusLabel}</Badge>
                </div>
                <div className="flex items-center justify-between">
                    <span className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-[600] text-gray-900 shadow-sm">
                        Booking ID : {booking.id}
                    </span>
                    <span className="text-sm font-[600] text-gray-500">{booking.date}</span>

                </div>


            </div>

            {/* Main 2-col layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* LEFT — Map */}
                <div className="flex flex-col gap-4">
                    {/* Map — Google Maps JavaScript API */}
                    <div className="relative rounded-[22px] overflow-hidden h-[420px] border border-gray-100 shadow-sm">
                        {isLoaded ? (
                            <GoogleMap
                                mapContainerStyle={{ width: '100%', height: '100%' }}
                                center={{
                                    lat: parseFloat(bookingData?.pickup_lat) || 31.5204,
                                    lng: parseFloat(bookingData?.pickup_lng) || 74.3587
                                }}
                                zoom={12}
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
                                {bookingData?.pickup_lat && bookingData?.dropoff_lat && !directions &&
                                    !isNaN(parseFloat(bookingData.pickup_lat)) && !isNaN(parseFloat(bookingData.dropoff_lat)) && (
                                        <DirectionsService
                                            options={{
                                                origin: { lat: parseFloat(bookingData.pickup_lat), lng: parseFloat(bookingData.pickup_lng) },
                                                destination: { lat: parseFloat(bookingData.dropoff_lat), lng: parseFloat(bookingData.dropoff_lng) },
                                                travelMode: 'DRIVING'
                                            }}
                                            callback={(result, status) => {
                                                if (status === 'OK' && result) setDirections(result);
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
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 gap-2 text-gray-400">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D10000]"></div>
                                <span className="text-xs font-semibold">Loading Map…</span>
                            </div>
                        )}
                    </div>

                    {/* Ratings & Reviews — only for completed */}
                    {isCompleted && (
                        <>
                            <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden">
                                <div className="bg-[#D10000] px-5 py-3 flex items-center gap-2">
                                    <i className="bi bi-star-fill text-white text-sm"></i>
                                    <h5 className="text-white font-[600] text-sm">Ratings & Reviews</h5>
                                </div>
                                <div className="p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="flex gap-0.5 text-[#FBBF24]">
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <i key={s} className={`bi bi-star${s <= booking.rating ? '-fill' : ''} text-sm`}></i>
                                            ))}
                                        </div>
                                        <span className="text-xs font-[600] text-gray-500">({booking.rating}.0)</span>
                                    </div>
                                    <p className="text-sm text-gray-600 font-medium leading-relaxed">{booking.reviewText}</p>
                                </div>
                            </div>

                            <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden">
                                <div className="bg-[#D10000] px-5 py-3 flex items-center gap-2">
                                    <i className="bi bi-cash-coin text-white text-sm"></i>
                                    <h5 className="text-white font-[600] text-sm">Tip</h5>
                                </div>
                                <div className="p-5">
                                    <p className="text-sm text-gray-600 font-medium leading-relaxed">{booking.tip}</p>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Cancellation Reason — only for cancelled */}
                    {isCancelled && (
                        <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden">
                            <div className="bg-[#D10000] px-5 py-3 flex items-center gap-2">
                                <i className="bi bi-x-circle-fill text-white text-sm"></i>
                                <h5 className="text-white font-[600] text-sm">Cancellation Reason</h5>
                            </div>
                            <div className="p-5">
                                <p className="text-sm text-gray-600 font-medium leading-relaxed">{booking.cancellationReason}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT — Ride Details */}
                <div className="flex flex-col gap-4">


                    <div className="bg-white rounded-[22px] border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 pt-5 pb-2">

                            {/* Driver Section */}
                            {booking.status !== "requested" && <div className="mb-3">
                                <div className="bg-[#D10000] rounded-xl px-4 py-2 mb-3">
                                    <span className="text-white font-[600] text-xs uppercase tracking-wider">Driver</span>
                                </div>
                                <div className="flex items-center justify-between px-1">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={booking.driver.avatar || `https://ui-avatars.com/api/?name=${booking.driver.name}&background=random`}
                                            className="w-12 h-12 rounded-[14px] object-cover"
                                            alt="Driver"
                                            onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${booking.driver.name}&background=random`; }}
                                        />
                                        <div>
                                            <p className="text-sm font-[600] text-gray-900">{booking.driver.name}</p>
                                            <p className="text-xs text-gray-400 font-medium">{booking.driver.rides} Rides ({booking.driver.reviews} reviews)</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-[#D10000] hover:bg-red-50 transition-colors">
                                            <i className="bi bi-telephone-fill text-sm"></i>
                                        </button>
                                        {isOngoing && (
                                            <button className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-[#D10000] hover:bg-red-50 transition-colors">
                                                <i className="bi bi-chat-fill text-sm"></i>
                                            </button>
                                        )}
                                    </div>
                                </div>


                            </div>}
                            {/* Vehicle Section */}
                            <div className="mb-3">
                                <div className="bg-[#D10000] rounded-xl px-4 py-2 mb-3">
                                    <span className="text-white font-[600] text-xs uppercase tracking-wider">{bookingData.status === 'requested' ? 'Requested Vehicle' : 'Vehicle'}</span>
                                </div>

                                {/* Vehicle — conditional on status */}
                                {bookingData.status === 'requested' ? (
                                    <div className="flex items-center gap-4 mt-3 px-1 py-4 border-t border-gray-50 text-[14px]">
                                        <div className="w-20 h-14 rounded-2xl overflow-hidden bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100 shadow-sm">
                                            {carImage ? (
                                                <img src={carImage} className="w-full h-full object-contain" alt="Car" />
                                            ) : (
                                                <i className="bi bi-car-front-fill text-2xl text-gray-300"></i>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-1.5 flex-1">
                                            <div className='grid grid-cols-2 gap-2'>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <i className="bi bi-hash text-[#D10000]"></i>
                                                    <span className="font-[700] text-gray-900">{booking.requested_vehicle_type?.id || 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <i className="bi bi-car-front-fill text-[#D10000]"></i>
                                                    <span className="font-[700] text-gray-900">{booking.requested_vehicle_type?.category || 'N/A'}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <i className="bi bi-people-fill text-[#D10000]"></i>
                                                <span className="text-gray-600 font-medium">Capacity: {booking.requested_vehicle_type?.capacity || 'N/A'}</span>
                                            </div>
                                            {booking.requested_vehicle_type?.car_details && (
                                                <div className="flex items-center gap-2 text-xs mt-0.5">
                                                    <i className="bi bi-info-circle text-[#D10000]"></i>
                                                    <span className="text-gray-500 italic break-words">{booking.requested_vehicle_type.car_details}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4 mt-3 px-1 py-4 border-t border-gray-50 text-[14px]">
                                        <div className="w-20 h-14 rounded-2xl overflow-hidden bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100 shadow-sm">
                                            {carImage ? (
                                                <img src={carImage} className="w-full h-full object-contain" alt="Car" />
                                            ) : (
                                                <i className="bi bi-car-front-fill text-2xl text-gray-300"></i>
                                            )}
                                        </div>
                                        <div className="flex flex-col flex-1">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-black rounded-full shrink-0"></div>
                                                <span className="font-[600] text-gray-900 text-base">{booking.vehicle.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] text-gray-400 font-[700] uppercase tracking-wider">License Plate:</span>
                                                <span className="text-xs font-[700] text-[#D10000] bg-red-50 px-2 py-0.5 rounded-lg border border-red-100 shadow-sm">{booking.vehicle.vehNo}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* Booking Details */}
                            <div className="mb-3">
                                <div className="bg-[#D10000] rounded-xl px-4 py-2 mb-3">
                                    <span className="text-white font-[600] text-xs uppercase tracking-wider">Booking Details</span>
                                </div>
                                <div className="relative pl-6 mb-3">
                                    <div className="absolute left-[3px] top-[14px] bottom-[14px] border-l-2 border-dashed border-gray-200"></div>
                                    <div className="relative mb-4">
                                        <div className="absolute -left-[27px] top-[5px] w-[10px] h-[10px] bg-black rounded-full"></div>
                                        <p className="text-sm font-[600] text-gray-900">{booking.pickup.label}</p>
                                        <p className="text-xs text-gray-400 font-medium">{booking.pickup.address}</p>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute -left-[30px] top-[3px] text-[#D10000]">
                                            <i className="bi bi-geo-alt-fill text-base"></i>
                                        </div>
                                        <p className="text-sm font-[600] text-gray-900">{booking.dropoff.label}</p>
                                        <p className="text-xs text-gray-400 font-medium">{booking.dropoff.address}</p>
                                    </div>
                                </div>

                                {/* Metrics */}
                                <div className="flex justify-around border-t border-gray-50 pt-4 pb-2">
                                    <div className="text-center">
                                        <p className="text-[10px] font-[600] text-gray-400 uppercase tracking-wider mb-1">EST Distance</p>
                                        <p className="text-sm font-[600] text-gray-900">{booking.distance}</p>
                                    </div>
                                    <div className="w-px bg-gray-100"></div>
                                    <div className="text-center">
                                        <p className="text-[10px] font-[600] text-gray-400 uppercase tracking-wider mb-1">EST Time</p>
                                        <p className="text-sm font-[600] text-gray-900">{booking.time}</p>
                                    </div>
                                    <div className="w-px bg-gray-100"></div>
                                    <div className="text-center">
                                        <p className="text-[10px] font-[600] text-gray-400 uppercase tracking-wider mb-1">EST Fare</p>
                                        <p className="text-sm font-[600] text-[#D10000]">{booking.fare}</p>
                                    </div>
                                </div>

                                {/* Timestamps */}
                                <div className="flex justify-around border-t border-gray-50 pt-4 pb-2">
                                    <div className="text-center">
                                        <p className="text-[10px] font-[600] text-gray-400 uppercase tracking-wider mb-1">Booked At</p>
                                        <p className="text-[11px] font-[600] text-gray-900">{booking.bookedAt}</p>
                                    </div>
                                    <div className="w-px bg-gray-100"></div>
                                    <div className="text-center">
                                        <p className="text-[10px] font-[600] text-gray-400 uppercase tracking-wider mb-1">Completed At</p>
                                        <p className="text-[11px] font-[600] text-gray-900">{booking.completedAt}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Passenger Section */}
                            <div className="mb-4">
                                <div className="bg-[#D10000] rounded-xl px-4 py-2 mb-3">
                                    <span className="text-white font-[600] text-xs uppercase tracking-wider">Passenger</span>
                                </div>
                                <div className="flex items-center gap-3 px-1">
                                    <img
                                        src={booking.passenger.avatar || `https://ui-avatars.com/api/?name=${booking.passenger.name}&background=random`}
                                        className="w-12 h-12 rounded-[14px] object-cover"
                                        alt="Passenger"
                                        onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${booking.passenger.name}&background=random`; }}
                                    />
                                    <div>
                                        <p className="text-sm font-[600] text-gray-900">{booking.passenger.name}</p>
                                        <p className="text-xs text-gray-400 font-medium">{booking.passenger.rides > 1 ? `${booking.passenger.rides} Rides` : `${booking.passenger.rides} Ride`}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div className="flex items-center justify-between px-1 py-4 border-t border-gray-50">
                                <span className="text-sm font-[600] text-gray-500">Payment Method</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-9 h-5 bg-blue-700 rounded text-white flex items-center justify-center text-[8px] font-[600] italic tracking-wider">VISA</div>
                                    <span className="text-sm font-[600] text-gray-900">••••••••{booking.payment.last4}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}