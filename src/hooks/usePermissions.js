export default function usePermissions() {
    const admin = JSON.parse(localStorage.getItem('admin') || '{}');

    const can = (module) => {
        if (!admin) return false;

        // Super admin → full access
        if (admin.is_super) return true;

        return admin.modules?.includes(module);
    };

    return { admin, can };
}