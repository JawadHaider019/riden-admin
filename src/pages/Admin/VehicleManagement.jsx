import React, { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { Table, Badge, Button, SearchBar, Pagination, useToast } from '@/components/UI';
import { useNavigate } from 'react-router-dom';
import { getVehicles } from '@/api/vehicleApi';
import { STORAGE_URL, getImageUrl } from '@/api/api';

export default function VehicleManagement() {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [totalItems, setTotalItems] = useState(0);
    const { showToast } = useToast();
    const navigate = useNavigate();

    const fetchVehicles = async () => {
        try {
            setLoading(true);
            const params = {
                page: currentPage,
                // Commented out search to avoid the backend SQL error you were getting
                // search: searchTerm 
            };
            const res = await getVehicles(params);
            const paginationDetails = res.data || res;

            setVehicles(paginationDetails?.data || []);
            setTotalItems(paginationDetails?.total || 0);
        } catch (error) {
            console.error("Error fetching vehicles:", error);
            showToast(error.response?.data?.message || error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delay = setTimeout(() => {
            fetchVehicles();
        }, 400);
        return () => clearTimeout(delay);
    }, [currentPage, searchTerm]);

    return (
        <AdminLayout title="Vehicle Management">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <SearchBar
                    placeholder="Search disabled (Backend Fix Required)..."
                    className="w-full md:w-96 opacity-50 cursor-not-allowed"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    disabled
                />
                <div className="flex gap-4 w-full md:w-auto">
                    <Button variant="pill" className="flex-1 lg:flex-none" onClick={() => navigate('/vehicles/create')}>
                        <i className="bi bi-person-plus-fill"></i> Add Vehicle
                    </Button>
                </div>
            </div>

            <Table headers={['Car Image', 'Driver ID', 'Car Name', 'Model Year', 'License Plate', 'Category', 'No of Seats']}>
                {loading ? (
                    <tr>
                        <td colSpan="7" className="text-center py-10">
                            <div className="animate-spin w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full mx-auto"></div>
                        </td>
                    </tr>
                ) : vehicles.length === 0 ? (
                    <tr>
                        <td colSpan="7" className="text-center py-10 text-gray-500">
                            No vehicles found
                        </td>
                    </tr>
                ) : (
                    vehicles.map((v) => (
                        <tr
                            key={v.id}
                            onClick={() => navigate(`/vehicles/detail/${v.id}`)}
                            className="cursor-pointer hover:bg-black/[0.02] transition-colors border-b border-[#F3F4F6]"
                        >
                            <td className="py-[18px] px-[30px]">
                                <div className="w-16 h-12 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                                    {(v.front_image || v.back_image) ? (
                                        <img src={getImageUrl(v.front_image || v.back_image)} className="w-full h-full object-cover" alt={v.model} />
                                    ) : (
                                        <span className="text-[10px] font-bold text-gray-300 uppercase text-center">No Image</span>
                                    )}
                                </div>
                            </td>
                            <td className="py-[18px] px-[30px]">
                                <span className="text-[14px] font-[800] text-[#111] border-b-2 border-dashed border-gray-200 pb-0.5">
                                    {v.driver_id}
                                </span>
                            </td>
                            <td className="py-[18px] px-[30px] text-[15px] font-[800] text-[#111] lowercase">
                                {v.model}
                            </td>
                            <td className="py-[18px] px-[30px] text-[14px] font-[700] text-gray-400">
                                {v.year}
                            </td>
                            <td className="py-[18px] px-[30px] whitespace-nowrap">
                                <span className="bg-red-50 text-[#D10000] px-4 py-1.5 rounded-full text-[13px] font-[800] border border-red-50 italic">
                                    {v.license_plate}
                                </span>
                            </td>
                            <td className="py-[18px] px-[30px]">
                                <div className="px-5 py-2 bg-gray-50 border border-gray-100 rounded-lg text-[13px] font-[800] text-gray-600 inline-block">
                                    {v.vehicle_type} | {v.color}
                                </div>
                            </td>
                            <td className="py-[18px] px-[30px]">
                                <div className="flex items-center gap-2 text-[14px] font-[700] text-[#111]/80">
                                    <i className="bi bi-people-fill text-gray-400"></i>
                                    {v.no_of_seats || "N/A"}
                                </div>
                            </td>
                        </tr>
                    ))
                )}
            </Table>

            <div className="mt-8">
                <Pagination totalItems={totalItems} currentPage={currentPage} onPageChange={setCurrentPage} />
            </div>
        </AdminLayout>
    );
}
