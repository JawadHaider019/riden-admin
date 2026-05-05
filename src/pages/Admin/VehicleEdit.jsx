import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Label, InputWrapper, Input, Select, Button, useToast } from '@/components/UI';
import { getVehicleDetail, updateVehicle } from '@/api/vehicleApi';
import { getDrivers } from '@/api/driverApi';
import { getImageUrl } from '@/api/api';

export default function VehicleEdit() {
    const { id } = useParams();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [drivers, setDrivers] = useState([]);

    const [formData, setFormData] = useState({
        driver_id: '',
        model: '',
        license_plate: '',
        year: '',
        color: '',
        vehicle_type: 'Sedan',
        no_of_seats: '4',
    });

    const [images, setImages] = useState({
        front_image: null,
        back_image: null
    });

    const [previews, setPreviews] = useState({
        front_preview: null,
        back_preview: null
    });

    const frontInputRef = useRef(null);
    const backInputRef = useRef(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [vehicleRes, driversRes] = await Promise.all([
                    getVehicleDetail(id),
                    getDrivers()
                ]);

                const vehicleData = vehicleRes.data || vehicleRes;
                setFormData({
                    driver_id: vehicleData.driver_id || '',
                    model: vehicleData.model || '',
                    license_plate: vehicleData.license_plate || '',
                    year: vehicleData.year || '',
                    color: vehicleData.color || '',
                    vehicle_type: vehicleData.vehicle_type || 'Sedan',
                    no_of_seats: vehicleData.no_of_seats || '4',
                });

                if (vehicleData.front_image) setPreviews(prev => ({ ...prev, front_preview: getImageUrl(vehicleData.front_image) }));
                if (vehicleData.back_image) setPreviews(prev => ({ ...prev, back_preview: getImageUrl(vehicleData.back_image) }));

                const driversList = driversRes.data?.data || driversRes.data || [];
                setDrivers(driversList);
            } catch (error) {
                console.error("Failed to fetch data", error);
                showToast("Failed to load vehicle details", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e, type) => {
        const file = e.target.files[0];
        if (file) {
            setImages(prev => ({ ...prev, [type]: file }));
            setPreviews(prev => ({ ...prev, [`${type.split('_')[0]}_preview`]: URL.createObjectURL(file) }));
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();

        if (!formData.driver_id || !formData.model || !formData.license_plate) {
            showToast("Please fill in all required fields", "error");
            return;
        }

        try {
            setUpdating(true);
            const data = new FormData();

            // Appending all fields
            Object.keys(formData).forEach(key => {
                data.append(key, formData[key]);

                // Dual-send for backend inconsistencies
                if (key === 'model') data.append('vehicle_name', formData[key]);
                if (key === 'license_plate') data.append('plate_number', formData[key]);
                if (key === 'vehicle_type') data.append('type', formData[key]);
                if (key === 'no_of_seats') data.append('seat_count', formData[key]);
            });

            // Laravel PATCH files workaround
            data.append('_method', 'PATCH');

            if (images.front_image) data.append('front_image', images.front_image);
            if (images.back_image) data.append('back_image', images.back_image);

            await updateVehicle(id, data);
            showToast("Vehicle updated successfully", "success");
            navigate(`/vehicles/detail/${id}`);
        } catch (error) {
            const errorMsg = error.response?.data?.errors
                ? Object.values(error.response.data.errors).flat().join(", ")
                : error.response?.data?.message || "Failed to update vehicle";
            showToast(errorMsg, "error");
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <AdminLayout title="Vehicle Management">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full"></div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="Vehicle Management">
            <div className="mx-auto mb-4">
                <form onSubmit={handleSave} className="bg-white p-8 rounded-[30px] shadow-sm border border-[#E5E7EB]">
                    {/* Header */}
                    <div className="mb-4 flex items-center gap-2 pb-6">
                        <Link to={`/vehicles/detail/${id}`} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors">
                            <i className="bi bi-chevron-left text-sm"></i>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 leading-tight">Edit Vehicle</h1>
                            <p className="text-sm text-gray-500 font-medium">Update the specifications for {formData.model}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-[3px] h-5 bg-[#D10000] rounded-full"></div>
                                <h2 className="text-[17px] font-black text-gray-900 uppercase">Vehicle Identification</h2>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <Label className="text-[14px] font-[700] text-[#4B5563] mb-2 normal-case tracking-normal">Assign Driver *</Label>
                                    <InputWrapper className="bg-white">
                                        <Select
                                            name="driver_id"
                                            value={formData.driver_id}
                                            onChange={handleChange}
                                            required
                                        >
                                            <option value="">Select a Driver</option>
                                            {drivers.map(driver => (
                                                <option key={driver.id} value={driver.id}>
                                                    {driver.first_name} {driver.last_name}
                                                </option>
                                            ))}
                                        </Select>
                                        <i className="bi bi-chevron-down text-gray-300"></i>
                                    </InputWrapper>
                                </div>

                                <div>
                                    <Label className="text-[14px] font-[700] text-[#4B5563] mb-2 normal-case tracking-normal">Car Model Name *</Label>
                                    <InputWrapper className="bg-white">
                                        <Input
                                            name="model"
                                            value={formData.model}
                                            onChange={handleChange}
                                            placeholder="e.g. Toyota Corolla"
                                            required
                                        />
                                    </InputWrapper>
                                </div>

                                <div>
                                    <Label className="text-[14px] font-[700] text-[#4B5563] mb-2 normal-case tracking-normal">License Plate *</Label>
                                    <InputWrapper className="bg-white">
                                        <Input
                                            name="license_plate"
                                            value={formData.license_plate}
                                            onChange={handleChange}
                                            placeholder="e.g. ABC-123"
                                            required
                                        />
                                    </InputWrapper>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-[3px] h-5 bg-[#D10000] rounded-full"></div>
                                <h2 className="text-[17px] font-black text-gray-900 uppercase">Vehicle Specifications</h2>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-[14px] font-[700] text-[#4B5563] mb-2 normal-case tracking-normal">Year</Label>
                                        <InputWrapper className="bg-white">
                                            <Input
                                                name="year"
                                                value={formData.year}
                                                onChange={handleChange}
                                                placeholder="2024"
                                            />
                                        </InputWrapper>
                                    </div>
                                    <div>
                                        <Label className="text-[14px] font-[700] text-[#4B5563] mb-2 normal-case tracking-normal">Color</Label>
                                        <InputWrapper className="bg-white">
                                            <Input
                                                name="color"
                                                value={formData.color}
                                                onChange={handleChange}
                                                placeholder="White"
                                            />
                                        </InputWrapper>
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-[14px] font-[700] text-[#4B5563] mb-2 normal-case tracking-normal">Category</Label>
                                    <InputWrapper className="bg-white">
                                        <Select
                                            name="vehicle_type"
                                            value={formData.vehicle_type}
                                            onChange={handleChange}
                                        >
                                            <option>Sedan</option>
                                            <option>Premium</option>
                                            <option>SUV</option>
                                            <option>Mini</option>
                                        </Select>
                                        <i className="bi bi-chevron-down text-gray-300"></i>
                                    </InputWrapper>
                                </div>

                                <div>
                                    <Label className="text-[14px] font-[700] text-[#4B5563] mb-2 normal-case tracking-normal">Number of Seats</Label>
                                    <InputWrapper className="bg-white">
                                        <Input
                                            name="no_of_seats"
                                            value={formData.no_of_seats}
                                            onChange={handleChange}
                                            placeholder="4"
                                        />
                                    </InputWrapper>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 border-t border-gray-100 pt-8">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-[3px] h-5 bg-[#D10000] rounded-full"></div>
                            <h2 className="text-[17px] font-black text-gray-900 uppercase">Vehicle Media</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <Label className="text-[14px] font-[700] text-gray-400 mb-2 normal-case tracking-normal">Front View Image</Label>
                                <div
                                    className="relative border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center bg-gray-50/30 mb-3 cursor-pointer hover:bg-gray-100 transition-all h-[120px]"
                                    onClick={() => frontInputRef.current.click()}
                                >
                                    {previews.front_preview ? (
                                        <img src={previews.front_preview} className="h-full object-contain" alt="Front Preview" />
                                    ) : (
                                        <i className="bi bi-camera text-2xl text-gray-300"></i>
                                    )}
                                    <input
                                        type="file"
                                        ref={frontInputRef}
                                        className="hidden"
                                        onChange={(e) => handleImageChange(e, 'front_image')}
                                        accept="image/*"
                                    />
                                </div>
                                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden h-11">
                                    <button
                                        type="button"
                                        onClick={() => frontInputRef.current.click()}
                                        className="h-full px-4 bg-gray-100 text-[13px] font-bold text-gray-600 border-r border-gray-200 hover:bg-gray-200 transition-colors uppercase"
                                    >
                                        Change file
                                    </button>
                                    <span className="px-4 text-[13px] text-gray-400 font-medium truncate">
                                        {images.front_image ? images.front_image.name : 'Using current image'}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <Label className="text-[14px] font-[700] text-gray-400 mb-2 normal-case tracking-normal">Back View Image</Label>
                                <div
                                    className="relative border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center bg-gray-50/30 mb-3 cursor-pointer hover:bg-gray-100 transition-all h-[120px]"
                                    onClick={() => backInputRef.current.click()}
                                >
                                    {previews.back_preview ? (
                                        <img src={previews.back_preview} className="h-full object-contain" alt="Back Preview" />
                                    ) : (
                                        <i className="bi bi-camera text-2xl text-gray-300"></i>
                                    )}
                                    <input
                                        type="file"
                                        ref={backInputRef}
                                        className="hidden"
                                        onChange={(e) => handleImageChange(e, 'back_image')}
                                        accept="image/*"
                                    />
                                </div>
                                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden h-11">
                                    <button
                                        type="button"
                                        onClick={() => backInputRef.current.click()}
                                        className="h-full px-4 bg-gray-100 text-[13px] font-bold text-gray-600 border-r border-gray-200 hover:bg-gray-200 transition-colors uppercase"
                                    >
                                        Change file
                                    </button>
                                    <span className="px-4 text-[13px] text-gray-400 font-medium truncate">
                                        {images.back_image ? images.back_image.name : 'Using current image'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-50">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate(`/vehicles/detail/${id}`)}
                            className="px-12 py-3"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={updating}
                            variant="pill"
                            className="px-12 py-3 flex items-center gap-2"
                        >
                            {updating ? (
                                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                            ) : (
                                <i className="bi bi-check-circle"></i>
                            )}
                            {updating ? 'Updating...' : 'Update Vehicle'}
                        </Button>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
