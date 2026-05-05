import React, { useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { Link, useNavigate } from 'react-router-dom';
import { Label, InputWrapper, Input, Button, useToast } from '@/components/UI';
import { createAdmin } from '../../api/adminApi';

export default function AdminCreate() {
    const navigate = useNavigate();
    const { showToast } = useToast(); // ✅ Add toast hook
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState({});

    const modules = [
        'Dashboard & Analytics', 'User Management', 'Driver Management',
        'Vehicles Management', 'Booking Management', 'Reviews & Ratings',
        'Promo code Management', 'Fare Management', 'Commission Management',
        'Payment Management', 'Report Management', 'Passenger Management',
        'Advertising Management', 'Support Ticket', 'Notifications',
        'CMS management', 'Settings'
    ];

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        country_code: '+1',
        modules: [],
        is_super: false,
        password: '',
        password_confirmation: ''
    });

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' && name === 'is_super' ? checked : value
        }));
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleModuleToggle = (module) => {
        setFormData(prev => ({
            ...prev,
            modules: prev.modules.includes(module)
                ? prev.modules.filter(m => m !== module)
                : [...prev.modules, module]
        }));
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Email is invalid';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        if (formData.password !== formData.password_confirmation) {
            newErrors.password_confirmation = 'Passwords do not match';
        }

        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // ✅ Show validation errors with toast
        const newErrors = validateForm();
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            // Show first validation error as toast
            const firstError = Object.values(newErrors)[0];
            showToast(firstError, "error");
            return;
        }

        setLoading(true);
        try {
            const submitData = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone ? `${formData.country_code}${formData.phone}` : null,
                modules: formData.is_super ? modules : formData.modules,
                is_super: formData.is_super,
                password: formData.password,
                password_confirmation: formData.password_confirmation
            };

            const response = await createAdmin(submitData);

            if (response.status === 'success') {
                // ✅ Show success toast
                showToast(response.message || 'Admin created successfully!', "success");

                // Navigate back to admin roles list after 1 second
                setTimeout(() => {
                    navigate('/users');
                }, 1000);
            }
        } catch (error) {
            console.error('Error creating admin:', error);

            // ✅ Extract and show error message from backend
            let errorMessage = "Failed to create admin. Please try again.";

            if (error.response?.data?.errors) {
                // Handle validation errors from backend
                const backendErrors = error.response.data.errors;
                setErrors(backendErrors);

                // Show first backend error as toast
                const firstBackendError = Object.values(backendErrors)[0];
                errorMessage = Array.isArray(firstBackendError) ? firstBackendError[0] : firstBackendError;
                showToast(errorMessage, "error");

            } else if (error.response?.data?.message) {
                // Handle single error message from backend
                errorMessage = error.response.data.message;
                showToast(errorMessage, "error");

                // If it's a validation error from backend, you might want to set it
                if (error.response.data.errors) {
                    setErrors(error.response.data.errors);
                }
            } else if (error.message === "Network Error") {
                errorMessage = "Network error. Please check your connection.";
                showToast(errorMessage, "error");
            } else {
                showToast(errorMessage, "error");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminLayout title="User Management">
            <div className="mx-auto">
                <div className="riden-addadmin-head flex items-center gap-4 mb-4">
                    <Link to="/users" className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors">
                        <i className="bi bi-chevron-left text-sm"></i>
                    </Link>
                    <h2 className="text-xl font-[600] text-gray-900 tracking-tight">Add New Admin</h2>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="bg-white rounded-[30px] shadow-sm border border-[#E5E7EB] p-6">
                        {/* Admin Details Section */}
                        <div className="bg-[#d10000] rounded-full p-4 text-[14px] font-[600] text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                            Admin Details
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4">
                            <div>
                                <Label>Name <span className="text-red-500">*</span></Label>
                                <InputWrapper icon="bi bi-person">
                                    <Input
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="Enter Admin Name"
                                    />
                                </InputWrapper>
                                {errors.name && (
                                    <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                                )}
                            </div>

                            <div>
                                <Label>Email <span className="text-red-500">*</span></Label>
                                <InputWrapper icon="bi bi-envelope">
                                    <Input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="Enter email address"
                                    />
                                </InputWrapper>
                                {errors.email && (
                                    <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                                )}
                            </div>

                            <div>
                                <Label>Phone Number</Label>
                                <InputWrapper className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 py-1">
                                        <img src="https://flagcdn.com/w40/ca.png" alt="CA" className="w-5" />
                                        <span className="text-[14px] font-[600] text-gray-900">+1</span>
                                    </div>
                                    <div className="flex-grow">
                                        <Input
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            placeholder="000 000 0000"
                                        />
                                    </div>
                                </InputWrapper>
                            </div>

                            <div className="px-4 mt-4">
                                <label className="flex items-center gap-3 cursor-pointer group p-3 bg-gray-50 rounded-lg">
                                    <div className="relative flex items-center">
                                        <input
                                            type="checkbox"
                                            name="is_super"
                                            checked={formData.is_super}
                                            onChange={handleInputChange}
                                            className="peer w-5 h-5 border-2 border-gray-300 rounded-md checked:bg-[#D10000] checked:border-[#D10000] appearance-none transition-all cursor-pointer"
                                        />
                                        <i className="bi bi-check absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-xs opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"></i>
                                    </div>
                                    <div>
                                        <span className="text-[14px] font-semibold text-gray-700">Super Admin</span>
                                        <p className="text-xs text-gray-500 mt-0.5">Has access to all modules and permissions</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Access Module Section - Only show if NOT super admin */}
                        {!formData.is_super && (
                            <>
                                <div className="bg-[#d10000] mt-4 rounded-full p-4 text-[14px] font-[600] text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                    Access Module
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-5 gap-x-4 px-4">
                                    {modules.map((module, i) => (
                                        <label key={i} className="flex items-center gap-3 cursor-pointer group">
                                            <div className="relative flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.modules.includes(module)}
                                                    onChange={() => handleModuleToggle(module)}
                                                    className="peer w-5 h-5 border-2 border-gray-200 rounded-md checked:bg-[#D10000] checked:border-[#D10000] appearance-none transition-all cursor-pointer"
                                                />
                                                <i className="bi bi-check absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-xs opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"></i>
                                            </div>
                                            <span className="text-[14px] font-semibold text-gray-600 group-hover:text-gray-900 transition-colors uppercase tracking-tight">
                                                {module}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                                {formData.modules.length === 0 && (
                                    <p className="text-yellow-600 text-xs mt-2 px-4">
                                        <i className="bi bi-info-circle mr-1"></i>
                                        No modules selected. This admin won't have access to any features.
                                    </p>
                                )}
                            </>
                        )}

                        {/* Password Section */}
                        <div className="bg-[#d10000] mt-4 rounded-full p-4 text-[14px] font-[600] text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                            Make Password
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4">
                            <div>
                                <Label>Password <span className="text-red-500">*</span></Label>
                                <InputWrapper icon="bi bi-lock">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        placeholder="Make Password"
                                    />
                                    <i
                                        onClick={() => setShowPassword(!showPassword)}
                                        className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'} absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer hover:text-gray-600`}
                                    ></i>
                                </InputWrapper>
                                {errors.password && (
                                    <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                                )}
                            </div>
                            <div>
                                <Label>Confirm Password <span className="text-red-500">*</span></Label>
                                <InputWrapper icon="bi bi-shield-lock">
                                    <Input
                                        type={showConfirmPassword ? "text" : "password"}
                                        name="password_confirmation"
                                        value={formData.password_confirmation}
                                        onChange={handleInputChange}
                                        placeholder="Confirm Password"
                                    />
                                    <i
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className={`bi ${showConfirmPassword ? 'bi-eye-slash' : 'bi-eye'} absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer hover:text-gray-600`}
                                    ></i>
                                </InputWrapper>
                                {errors.password_confirmation && (
                                    <p className="text-red-500 text-xs mt-1">{errors.password_confirmation}</p>
                                )}
                            </div>
                        </div>

                        {/* Form Actions */}
                        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                            <Link to="/users">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="px-12 py-3 border-gray-200 text-gray-700 hover:bg-gray-50 font-[600]"
                                >
                                    Cancel
                                </Button>
                            </Link>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="px-12 py-3 shadow-lg shadow-red-100 font-[600] bg-[#D10000] hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <i className="bi bi-hourglass-split animate-spin mr-2"></i>
                                        Creating...
                                    </>
                                ) : (
                                    'Save'
                                )}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}