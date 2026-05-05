import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute({ module }) {
    const token = localStorage.getItem('token');
    const adminStr = localStorage.getItem('admin');
    const admin = adminStr ? JSON.parse(adminStr) : null;

    if (!token) {
        return <Navigate to='/auth/login' replace />;
    }

    if (module && admin) {
        // Ensure we handle boolean/number for is_super consistently
        const isSuper = admin.is_super == true || admin.is_super == 1 || admin.is_super == '1';

        // 1. Dashboard & Analytics is public for ALL authenticated admins
        if (module === "Dashboard") {
            return <Outlet />;
        }

        // 2. User Management is strictly locked to Super Admins only
        if (module === "User Management") {
            if (isSuper) {
                return <Outlet />;
            }
            return <Navigate to='/unauthorized' replace />;
        }

        // 3. Other modules check for Super status OR specific module permission
        const hasPermission = isSuper || (admin.modules && admin.modules.includes(module));
        if (!hasPermission) {
            return <Navigate to='/unauthorized' replace />;
        }
    }

    return <Outlet />;
}