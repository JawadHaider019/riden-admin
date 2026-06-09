import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { Link, useParams } from 'react-router-dom';
import { Badge, useToast, Loader, Avatar } from '@/components/UI';
import { useJsApiLoader, GoogleMap, DirectionsService, DirectionsRenderer, MarkerF } from '@react-google-maps/api';
import { getBookingDetail } from '@/api/bookingApi';
import { getVehicleTypes } from '@/api/vehicleApi';
import api, { getImageUrl } from '@/api/api';

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
        googleMapsApiKey: GOOGLE_MAPS_KEY,
        libraries: ['places']
    });

    const [mapInstance, setMapInstance] = useState(null);

    const onLoad = useCallback((map) => {
        setMapInstance(map);
    }, []);

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                setLoading(true);
                const [bookingRes, typesRes] = await Promise.all([
                    getBookingDetail(id),
                    getVehicleTypes()
                ]);

                // 1. Types
                const types = Array.isArray(typesRes) ? typesRes : (typesRes.vehicleTypes || typesRes.data?.vehicleTypes || typesRes.data || []);
                setVehicleTypes(types);

                // 2. Booking
                const bookingDataRaw = bookingRes.booking || bookingRes.data?.data || bookingRes.data || bookingRes;
                if (bookingDataRaw && bookingDataRaw.id) {
                    setBookingData(bookingDataRaw);

                    // 3. Optional: Fetch specific vehicle detail if assigned
                    const vehicleId = bookingDataRaw.vehicle_id || bookingDataRaw.vehicle?.id;
                    if (vehicleId) {
                        try {
                            const vRes = await getVehicleDetail(vehicleId);
                            // Detail route usually returns { vehicle: { ... } } or { data: { ... } }
                            let vData = vRes.vehicle || (vRes.data?.data) || vRes.data || vRes;
                            if (Array.isArray(vData)) vData = vData[0]; // Handle array wrap

                            if (vData && typeof vData === 'object' && vData.id) {
                                setBookingData(prev => ({
                                    ...prev,
                                    vehicle: { ...prev.vehicle, ...vData }
                                }));
                            }
                        } catch (vErr) {
                            console.error("Vehicle detail fetch error:", vErr);
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                showToast("Error loading booking details", "error");
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchAllData();
    }, [id, showToast]);

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
        vehicle: (() => {
            const v = bookingData.vehicle || bookingData.driver?.vehicle;
            if (!v) return { name: 'Not Assigned', vehNo: bookingData.vehicle_id || 'Not Assigned', type: 'Not Assigned', capacity: 'Not Assigned' };

            // Try to find the type in global list as a reliable fallback
            const typeId = v.vehicle_type_id || v.type_id || bookingData.req_veh_type_id || bookingData.vehicle_type_id;
            const globalType = (typeId && vehicleTypes && vehicleTypes.length > 0)
                ? vehicleTypes.find(t => String(t.id) === String(typeId))
                : null;

            return {
                name: v.model || v.brand_model || 'N/A',
                vehNo: v.license_plate || v.plate_number || v.vehicle_number || 'N/A',
                capacity: v.type?.capacity || v.capacity || v.max_passengers || v.seats || globalType?.capacity || globalType?.max_passengers || 'N/A',
                type: v.type?.category || v.category_name || v.category || v.vehicle_type?.category || globalType?.category || globalType?.name || 'N/A'
            };
        })(),
        pickup: {
            label: 'Pickup Location',
            address: bookingData.pickup_address || 'N/A'
        },
        dropoff: {
            label: 'Dropoff Location',
            address: bookingData.dropoff_address || 'N/A'
        },
        distance: (() => {
            const val = bookingData.total_distance || bookingData.distance_from_pickup_dropoff || bookingData.estimated_distance || bookingData.distance;
            if (!val && val !== 0) return 'N/A';
            return typeof val === 'string' && (val.includes('km') || val.includes('m')) ? val : `${parseFloat(val).toFixed(2)} km`;
        })(),
        time: (() => {
            const val = bookingData.total_time || bookingData.time_from_pickup_dropoff || bookingData.estimated_time || bookingData.duration;
            if (!val && val !== 0) return 'N/A';
            return typeof val === 'string' && (val.includes('min') || val.includes('hour')) ? val : `${val} mins`;
        })(),
        fare: (() => {
            // New shape: fare is an object with grand_total + currency
            if (bookingData.fare && typeof bookingData.fare === 'object') {
                const currency = bookingData.fare.currency || 'C$';
                const total = parseFloat(bookingData.fare.grand_total || 0).toFixed(2);
                return `${currency} ${total}`;
            }
            // Old shape: fare is a plain number/string
            if (bookingData.fare) return `C$ ${bookingData.fare}`;
            return 'N/A';
        })(),
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
        requested_vehicle_type: (() => {
            const type = bookingData.requested_vehicle_type ||
                bookingData.vehicle_type ||
                bookingData.requestedVehicleType ||
                bookingData.requested_vehicle;

            if (type && typeof type === 'object') return type;

            const typeId = bookingData.req_veh_type_id || bookingData.vehicle_type_id;
            if (typeId && vehicleTypes.length > 0) {
                return vehicleTypes.find(t => String(t.id) === String(typeId)) || null;
            }
            return null;
        })(),
        status: bookingData.status,
        vehicle_type_id:
            bookingData.req_veh_type_id ||
            bookingData.vehicle_type_id ||
            bookingData.vehicle?.vehicle_type_id ||
            bookingData.vehicle_type?.id ||
            bookingData.requested_vehicle_type?.id
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
                                onLoad={onLoad}
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
                                        options={{
                                            suppressMarkers: true,
                                            polylineOptions: {
                                                strokeColor: '#D10000',
                                                strokeWeight: 6,
                                                strokeOpacity: 0.9,
                                            }
                                        }}
                                    />
                                )}
                                {/* Pickup marker — Small Red Circle */}
                                {bookingData?.pickup_lat && !isNaN(parseFloat(bookingData.pickup_lat)) && (
                                    <MarkerF
                                        position={
                                            directions
                                                ? directions.routes[0].legs[0].start_location
                                                : { lat: parseFloat(bookingData.pickup_lat), lng: parseFloat(bookingData.pickup_lng) }
                                        }
                                        icon={{
                                            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                                                    <circle cx="8" cy="8" r="6" fill="#D10000" stroke="white" stroke-width="2"/>
                                                </svg>
                                            `)}`,
                                            scaledSize: { width: 16, height: 16 },
                                            anchor: { x: 8, y: 8 },
                                            labelOrigin: { x: 8, y: -10 }
                                        }}
                                        label={{ text: 'Pickup', fontSize: '11px', fontWeight: 'bold', color: '#D10000' }}
                                    />
                                )}
                                {/* Dropoff marker — Small Red Circle */}
                                {bookingData?.dropoff_lat && !isNaN(parseFloat(bookingData.dropoff_lat)) && (
                                    <MarkerF
                                        position={
                                            directions
                                                ? directions.routes[0].legs[0].end_location
                                                : { lat: parseFloat(bookingData.dropoff_lat), lng: parseFloat(bookingData.dropoff_lng) }
                                        }
                                        icon={{
                                            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                                                    <circle cx="8" cy="8" r="6" fill="#D10000" stroke="white" stroke-width="2"/>
                                                </svg>
                                            `)}`,
                                            scaledSize: { width: 16, height: 16 },
                                            anchor: { x: 8, y: 8 },
                                            labelOrigin: { x: 8, y: -10 }
                                        }}
                                        label={{ text: 'Dropoff', fontSize: '11px', fontWeight: 'bold', color: '#D10000' }}
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
                                        <Avatar
                                            src={booking.driver.avatar}
                                            fullName={booking.driver.name}
                                            size="w-12 h-12"
                                            className="rounded-[14px]"
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
                                    <span className="text-white font-[600] text-xs uppercase tracking-wider">{(bookingData.status === 'requested' || bookingData.status === 'cancelled') ? 'Requested Vehicle' : 'Vehicle'}</span>
                                </div>

                                {/* Vehicle — conditional on status */}
                                {(bookingData.status === 'requested' || bookingData.status === 'cancelled') ? (
                                    <div className="flex items-center gap-4 mt-3 px-1 py-4 border-t border-gray-50 text-[14px]">
                                        <div className="w-20 h-14 rounded-2xl overflow-hidden bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100 shadow-sm">
                                            {carImage ? (
                                                <img src={carImage} className="w-full h-full object-contain" alt="Car" />
                                            ) : (
                                                <i className="bi bi-car-front-fill text-2xl text-gray-300"></i>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-1.5 flex-1">
                                            {(!booking.requested_vehicle_type) ? (
                                                <div className="flex items-center gap-2">
                                                    <i className="bi bi-car-front-fill text-[#D10000]"></i>
                                                    <span className="font-[700] text-gray-900 text-lg">Any Vehicle</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className='grid grid-cols-2 gap-2'>
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <i className="bi bi-hash text-[#D10000]"></i>
                                                            <span className="font-[700] text-gray-900">{booking.requested_vehicle_type?.id || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <i className="bi bi-car-front-fill text-[#D10000]"></i>
                                                            <span className="font-[700] text-gray-900">{booking.requested_vehicle_type?.category || booking.requested_vehicle_type?.name || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <i className="bi bi-people-fill text-[#D10000]"></i>
                                                        <span className="text-gray-600 font-medium">Capacity: {booking.requested_vehicle_type?.capacity || booking.requested_vehicle_type?.max_passengers || booking.requested_vehicle_type?.seats || 'N/A'}</span>
                                                    </div>
                                                    {(booking.requested_vehicle_type?.car_details || booking.requested_vehicle_type?.description) && (
                                                        <div className="flex items-center gap-2 text-xs mt-0.5">
                                                            <i className="bi bi-info-circle text-[#D10000]"></i>
                                                            <span className="text-gray-500 italic break-words">{booking.requested_vehicle_type.car_details || booking.requested_vehicle_type.description}</span>
                                                        </div>
                                                    )}
                                                </>
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
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-black rounded-full shrink-0"></div>
                                                    <span className="font-[600] text-gray-900 text-base">{booking.vehicle.name}</span>
                                                </div>

                                            </div>
                                            <div className="flex items-center gap-4 mt-1.5">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] text-gray-400 font-[700] uppercase tracking-wider">Plate:</span>
                                                    <span className="text-xs font-[600] text-[#D10000] bg-red-50 px-2 py-0.5 rounded-full border border-red-100">{booking.vehicle.vehNo}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <i className="bi bi-people-fill text-[#D10000] text-xs"></i>
                                                    <span className="text-xs font-bold text-gray-700">{booking.vehicle.capacity} Seats</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-[#D10000] bg-red-50 border border-gray-100 px-2 py-0.5 rounded-full uppercase">
                                                    Type: {booking.vehicle.type}
                                                </span>
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
                                    <Avatar
                                        src={booking.passenger.avatar}
                                        fullName={booking.passenger.name}
                                        size="w-12 h-12"
                                        className="rounded-[14px]"
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
        </AdminLayout >
    );
}