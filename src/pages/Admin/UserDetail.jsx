import React, { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { Link, useParams } from 'react-router-dom';
import { Label, InputWrapper, useToast } from '@/components/UI';
import { getAdminById } from '../../api/adminApi';

export default function AdminDetail() {
    const { id } = useParams();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [admin, setAdmin] = useState(null);

    const modulesList = [
        'Dashboard & Analytics', 'User Management', 'Driver Management',
        'Vehicles Management', 'Booking Management', 'Reviews & Ratings',
        'Promo code Management', 'Fare Management', 'Commission Management',
        'Payment Management', 'Report Management', 'Passenger Management',
        'Advertising Management', 'Support Ticket', 'Notifications',
        'CMS management', 'Settings'
    ];

    useEffect(() => {
        const fetchAdmin = async () => {
            try {
                const response = await getAdminById(id);
                if (response.status === 'success') {
                    const data = response.data;
                    setAdmin({
                        ...data,
                        assigned_modules: Array.isArray(data.modules) ? data.modules : (data.modules ? JSON.parse(data.modules) : []),
                        country_code: '+1', // Backend usually stores full number or separate fields, assuming +1 for UI consistency
                    });
                }
            } catch (error) {
                console.error('Error fetching admin:', error);
                showToast("Failed to load admin details", "error");
            } finally {
                setLoading(false);
            }
        };

        fetchAdmin();
    }, [id]);

    if (loading) {
        return (
            <AdminLayout title="User Management">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D10000]"></div>
                </div>
            </AdminLayout>
        );
    }

    if (!admin) {
        return (
            <AdminLayout title="User Management">
                <div className="text-center py-20">
                    <p className="text-gray-500">Admin not found.</p>
                    <Link to="/users" className="text-[#D10000] hover:underline mt-4 inline-block font-bold">Back to List</Link>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="User Management">
            <div className="mx-auto">
                <div className="riden-addadmin-head flex items-center gap-4 mb-4">
                    <Link to="/users" className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors">
                        <i className="bi bi-chevron-left text-sm"></i>
                    </Link>
                    <div className="flex-grow">
                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Admin Profile Details</h2>
                    </div>
                    <Link to={`/users/edit/${id}`}>
                        <button className="px-6 py-2 bg-black text-white rounded-full text-sm font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors">
                            Edit Profile
                        </button>
                    </Link>
                </div>

                <div className="bg-white rounded-[30px] shadow-sm border border-[#E5E7EB] p-6">
                    {/* Admin Details Section */}
                    <div className="bg-[#d10000] rounded-full p-4 text-[14px] font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                        Admin Details
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 mb-8">
                        <div>
                            <Label className="text-gray-500 font-bold">Name</Label>
                            <InputWrapper icon="bi bi-person" className="bg-gray-50 border-transparent">
                                <div className="py-2.5 px-1 text-sm font-bold text-gray-900">{admin.name}</div>
                            </InputWrapper>
                        </div>

                        <div>
                            <Label className="text-gray-500 font-bold">Email</Label>
                            <InputWrapper icon="bi bi-envelope" className="bg-gray-50 border-transparent">
                                <div className="py-2.5 px-1 text-sm font-bold text-gray-900">{admin.email}</div>
                            </InputWrapper>
                        </div>

                        <div>
                            <Label className="text-gray-500 font-bold">Phone Number</Label>
                            <InputWrapper className="flex items-center gap-4 bg-gray-50 border-transparent">
                                <div className="flex items-center gap-2 py-1">
                                    <img src="https://flagcdn.com/w40/ca.png" alt="CA" className="w-5" />
                                    <span className="text-[14px] font-bold text-gray-900">{admin.country_code}</span>
                                </div>
                                <div className="flex-grow py-2.5 text-sm font-bold text-gray-900">
                                    {admin.phone ? admin.phone.replace(/^\+1/, '') : 'Not provided'}
                                </div>
                            </InputWrapper>
                        </div>

                        <div className="mt-4">
                            <Label className="text-gray-500 font-bold mb-2">Role Status</Label>
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${admin.is_super ? 'bg-[#D10000] border-[#D10000]' : 'bg-white border-gray-300'}`}>
                                    {admin.is_super && <i className="bi bi-check text-white text-xs"></i>}
                                </div>
                                <div>
                                    <span className="text-[14px] font-bold text-gray-900">Super Admin</span>
                                    <p className="text-xs text-gray-500">{admin.is_super ? 'Has full system access' : 'Restricted access based on modules'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Access Module Section */}
                    <div className="bg-[#d10000] mt-4 rounded-full p-4 text-[14px] font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                        Assigned Access Modules
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-5 gap-x-4 px-4 mb-4">
                        {modulesList.map((module, i) => {
                            const isAssigned = admin.is_super || admin.assigned_modules?.includes(module);
                            return (
                                <div key={i} className="flex items-center gap-3 group opacity-90">
                                    <div className={`w-5 h-5 border-2 rounded-md flex items-center justify-center transition-all ${isAssigned ? 'bg-[#D10000] border-[#D10000]' : 'bg-gray-100 border-gray-200'}`}>
                                        {isAssigned && <i className="bi bi-check text-white text-xs"></i>}
                                    </div>
                                    <span className={`text-[13px] font-bold uppercase tracking-tight ${isAssigned ? 'text-gray-900' : 'text-gray-400'}`}>
                                        {module}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {!admin.is_super && (!admin.assigned_modules || admin.assigned_modules.length === 0) && (
                        <p className="text-yellow-600 text-xs mt-2 px-4 italic">
                            <i className="bi bi-info-circle mr-1"></i>
                            No permissions have been granted to this admin profile.
                        </p>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
