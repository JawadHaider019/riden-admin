import React, { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { Label, InputWrapper, Input } from '@/components/UI';
import { getAdminProfile } from '../../api/auth';
import { Link } from 'react-router-dom';

export default function AdminProfile() {
    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(true);

    const allModules = [
        'Dashboard', 'Analytics/Stats', 'User Management', 'Driver Management',
        'Vehicles Management', 'Booking Management', 'Reviews & Ratings',
        'Promo code Management', 'Fare Management', 'Commission Management',
        'Payment Management', 'Report Management', 'Passenger Management',
        'Advertising Management', 'Support Ticket', 'Notifications',
        'CMS management', 'Settings'
    ];

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                const res = await getAdminProfile();
                setAdmin(res.data);
            }
            catch (error) {
                console.log("Error fetching profile", error);
            } finally {
                setLoading(false);
            }
        }
        fetchProfile();
    }, []);

    if (loading) {
        return (
            <AdminLayout title="My Profile">
                <div className="flex justify-center items-center h-[400px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D10000]"></div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="My Profile">
            <div className="mx-auto">
                <div className="bg-white rounded-[30px] shadow-sm border border-[#E5E7EB] p-6">

                    {/* Profile Header section with Avatar */}
                    <div className="flex items-center  gap-6 px-4 mb-4 pb-4 border-b border-gray-100 ">
                        <Link to="/" className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-white hover:bg-gray-200 transition-colors mb-6">
                            <span className="text-xl font-bold text-gray-500">  <i className="bi bi-chevron-left"></i></span>
                        </Link>


                        <img
                            src={admin?.avatar || "https://ui-avatars.com/api/?name=" + (admin?.name || 'Admin') + "&background=random"}
                            className="w-20 h-20 rounded-full border-4 border-white shadow-xl bg-gray-100"
                            alt="Admin"
                        />


                        <div>
                            <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">{admin?.name || 'Admin User'}</h2>
                            <span className="text-[14px] font-bold text-[#D10000] uppercase tracking-widest">{admin?.role || 'Administrator'}</span>
                        </div>
                    </div>

                    {/* Admin Details Section */}
                    <div className="bg-[#d10000] rounded-full p-4 text-[14px] font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                        My Personal Details
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4 mb-12">
                        <div>
                            <Label className="text-gray-500 font-bold uppercase tracking-tight">Full Name</Label>
                            <InputWrapper icon="bi bi-person" className="bg-gray-50 border-transparent">
                                <div className="py-2.5 px-1 text-sm font-bold text-gray-900">{admin?.name || 'N/A'}</div>
                            </InputWrapper>
                        </div>

                        <div>
                            <Label className="text-gray-500 font-bold uppercase tracking-tight">Email Address</Label>
                            <InputWrapper icon="bi bi-envelope" className="bg-gray-50 border-transparent">
                                <div className="py-2.5 px-1 text-sm font-bold text-gray-900">{admin?.email || 'N/A'}</div>
                            </InputWrapper>
                        </div>

                        <div>
                            <Label className="text-gray-500 font-bold uppercase tracking-tight">Phone Number</Label>
                            <InputWrapper icon="bi bi-telephone" className="bg-gray-50 border-transparent">
                                <div className="py-2.5 px-1 text-sm font-bold text-gray-900">{admin?.phone || 'N/A'}</div>
                            </InputWrapper>
                        </div>

                        <div>
                            <Label className="text-gray-500 font-bold uppercase tracking-tight">Account Status</Label>
                            <div className="mt-1">
                                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 text-green-700 text-xs font-black uppercase tracking-widest border border-green-100">
                                    <i className="bi bi-patch-check-fill"></i>
                                    Verified Account
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Access Module Section */}
                    <div className="bg-[#d10000] rounded-full p-4 text-[14px] font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                        My Authorized Modules
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-5 gap-x-4 px-4 mb-4">
                        {allModules.map((module, i) => {
                            // Check if current admin has this module - Default to some modules if not loaded
                            const assignedModules = admin?.modules || [];
                            const isAssigned = admin?.is_super || assignedModules.includes(module);

                            return (
                                <div key={i} className="flex items-center gap-3 group">
                                    <div className={`w-5 h-5 border-2 rounded-md flex items-center justify-center transition-all ${isAssigned ? 'bg-[#D10000] border-[#D10000]' : 'bg-gray-50 border-gray-200'}`}>
                                        {isAssigned && <i className="bi bi-check text-white text-xs"></i>}
                                    </div>
                                    <span className={`text-[13px] font-bold uppercase tracking-tight transition-colors ${isAssigned ? 'text-gray-900' : 'text-gray-300'}`}>
                                        {module}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {admin?.is_super && (
                        <div className="mt-8 px-4 py-4 bg-red-50 rounded-2xl border border-red-100">
                            <p className="text-xs font-bold text-[#D10000] uppercase tracking-widest flex items-center gap-2">
                                <i className="bi bi-shield-lock-fill text-lg"></i>
                                Super Admin Privilege Active
                            </p>
                            <p className="text-[11px] text-gray-500 mt-1">You have full administrative access to all system modules and configuration settings.</p>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
