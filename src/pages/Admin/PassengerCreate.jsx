import React, { useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { Link, useNavigate } from 'react-router-dom';
import { Label, InputWrapper, Input, Select, Button, useToast } from '@/components/UI';
import { createPassenger } from '@/api/passengerApi';

export default function PassengerCreate() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('personal');
    const [completedSteps, setCompletedSteps] = useState({ personal: false, security: false });

    // Form States
    const [personalInfo, setPersonalInfo] = useState({ firstName: '', lastName: '', email: '', phone: '', gender: '' });
    const [securityInfo, setSecurityInfo] = useState({ password: '', confirmPassword: '' });
    const [selectedImage, setSelectedImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { showToast } = useToast();

    const handleImageChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedImage(e.target.files[0]);
        }
    };

    const [errors, setErrors] = useState({});

    // Validation
    const validatePersonal = () => {
        const newErrors = {};
        if (!personalInfo.firstName) newErrors.firstName = 'First name is required';
        if (!personalInfo.lastName) newErrors.lastName = 'Last name is required';
        if (!personalInfo.email) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(personalInfo.email)) newErrors.email = 'Email is invalid';
        if (!personalInfo.phone) newErrors.phone = 'Phone number is required';
        if (!personalInfo.gender) newErrors.gender = 'Gender is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateSecurity = () => {
        const newErrors = {};
        if (!securityInfo.password) newErrors.password = 'Password is required';
        if (securityInfo.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
        if (securityInfo.password !== securityInfo.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (activeTab === 'personal') {
            if (validatePersonal()) {
                setCompletedSteps(prev => ({ ...prev, personal: true }));
                setActiveTab('security');
                setErrors({});
            }
        }
    };

    const handleBack = () => {
        if (activeTab === 'security') setActiveTab('personal');
    };

    const handleSubmit = async () => {
        if (validateSecurity()) {
            try {
                setLoading(true);
                const formData = new FormData();
                formData.append('first_name', personalInfo.firstName);
                formData.append('last_name', personalInfo.lastName);
                formData.append('email', personalInfo.email);
                formData.append('phone', personalInfo.phone);
                formData.append('gender', personalInfo.gender);
                formData.append('password', securityInfo.password);
                formData.append('password_confirmation', securityInfo.confirmPassword);

                if (selectedImage) {
                    formData.append('avatar', selectedImage);
                }

                await createPassenger(formData);
                showToast('Passenger created successfully!', 'success');
                navigate('/passenger');
            } catch (error) {
                console.error("Error creating passenger:", error);
                const message = error.response?.data?.message || "Failed to create passenger";
                showToast(message, 'error');
            } finally {
                setLoading(false);
            }
        }
    };

    const steps = [
        { id: 'personal', label: 'Personal Info', title: 'PERSONAL INFORMATION', desc: 'Provide the necessary details to register a new passenger with us.' },
        { id: 'security', label: 'Account Security', title: 'ACCOUNT SECURITY', desc: 'Secure the passenger profile with a strong password.' }
    ];

    const currentStepIndex = steps.findIndex(s => s.id === activeTab);

    return (
        <AdminLayout title="Passenger Management">
            <div className=" mx-auto mb-4">

                <div className="bg-white p-10 rounded-[20px] shadow-sm border border-[#E5E7EB]">

                    {/* Header Title */}
                    <div className=" mb-8 flex items-center gap-2 border-b border-gray-100 pb-6">
                        <Link to="/passenger" className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors">
                            <i className="bi bi-chevron-left text-sm"></i>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-[600] text-gray-900 leading-tight">Add New Passenger</h1>
                            <p className="text-sm text-gray-500 font-medium">Fill in the details to register a new passenger</p>
                        </div>
                    </div>

                    {/* Horizontal Stepper */}
                    <div className="relative flex justify-between items-center mb-14 max-w-lg mx-auto">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-gray-200 z-0"></div>

                        {steps.map((step, index) => {
                            const isCompleted = completedSteps[step.id] || index < currentStepIndex;
                            const isActive = activeTab === step.id;

                            return (
                                <div key={step.id} className="relative z-10 flex flex-col items-center">
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-[600] transition-all duration-300 border-2 ${isActive
                                            ? 'bg-white border-[#D10000] text-[#D10000]'
                                            : isCompleted
                                                ? 'bg-[#D10000] border-[#D10000] text-white'
                                                : 'bg-white border-gray-300 text-gray-400'
                                            }`}
                                    >
                                        {isCompleted && !isActive ? <i className="bi bi-check-lg text-xl"></i> : index + 1}
                                    </div>
                                    <span className={`absolute -bottom-7 text-xs font-semibold whitespace-nowrap ${isActive || isCompleted ? 'text-gray-800' : 'text-gray-400'}`}>
                                        {step.label}
                                    </span>
                                </div>
                            );
                        })}

                        {/* Dynamic Progress Line Overlay */}
                        <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-[#D10000] z-0 transition-all duration-500 ease-in-out"
                            style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                        ></div>
                    </div>

                    {/* Step Title & Description */}
                    <div className="mb-8 border-b border-gray-100 pb-4">
                        <h3 className="text-base font-[600] text-gray-800 tracking-wider mb-1 uppercase">{steps[currentStepIndex].title}</h3>
                        <p className="text-sm text-gray-500">{steps[currentStepIndex].desc}</p>
                    </div>

                    {/* Form Fields */}
                    <div className="min-h-[300px]">
                        {activeTab === 'personal' && (
                            <div className="space-y-6">
                                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-8">
                                    <Label className="md:w-1/3 text-gray-700 font-semibold mb-0">Profile Image</Label>
                                    <div className="md:w-2/3">
                                        <InputWrapper icon="bi bi-image" style={{ borderStyle: 'dashed' }}>
                                            <Input type="file" accept="image/*" onChange={handleImageChange} />
                                        </InputWrapper>
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-8">
                                    <Label className="md:w-1/3 text-gray-700 font-semibold mb-0">First Name</Label>
                                    <div className="md:w-2/3">
                                        <InputWrapper icon="bi bi-person" className={errors.firstName ? 'border-red-500' : ''}>
                                            <Input placeholder="e.g. John" value={personalInfo.firstName} onChange={(e) => setPersonalInfo({ ...personalInfo, firstName: e.target.value })} />
                                        </InputWrapper>
                                        {errors.firstName && <span className="text-xs text-red-500 mt-1 block">{errors.firstName}</span>}
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-8">
                                    <Label className="md:w-1/3 text-gray-700 font-semibold mb-0">Last Name</Label>
                                    <div className="md:w-2/3">
                                        <InputWrapper icon="bi bi-person" className={errors.lastName ? 'border-red-500' : ''}>
                                            <Input placeholder="e.g. Doe" value={personalInfo.lastName} onChange={(e) => setPersonalInfo({ ...personalInfo, lastName: e.target.value })} />
                                        </InputWrapper>
                                        {errors.lastName && <span className="text-xs text-red-500 mt-1 block">{errors.lastName}</span>}
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-8">
                                    <Label className="md:w-1/3 text-gray-700 font-semibold mb-0">Email Address</Label>
                                    <div className="md:w-2/3">
                                        <InputWrapper icon="bi bi-envelope" className={errors.email ? 'border-red-500' : ''}>
                                            <Input type="email" placeholder="john.doe@example.com" value={personalInfo.email} onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })} />
                                        </InputWrapper>
                                        {errors.email && <span className="text-xs text-red-500 mt-1 block">{errors.email}</span>}
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-8">
                                    <Label className="md:w-1/3 text-gray-700 font-semibold mb-0">Phone Number</Label>
                                    <div className="md:w-2/3">
                                        <InputWrapper icon="bi bi-telephone" className={errors.phone ? 'border-red-500' : ''}>
                                            <Input placeholder="+1 234 567 890" value={personalInfo.phone} onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })} />
                                        </InputWrapper>
                                        {errors.phone && <span className="text-xs text-red-500 mt-1 block">{errors.phone}</span>}
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-8">
                                    <Label className="md:w-1/3 text-gray-700 font-semibold mb-0">Gender</Label>
                                    <div className="md:w-2/3">
                                        <InputWrapper icon="bi bi-gender-ambiguous" className={errors.gender ? 'border-red-500' : ''}>
                                            <Select value={personalInfo.gender} onChange={(e) => setPersonalInfo({ ...personalInfo, gender: e.target.value })}>
                                                <option value="" disabled>Select gender</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Other">Other</option>
                                            </Select>
                                        </InputWrapper>
                                        {errors.gender && <span className="text-xs text-red-500 mt-1 block">{errors.gender}</span>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div className="space-y-6">
                                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-8">
                                    <Label className="md:w-1/3 text-gray-700 font-semibold mb-0">Password</Label>
                                    <div className="md:w-2/3">
                                        <InputWrapper icon="bi bi-lock" className={errors.password ? 'border-red-500' : ''}>
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                value={securityInfo.password}
                                                onChange={(e) => setSecurityInfo({ ...securityInfo, password: e.target.value })}
                                            />
                                            <i
                                                onClick={() => setShowPassword(!showPassword)}
                                                className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'} absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors`}
                                            ></i>
                                        </InputWrapper>
                                        {errors.password && <span className="text-xs text-red-500 mt-1 block">{errors.password}</span>}
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-8">
                                    <Label className="md:w-1/3 text-gray-700 font-semibold mb-0">Confirm Password</Label>
                                    <div className="md:w-2/3">
                                        <InputWrapper icon="bi bi-shield-lock" className={errors.confirmPassword ? 'border-red-500' : ''}>
                                            <Input
                                                type={showConfirmPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                value={securityInfo.confirmPassword}
                                                onChange={(e) => setSecurityInfo({ ...securityInfo, confirmPassword: e.target.value })}
                                            />
                                            <i
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className={`bi ${showConfirmPassword ? 'bi-eye-slash' : 'bi-eye'} absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors`}
                                            ></i>
                                        </InputWrapper>
                                        {errors.confirmPassword && <span className="text-xs text-red-500 mt-1 block">{errors.confirmPassword}</span>}
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-8">
                                    <div className="md:w-1/3"></div>
                                    <div className="md:w-2/3">
                                        <div className="bg-blue-50/50 p-4 rounded-xl flex items-start gap-3 border border-blue-50">
                                            <i className="bi bi-info-circle-fill text-blue-500 mt-0.5"></i>
                                            <p className="text-xs text-gray-500 font-medium">
                                                Password must be at least 8 characters long and include confirmation.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className={`mt-12 flex items-center  pt-6 border-t border-gray-100 ${activeTab === 'personal' ? 'justify-end' : 'justify-between'}`}>
                        {activeTab === 'personal' ? " " : (
                            <button
                                onClick={handleBack}
                                className="text-sm font-semibold text-[#D10000] hover:text-[#b00000] transition-colors flex items-center gap-1"
                            >
                                <i className="bi bi-chevron-left mr-1"></i> Previous
                            </button>
                        )}

                        {activeTab !== 'security' ? (
                            <button
                                onClick={handleNext}
                                className="bg-[#D10000] hover:bg-[#b00000] text-white text-sm font-semibold px-8 py-2.5 rounded-lg transition-colors flex items-center gap-1"
                            >
                                Next <i className="bi bi-chevron-right ml-1"></i>
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="bg-[#D10000] hover:bg-[#b00000] text-white text-sm font-semibold px-8 py-2.5 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                            >
                                {loading ? 'Registering...' : 'Submit Registration'} <i className="bi bi-check2 ml-1"></i>
                            </button>
                        )}
                    </div>

                </div>
            </div>
        </AdminLayout>
    );
}
