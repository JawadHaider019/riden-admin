import api from './api';


export const loginAdmin = async (email, password) => {
    const res = await api.post('/admin/login', {
        email,
        password
    });

    const token = res.data?.data?.token || res.data?.token;
    const admin = res.data?.data?.admin || res.data?.admin || res.data?.data || {};

    if (!token) {
        throw new Error("Token missing");
    }

    // store auth
    localStorage.setItem("token", token);
    localStorage.setItem("admin", JSON.stringify(admin));

    console.log("✅ LOGIN SUCCESS");

    return res.data;
};

export const getAdminProfile = async () => {
    try {
        const res = await api.get('/admin/me');

        const admin = res.data?.data || res.data || {};

        localStorage.setItem("admin", JSON.stringify(admin));

        return res.data;
    } catch (error) {
        console.log("❌ Error fetching profile:", error?.response?.data || error);
        throw error;
    }
};

export const logoutAdmin = async () => {
    try {
        await api.post('/admin/logout');
    } catch (error) {
        console.log("logout failed", error);
    }
};