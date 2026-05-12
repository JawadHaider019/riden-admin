import React, { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { Link, useParams } from 'react-router-dom';
import { Badge, useToast } from '@/components/UI';
import { getBookingDetail } from '@/api/bookingApi';
import api, { getImageUrl } from '@/api/api';
import { reverseGeocode } from '@/utils/geoUtils';

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

export default function BookingDetail() {
    const { id } = useParams();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [bookingData, setBookingData] = useState(null);

    useEffect(() => {
        const fetchBooking = async () => {
            try {
                setLoading(true);
                const res = await getBookingDetail(id);
                // Handle different payload wrappers
                const data = res.data?.data || res.data || res;
                if (data) {
                    setBookingData(data);

                    // Resolve addresses
                    const pAddr = data.pickup_location || await reverseGeocode(data.pickup_lat, data.pickup_lng);
                    const dAddr = data.dropoff_location || await reverseGeocode(data.dropoff_lat, data.dropoff_lng);

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
                        let found = false;
                        for (let page = 1; page <= 10; page++) {
                            const loopRes = await api.get('/admin/bookings', { params: { page } });
                            const list = loopRes.data?.data?.data || loopRes.data?.data || [];
                            const match = list.find(b => b.id == id);
                            if (match) {
                                setBookingData(match);
                                found = true;
                                break;
                            }
                            const meta = loopRes.data?.data || {};
                            if (meta.current_page >= meta.last_page || !meta.next_page_url) break;
                        }
                        if (!found) showToast("Booking not found", "error");
                    } catch (e) {
                        showToast(error.response?.data?.message || "Failed to load booking details", "error");
                    }
                } else {
                    showToast(error.response?.data?.message || "Failed to load booking details", "error");
                }
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchBooking();
    }, [id]);

    if (loading) {
        return (
            <AdminLayout title="Booking Management">
                <div className="flex justify-center items-center h-[600px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D10000]"></div>
                </div>
            </AdminLayout>
        );
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
        date: new Date(bookingData.created_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        statusLabel: bookingData.status?.charAt(0).toUpperCase() + bookingData.status?.slice(1),
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
        fare: bookingData.fare ? `C$ ${bookingData.fare}` : 'N/A',
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
        cancellationReason: bookingData.cancellation_reason || 'N/A'
    };



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
                    {/* Map iframe */}
                    <div className="relative rounded-[22px] overflow-hidden h-[420px] border border-gray-100 shadow-sm">
                        <iframe
                            className="w-full h-full border-none contrast-[1.05]"
                            src={(bookingData?.pickup_lat && bookingData?.dropoff_lat)
                                ? `https://www.google.com/maps/embed/v1/directions?key=${GOOGLE_MAPS_KEY}&origin=${bookingData.pickup_lat},${bookingData.pickup_lng}&destination=${bookingData.dropoff_lat},${bookingData.dropoff_lng}&mode=driving`
                                : bookingData?.pickup_lat
                                    ? `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_KEY}&q=${bookingData.pickup_lat},${bookingData.pickup_lng}`
                                    : `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1469550!2d72!3d31!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x38db02b66236b283%3A0x444d36f32e92178d!2sPakistan!5e0!3m2!1sen!2s!4v1700000000000!5m2!1sen!2s`
                            }
                            allowFullScreen=""
                            loading="lazy"
                            title="Ride Map"
                        ></iframe>
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
                            <h3 className="text-lg font-[600] text-gray-900 mb-4">{booking.title}</h3>

                            {/* Driver Section */}
                            <div className="mb-3">
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

                                {/* Vehicle */}
                                <div className="flex items-center gap-3 mt-3 px-1 py-3 border-t border-gray-50 text-[14px]">
                                    <div className="w-14 h-10 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
                                        <i className="bi bi-car-front-fill text-lg text-gray-400"></i>
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-black rounded-full shrink-0"></div>
                                            <span className="font-[600] text-gray-900">{booking.vehicle.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs text-gray-400 font-[600] uppercase tracking-wider">License Plate:</span>
                                            <span className="text-xs font-[600] text-[#D10000] bg-red-50 px-2 py-0.5 rounded-lg border border-red-100">{booking.vehicle.vehNo}</span>
                                        </div>
                                    </div>
                                </div>
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
                                        <p className="text-xs text-gray-400 font-medium">{booking.passenger.rides} Rides ({booking.passenger.reviews} reviews)</p>
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
