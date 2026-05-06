import React, { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { Link, useNavigate } from 'react-router-dom';
import { Label, InputWrapper, Input, Select, Button, useToast } from '@/components/UI';
import { createBooking } from '@/api/bookingApi';
import { getDrivers } from '@/api/driverApi';
import { getPassengers } from '@/api/passengerApi';
import { getVehicles } from '@/api/vehicleApi';

// Defined at module scope so React sees a stable component reference across renders
const Field = ({ label, name, errors, required, children }) => (
    <div>
        <Label className="text-[14px] font-[600] text-[#4B5563] mb-2 normal-case tracking-normal">
            {label}{required && ' *'}
        </Label>
        {children}
        {errors?.[name] && <span className="text-xs text-red-500 mt-1 block">{errors[name]}</span>}
    </div>
);

export default function BookingCreate() {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [drivers, setDrivers] = useState([]);
    const [passengers, setPassengers] = useState([]);
    const [vehicles, setVehicles] = useState([]);

    const [formData, setFormData] = useState({
        passenger_id: '',
        driver_id: '',
        vehicle_id: '',
        pickup_location: '',
        pickup_lat: '',
        pickup_lng: '',
        dropoff_location: '',
        dropoff_lat: '',
        dropoff_lng: '',
        fare: '',
        estimated_distance: '',
        estimated_time: '',
        status: 'requested',
        pickup_time: '',
        payment_method: '',
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [driversRes, passengersRes, vehiclesRes] = await Promise.all([
                    getDrivers(),
                    getPassengers(),
                    getVehicles(),
                ]);
                setDrivers(driversRes?.data?.data || driversRes?.data || []);
                setPassengers(passengersRes?.data?.data || passengersRes?.data || []);
                setVehicles(vehiclesRes?.data?.data || vehiclesRes?.data || []);
            } catch (err) {
                showToast('Failed to load form data', 'error');
            }
        };
        fetchAll();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.passenger_id) newErrors.passenger_id = 'Please select a passenger';
        if (!formData.driver_id) newErrors.driver_id = 'Please select a driver';
        if (!formData.pickup_location) newErrors.pickup_location = 'Pickup location is required';
        if (!formData.dropoff_location) newErrors.dropoff_location = 'Dropoff location is required';
        if (!formData.pickup_time) newErrors.pickup_time = 'Pickup time is required';
        if (!formData.fare) newErrors.fare = 'Fare is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            setLoading(true);
            const payload = {
                passenger_id: formData.passenger_id,
                driver_id: formData.driver_id,
                vehicle_id: formData.vehicle_id || undefined,
                pickup_location: formData.pickup_location,
                pickup_lat: formData.pickup_lat || undefined,
                pickup_lng: formData.pickup_lng || undefined,
                dropoff_location: formData.dropoff_location,
                dropoff_lat: formData.dropoff_lat || undefined,
                dropoff_lng: formData.dropoff_lng || undefined,
                fare: formData.fare,
                estimated_distance: formData.estimated_distance || undefined,
                estimated_time: formData.estimated_time || undefined,
                status: formData.status,
                pickup_time: formData.pickup_time,
                payment_method: formData.payment_method,
            };
            await createBooking(payload);
            showToast('Booking has been created successfully', 'success');
            navigate('/bookings');
        } catch (error) {
            console.error('Booking creation error:', error.response?.status, error.response?.data);
            const serverErrors = error.response?.data?.errors;
            if (serverErrors) {
                // Show field-level errors if backend returns them
                const mapped = {};
                Object.entries(serverErrors).forEach(([key, msgs]) => { mapped[key] = Array.isArray(msgs) ? msgs[0] : msgs; });
                setErrors(mapped);
            }
            const errorMsg = serverErrors
                ? Object.values(serverErrors).flat().join(', ')
                : error.response?.data?.message || `Failed to create booking (${error.response?.status || 'no response'})`;
            showToast(errorMsg, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminLayout title="Booking Management">
            <div className="mx-auto mb-4">
                <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[30px] shadow-sm border border-[#E5E7EB]">

                    {/* Header */}
                    <div className="mb-6 flex items-center gap-2 pb-6">
                        <Link to="/bookings" className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors">
                            <i className="bi bi-chevron-left text-sm"></i>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-[600] text-gray-900 leading-tight">Add New Booking</h1>
                            <p className="text-sm text-gray-500 font-medium">Fill in the details to create a manual booking</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

                        {/* Left — User Assignment */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-[3px] h-5 bg-[#D10000] rounded-full"></div>
                                <h2 className="text-[17px] font-[600] text-gray-900 uppercase">User Assignment</h2>
                            </div>
                            <div className="space-y-4">

                                <Field label="Passenger" name="passenger_id" errors={errors} required>
                                    <InputWrapper className={`bg-white ${errors.passenger_id ? 'border-red-400' : ''}`}>
                                        <Select name="passenger_id" value={formData.passenger_id} onChange={handleChange}>
                                            <option value="">Select a passenger...</option>
                                            {passengers.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.first_name} {p.last_name}
                                                </option>
                                            ))}
                                        </Select>
                                        <i className="bi bi-chevron-down text-gray-300"></i>
                                    </InputWrapper>
                                </Field>

                                <Field label="Driver" name="driver_id" errors={errors} required>
                                    <InputWrapper className={`bg-white ${errors.driver_id ? 'border-red-400' : ''}`}>
                                        <Select name="driver_id" value={formData.driver_id} onChange={handleChange}>
                                            <option value="">Select a driver...</option>
                                            {drivers.map(d => (
                                                <option key={d.id} value={d.id}>
                                                    {d.first_name} {d.last_name}
                                                </option>
                                            ))}
                                        </Select>
                                        <i className="bi bi-chevron-down text-gray-300"></i>
                                    </InputWrapper>
                                </Field>

                                <Field label="Vehicle (Optional)" name="vehicle_id" errors={errors}>
                                    <InputWrapper className="bg-white">
                                        <Select name="vehicle_id" value={formData.vehicle_id} onChange={handleChange}>
                                            <option value="">Select a vehicle...</option>
                                            {vehicles.map(v => (
                                                <option key={v.id} value={v.id}>
                                                    {v.model} — {v.license_plate}
                                                </option>
                                            ))}
                                        </Select>
                                        <i className="bi bi-chevron-down text-gray-300"></i>
                                    </InputWrapper>
                                </Field>

                                <Field label="Payment Method" name="payment_method" errors={errors}>
                                    <InputWrapper className="bg-white">
                                        <Select name="payment_method" value={formData.payment_method} onChange={handleChange}>
                                            <option value="">Select payment method...</option>
                                            <option value="cash">Cash</option>
                                            <option value="card">Card</option>
                                            <option value="wallet">Wallet</option>
                                        </Select>
                                        <i className="bi bi-chevron-down text-gray-300"></i>
                                    </InputWrapper>
                                </Field>

                            </div>
                        </div>

                        {/* Right — Trip Details */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-[3px] h-5 bg-[#D10000] rounded-full"></div>
                                <h2 className="text-[17px] font-[600] text-gray-900 uppercase">Trip Details</h2>
                            </div>
                            <div className="space-y-4">

                                <Field label="Pickup Location" name="pickup_location" errors={errors} required>
                                    <InputWrapper className={`bg-white ${errors.pickup_location ? 'border-red-400' : ''}`}>
                                        <Input
                                            name="pickup_location"
                                            value={formData.pickup_location}
                                            onChange={handleChange}
                                            placeholder="e.g. 123 Main St, Lahore"
                                        />
                                    </InputWrapper>
                                </Field>

                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Pickup Lat" name="pickup_lat" errors={errors}>
                                        <InputWrapper className="bg-white">
                                            <Input name="pickup_lat" value={formData.pickup_lat} onChange={handleChange} placeholder="31.5204" />
                                        </InputWrapper>
                                    </Field>
                                    <Field label="Pickup Lng" name="pickup_lng" errors={errors}>
                                        <InputWrapper className="bg-white">
                                            <Input name="pickup_lng" value={formData.pickup_lng} onChange={handleChange} placeholder="74.3587" />
                                        </InputWrapper>
                                    </Field>
                                </div>

                                <Field label="Dropoff Location" name="dropoff_location" errors={errors} required>
                                    <InputWrapper className={`bg-white ${errors.dropoff_location ? 'border-red-400' : ''}`}>
                                        <Input
                                            name="dropoff_location"
                                            value={formData.dropoff_location}
                                            onChange={handleChange}
                                            placeholder="e.g. 456 Mall Road, Lahore"
                                        />
                                    </InputWrapper>
                                </Field>

                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Dropoff Lat" name="dropoff_lat" errors={errors}>
                                        <InputWrapper className="bg-white">
                                            <Input name="dropoff_lat" value={formData.dropoff_lat} onChange={handleChange} placeholder="31.5204" />
                                        </InputWrapper>
                                    </Field>
                                    <Field label="Dropoff Lng" name="dropoff_lng" errors={errors}>
                                        <InputWrapper className="bg-white">
                                            <Input name="dropoff_lng" value={formData.dropoff_lng} onChange={handleChange} placeholder="74.3587" />
                                        </InputWrapper>
                                    </Field>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Pickup Time" name="pickup_time" errors={errors} required>
                                        <InputWrapper className={`bg-white ${errors.pickup_time ? 'border-red-400' : ''}`}>
                                            <Input
                                                type="datetime-local"
                                                name="pickup_time"
                                                value={formData.pickup_time}
                                                onChange={handleChange}
                                            />
                                        </InputWrapper>
                                    </Field>


                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <Field label="Fare (Rs)" name="fare" errors={errors} required>
                                        <InputWrapper className={`bg-white ${errors.fare ? 'border-red-400' : ''}`}>
                                            <Input
                                                type="number"
                                                name="fare"
                                                value={formData.fare}
                                                onChange={handleChange}
                                                placeholder="0.00"
                                            />
                                        </InputWrapper>
                                    </Field>

                                    <Field label="Distance (km)" name="estimated_distance" errors={errors}>
                                        <InputWrapper className="bg-white">
                                            <Input
                                                name="estimated_distance"
                                                value={formData.estimated_distance}
                                                onChange={handleChange}
                                                placeholder="5.2"
                                            />
                                        </InputWrapper>
                                    </Field>

                                    <Field label="Duration (min)" name="estimated_time" errors={errors}>
                                        <InputWrapper className="bg-white">
                                            <Input
                                                name="estimated_time"
                                                value={formData.estimated_time}
                                                onChange={handleChange}
                                                placeholder="15"
                                            />
                                        </InputWrapper>
                                    </Field>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end pt-4 border-t border-gray-100">
                        <Button
                            type="submit"
                            disabled={loading}
                            variant="pill"
                            className="px-12 py-3 flex items-center gap-2"
                        >
                            {loading ? (
                                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                            ) : (
                                <i className="bi bi-check-circle"></i>
                            )}
                            {loading ? 'Creating...' : 'Create Booking'}
                        </Button>
                    </div>

                </form>
            </div>
        </AdminLayout>
    );
}
