import api from './api'

export const getAdmins = async () => {
    const res = await api.get('/admin/roles');
    return res.data;
}

export const createAdmin = async (data) => {
    const res = await api.post('/admin/roles', data);
    return res.data;
};



export const getAdminById = async (id) => {
    // Backend doesn't support GET singular, so we find in list
    const res = await getAdmins();
    const payload = res.data || res || {};
    const list = payload.data?.data || (Array.isArray(payload.data) ? payload.data : (Array.isArray(payload) ? payload : []));

    const admin = list.find(a => a.id == id);
    return { status: 'success', data: admin };
};

export const updateAdmin = async (id, data) => {
    // Using POST with _method: PATCH for Laravel route spoofing to avoid CORS PATCH issues
    const res = await api.post(`/admin/roles/${id}`, {
        ...data,
        _method: 'PATCH'
    });
    return res.data;
};

export const deleteAdmin = async (id) => {
    const res = await api.post(`/admin/roles/${id}`, {
        _method: 'DELETE'
    });
    return res.data;
};


