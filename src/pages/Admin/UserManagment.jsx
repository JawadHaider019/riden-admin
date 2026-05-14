import React, { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { Table, Button, SearchBar, DeleteModal, Pagination, DatePickerStyles, useToast, Loader } from '@/components/UI';
import { Link, useNavigate } from 'react-router-dom';
import { startOfWeek } from 'date-fns';
import { getAdmins, deleteAdmin } from '../../api/adminApi';

export default function UserManagement() {
    const [adminRoles, setAdminRoles] = useState([]);
    const [filteredAdmins, setFilteredAdmins] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedAdmin, setSelectedAdmin] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // ✅ FIXED load function
    const loadAdmins = async () => {
        try {
            setLoading(true);
            const res = await getAdmins();
            const payload = res.data || res || {};
            const list = payload.data?.data || (Array.isArray(payload.data) ? payload.data : (Array.isArray(payload) ? payload : []));
            setAdminRoles(list);
            setFilteredAdmins(list);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // ✅ FIXED useEffect
    useEffect(() => {
        loadAdmins();
    }, []);

    // Search functionality
    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredAdmins(adminRoles);
        } else {
            const filtered = adminRoles.filter(admin =>
                admin.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                admin.email?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredAdmins(filtered);
        }
    }, [searchTerm, adminRoles]);

    const handleDeleteClick = (admin) => {
        setSelectedAdmin(admin);
        setIsDeleteModalOpen(true);
    };

    // ✅ IMPROVED DELETE LOGIC with proper 403 error handling
    const confirmDelete = async () => {
        if (!selectedAdmin) return;
        if (isDeleting) return;

        setIsDeleting(true);

        try {
            await deleteAdmin(selectedAdmin.id);

            // remove from UI instantly
            setAdminRoles(prev =>
                prev.filter(item => item.id !== selectedAdmin.id)
            );
            setFilteredAdmins(prev =>
                prev.filter(item => item.id !== selectedAdmin.id)
            );

            showToast(`Admin "${selectedAdmin?.name}" deleted successfully`, "delete");

            setIsDeleteModalOpen(false);
            setSelectedAdmin(null);

        } catch (error) {
            console.error('Delete error:', error);

            // ✅ Extract error message from backend response (works with 403 Forbidden)
            let errorMessage = "Failed to delete admin";

            if (error.response) {
                // Server responded with error status (403, 404, 500, etc.)
                const backendData = error.response.data;

                // Check for message in different possible locations
                if (backendData?.message) {
                    errorMessage = backendData.message; // "Super admin cannot be deleted"
                } else if (backendData?.error) {
                    errorMessage = backendData.error;
                } else if (typeof backendData === 'string') {
                    errorMessage = backendData;
                }

                // Log the full error for debugging
                console.log('Status:', error.response.status);
                console.log('Error data:', backendData);

                // You can also show different messages based on status if needed
                if (error.response.status === 403) {

                    console.log('Permission denied:', errorMessage);
                }
            } else if (error.request) {
                // Request made but no response (CORS or network issue)
                errorMessage = "Network error. Please check your connection.";
            } else if (error.message === "Network Error") {
                errorMessage = "Network error. Please check if the server is accessible.";
            }

            // Show the error message from backend
            showToast(errorMessage, "error");

        } finally {
            setIsDeleting(false);
        }
    };
    // Function to render modules display
    const renderModules = (admin) => {
        // Check if admin is super admin
        if (admin.is_super === true || admin.is_super === 1) {
            return (
                <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-semibold">
                    <i className="bi bi-shield-check text-sm"></i>
                    All Access (Super Admin)
                </span>
            );
        }

        // ✅ FIXED: Proper array check with Array.isArray
        if (Array.isArray(admin.modules) && admin.modules.length > 0) {
            return (
                <div className="flex flex-wrap gap-1">
                    {admin.modules.slice(0, 3).map((m, idx) => (
                        <span
                            key={idx}
                            className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600"
                        >
                            {m.length > 20 ? m.substring(0, 17) + '...' : m}
                        </span>
                    ))}
                    {admin.modules.length > 3 && (
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-500">
                            +{admin.modules.length - 3} more
                        </span>
                    )}
                </div>
            );
        }

        return (
            <span className="text-gray-400 text-xs">No Access</span>
        );
    };

    // Get current user from localStorage to prevent deleting yourself
    const currentAdmin = JSON.parse(localStorage.getItem('admin') || '{}');

    return (
        <AdminLayout title="User Management">

            <DatePickerStyles />

            {/* Header */}
            <div className="flex flex-col gap-6 mb-4">
                <div className="flex flex-wrap items-center justify-between gap-4">

                    <SearchBar
                        placeholder="Search admins by name or email..."
                        className="w-full md:w-80"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />

                    <Link to="/users/create">
                        <Button className="px-8 py-3 rounded-full font-[600] uppercase tracking-widest shadow-xl shadow-red-100">
                            <i className="bi bi-plus-lg mr-2"></i> Add Admin
                        </Button>
                    </Link>

                </div>
            </div>

            {/* Loading State */}
            {loading ? (
                <Loader />
            ) : (
                <>
                    {/* TABLE */}
                    <Table headers={['Id', 'Admin Name', 'Email Address', 'Actions']} headerBg="bg-[#FFF1F2]">

                        {filteredAdmins.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="text-center py-12 text-gray-400">
                                    <i className="bi bi-people text-4xl"></i>
                                    <p className="mt-2">No admins found</p>
                                </td>
                            </tr>
                        ) : (
                            filteredAdmins.map((admin) => (
                                <tr
                                    key={admin.id}
                                    onClick={() => navigate(`/users/detail/${admin.id}`)}
                                    className="group hover:bg-black/[0.03] transition-colors border-b border-[#F3F4F6] cursor-pointer"
                                >
                                    <td className="py-[18px] px-[30px] text-[#6B7280] font-[600] italic tracking-tight">
                                        {admin.id}
                                    </td>

                                    <td className="py-[18px] px-[30px] text-[15px] font-[600] text-[#111] tracking-tight">
                                        <div className="flex items-center gap-2">
                                            <Link
                                                to={`/users/detail/${admin.id}`}
                                                className="hover:text-[#D10000] transition-colors"
                                            >
                                                {admin.name}
                                            </Link>

                                            {currentAdmin.id === admin.id && (
                                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                                    You
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    <td className="py-[18px] px-[30px] text-[14px] font-[600] text-[#4B5563]">
                                        {admin.email}
                                    </td>



                                    <td className="py-[18px] px-[30px] text-right">
                                        <div className="flex gap-3">
                                            <Link
                                                to={`/users/edit/${admin.id}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    console.log("Edit clicked for admin:", admin);
                                                }}
                                                className="w-10 h-10 text-green-500 flex items-center justify-start hover:text-green-600 transition-all font-[600]"
                                                title="Edit Admin"
                                            >
                                                <i className="bi bi-pencil-square text-lg"></i>
                                            </Link>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteClick(admin);
                                                }}
                                                disabled={currentAdmin.id === admin.id || isDeleting}
                                                className={`w-10 h-10 flex items-center justify-start transition-all ${currentAdmin.id === admin.id || isDeleting
                                                    ? 'text-gray-300 cursor-not-allowed'
                                                    : 'text-red-500 hover:text-red-600'
                                                    }`}
                                                title={currentAdmin.id === admin.id ? "Cannot delete yourself" : "Delete Admin"}
                                            >
                                                <i className="bi bi-trash3-fill text-lg"></i>
                                            </button>
                                        </div>
                                    </td>

                                </tr>
                            ))
                        )}

                    </Table>

                    <Pagination totalItems={adminRoles.length} />
                </>
            )}

            <DeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setSelectedAdmin(null);
                    setIsDeleting(false);
                }}
                onConfirm={confirmDelete}
                itemName={selectedAdmin?.name}
                itemType="admin"
                isLoading={isDeleting}
            />

        </AdminLayout>
    );
}