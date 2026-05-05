import React, { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge, useToast } from '@/components/UI';
import { getVehicleDetail, deleteVehicle } from '@/api/vehicleApi';
import { STORAGE_URL, getImageUrl } from '@/api/api';

export default function VehicleDetail() {
    const { showToast } = useToast();
    const { id } = useParams();
    const navigate = useNavigate();
    const [modalType, setModalType] = useState(null);
    const [vehicle, setVehicle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                setLoading(true);
                const res = await getVehicleDetail(id);
                setVehicle(res.data || res);
            } catch (error) {
                showToast(error.response?.data?.message || 'Failed to fetch vehicle details', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [id]);

    if (loading) {
        return (
            <AdminLayout title="Vehicle Management">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full"></div>
                </div>
            </AdminLayout>
        );
    }

    if (!vehicle) return null;

    const images = [];
    if (vehicle.front_image) images.push(getImageUrl(vehicle.front_image));
    if (vehicle.back_image) images.push(getImageUrl(vehicle.back_image));
    if (images.length === 0) images.push(null); // Placeholder fallback

    const handleDelete = async () => {
        try {
            await deleteVehicle(id);
            showToast(`Vehicle ${vehicle.model} has been removed successfully`, "delete");
            setModalType(null);
            navigate('/vehicles');
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to delete vehicle', 'error');
        }
    };

    const nextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = () => {
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    return (
        <AdminLayout title="Vehicle Management">
            {/* Back + Header */}
            <div className="flex flex-col gap-3 mb-6">
                <div className="flex justify-between items-center gap-3">
                    <div className="flex items-center gap-3">
                        <Link to="/vehicles" className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors bg-white">
                            <i className="bi bi-chevron-left text-sm"></i>
                        </Link>
                        <h2 className="text-xl font-black text-gray-900">Vehicle Detail</h2>
                    </div>
                    <Badge variant={vehicle.status === 'blocked' ? 'danger' : 'success'}>
                        {vehicle.status === 'blocked' ? 'Blocked' : 'Active'}
                    </Badge>
                </div>
                <div className="flex items-center justify-between">
                    <span className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-black text-gray-900 shadow-sm">
                        Vehicle ID : {vehicle.id}
                    </span>
                    <span className="text-sm font-bold text-gray-500">Registered {new Date(vehicle.created_at).toLocaleDateString()}</span>
                </div>
            </div>

            {/* Main 2-col layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">

                {/* LEFT — Image & Records */}
                <div className="flex flex-col gap-4">
                    {/* Vehicle Identity Image Gallery */}
                    <div className="group relative rounded-[22px] overflow-hidden h-[420px] border border-gray-100 shadow-sm bg-gray-50">
                        {images[currentImageIndex] ? (
                            <img
                                src={images[currentImageIndex]}
                                className="w-full h-full object-cover transition-transform duration-500"
                                alt="Vehicle View"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                                <i className="bi bi-image text-6xl mb-2"></i>
                                <span className="font-bold uppercase tracking-widest text-xs">No Image Available</span>
                            </div>
                        )}

                        {/* Navigation Arrows */}
                        {images.length > 1 && (
                            <div className="absolute inset-0 flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={prevImage}
                                    className="w-10 h-10 rounded-full bg-white/90 backdrop-blur shadow-lg flex items-center justify-center text-gray-900 hover:bg-[#D10000] hover:text-white transition-all transform hover:scale-110"
                                >
                                    <i className="bi bi-chevron-left"></i>
                                </button>
                                <button
                                    onClick={nextImage}
                                    className="w-10 h-10 rounded-full bg-white/90 backdrop-blur shadow-lg flex items-center justify-center text-gray-900 hover:bg-[#D10000] hover:text-white transition-all transform hover:scale-110"
                                >
                                    <i className="bi bi-chevron-right"></i>
                                </button>
                            </div>
                        )}

                        {/* Pagination Dots */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                            {images.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentImageIndex ? 'w-6 bg-[#D10000]' : 'w-1.5 bg-white/60'}`}
                                ></div>
                            ))}
                        </div>

                        <div className="absolute top-4 right-4 flex flex-col gap-2 scale-90 origin-top-right">
                            <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm min-w-[100px]">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block leading-tight">License Plate</span>
                                <span className="text-sm font-black text-[#D10000] uppercase italic tracking-tighter">{vehicle.license_plate}</span>
                            </div>
                        </div>
                    </div>

                    {/* Operational Status */}
                    <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden">
                        <div className="bg-[#D10000] px-5 py-3 flex items-center gap-2">
                            <i className="bi bi-shield-check text-white text-sm"></i>
                            <h5 className="text-white font-bold text-sm uppercase italic tracking-wider">Operational Status</h5>
                        </div>
                        <div className="p-5">
                            <p className="text-sm text-gray-600 font-medium leading-relaxed italic">Vehicle is currently in service and performing at peak efficiency.</p>
                        </div>
                    </div>

                    {/* Actions Area */}
                    <div className="flex items-center gap-3 mt-4">
                        <Link to={`/vehicles/edit/${vehicle.id}`} className="flex-1">
                            <button className="w-full py-3.5 rounded-full bg-[#D10000] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#b00000] transition-colors shadow-sm shadow-red-100">
                                <i className="bi bi-pencil-square"></i> Edit Details
                            </button>
                        </Link>

                        <button onClick={() => setModalType('delete')} className="flex-1 py-3.5 rounded-full bg-white border border-gray-200 text-gray-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 hover:text-red-600 transition-all shadow-sm">
                            <i className="bi bi-trash-fill"></i> Delete
                        </button>
                    </div>
                </div>

                {/* RIGHT — Vehicle Records */}
                <div className="flex flex-col gap-4">
                    <div className="bg-white rounded-[22px] border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 pt-5 pb-6">
                            <div className="mb-4">
                                <p className="text-[11px] text-gray-400 font-black uppercase tracking-widest mb-2">Vehicle Identity</p>
                                <h3 className="text-xl font-black text-gray-900 lowercase">{vehicle.model}</h3>
                            </div>

                            {/* Driver Assignment Section */}
                            {vehicle.driver && (
                                <div className="mb-4">
                                    <div className="bg-[#D10000] rounded-xl px-4 py-2 mb-3">
                                        <span className="text-white font-bold text-xs uppercase tracking-wider">Assigned Driver</span>
                                    </div>
                                    <div className="flex items-center justify-between px-1">
                                        <div className="flex items-center gap-3">
                                            <img src={vehicle.driver.avatar || `https://i.pravatar.cc/100?u=${vehicle.driver_id}`} className="w-12 h-12 rounded-[14px] object-cover" alt="Driver" />
                                            <div>
                                                <p className="text-sm font-black text-gray-900">{vehicle.driver.name || 'Unknown Driver'}</p>
                                                <p className="text-xs text-gray-400 font-medium">{vehicle.driver.total_rides || 0} Completed Rides</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-[#D10000] hover:bg-red-50 transition-colors" onClick={() => window.location.href = `tel:${vehicle.driver.phone}`}>
                                                <i className="bi bi-telephone-fill text-sm"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Identity Table */}
                            <div className="mb-4">
                                <div className="bg-[#D10000] rounded-xl px-4 py-2 mb-3">
                                    <span className="text-white font-bold text-xs uppercase tracking-wider italic">Vehicle Specs</span>
                                </div>
                                <div className="space-y-4 px-1">
                                    <div className="flex items-center justify-between border-b border-gray-50 pb-3 h-10">
                                        <div className="flex items-center gap-2">
                                            <i className="bi bi-calendar-event text-gray-400"></i>
                                            <span className="text-sm font-bold text-gray-500">Manufacturing Year</span>
                                        </div>
                                        <span className="text-sm font-black text-gray-900">{vehicle.year}</span>
                                    </div>
                                    <div className="flex items-center justify-between border-b border-gray-50 pb-3 h-10">
                                        <div className="flex items-center gap-2">
                                            <i className="bi bi-palette text-gray-400"></i>
                                            <span className="text-sm font-bold text-gray-500">Paint Color</span>
                                        </div>
                                        <span className="text-sm font-black text-gray-900">{vehicle.color}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Performance Section */}
                            <div className="mb-4">
                                <div className="bg-[#D10000] rounded-xl px-4 py-2 mb-3">
                                    <span className="text-white font-bold text-xs uppercase tracking-wider italic">Fleet Configuration</span>
                                </div>
                                <div className="relative pl-6 mb-3">
                                    <div className="absolute left-[3px] top-[14px] bottom-[14px] border-l-2 border-dashed border-gray-200"></div>
                                    <div className="relative mb-5 min-h-[44px]">
                                        <div className="absolute -left-[27px] top-[5px] w-[10px] h-[10px] bg-black rounded-full"></div>
                                        <div className="flex flex-col">
                                            <p className="text-sm font-black text-gray-900">{vehicle.vehicle_type} Category</p>
                                            <p className="text-[11px] text-gray-400 font-medium">Standard fleet classification.</p>
                                        </div>
                                    </div>
                                    <div className="relative min-h-[44px]">
                                        <div className="absolute -left-[30px] top-[3px] text-[#D10000]">
                                            <i className="bi bi-people-fill text-base"></i>
                                        </div>
                                        <div className="flex flex-col">
                                            <p className="text-sm font-black text-gray-900">{vehicle.no_of_seats || 'N/A'} Seats Capacity</p>
                                            <p className="text-[11px] text-gray-400 font-medium">Optimized for group mobility.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Metrics */}
                                <div className="flex justify-around border-t border-gray-50 pt-6 mt-4">
                                    <div className="text-center">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Status</p>
                                        <p className="text-sm font-black text-gray-900 uppercase">{vehicle.status || 'Active'}</p>
                                    </div>
                                    <div className="w-px bg-gray-100 h-8 mt-1"></div>
                                    <div className="text-center">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Color</p>
                                        <p className="text-sm font-black text-gray-900">{vehicle.color}</p>
                                    </div>
                                    <div className="w-px bg-gray-100 h-8 mt-1"></div>
                                    <div className="text-center">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Type</p>
                                        <p className="text-sm font-black text-[#D10000]">{vehicle.vehicle_type}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals Overlay */}
            {['block', 'unblock', 'delete'].includes(modalType) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                    <div className="bg-white rounded-[32px] p-8 w-[90%] max-w-sm flex flex-col items-center text-center shadow-2xl">
                        <div className="mb-4">
                            <i className={`text-[40px] text-[#EE1B24] ${modalType === 'delete' ? 'bi bi-trash-fill' : 'bi bi-slash-circle font-bold'}`}></i>
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 mb-3">
                            {modalType === 'block' ? 'Block Vehicle' : modalType === 'unblock' ? 'Unblock Vehicle' : 'Delete Vehicle'}
                        </h3>

                        <p className="text-xs font-semibold text-gray-600 mb-8 max-w-[250px] mx-auto leading-relaxed">
                            {modalType === 'delete' ? (
                                <>Are you sure to Delete the <span className="text-[#EE1B24]">{vehicle.model}</span> ({vehicle.license_plate}). This action can't be undone.</>
                            ) : (
                                <>Are you sure to {modalType} the <span className="text-[#EE1B24]">{vehicle.model}</span> Vehicle identity?</>
                            )}
                        </p>

                        <div className="flex items-center gap-3 w-full">
                            <button className="flex-1 py-3 bg-[#EE1B24] text-white rounded-[12px] font-bold text-sm hover:bg-[#d01019] transition-colors" onClick={() => {
                                if (modalType === 'delete') handleDelete();
                                setModalType(null);
                            }}>
                                Confirm
                            </button>
                            <button className="flex-1 py-3 bg-white text-gray-900 border border-gray-900 rounded-[12px] font-bold text-sm hover:bg-gray-50 transition-colors" onClick={() => setModalType(null)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
