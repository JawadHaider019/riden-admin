import api from './api';


export const getDrivers = async (params = {}) => {
    const res = await api.get('/admin/drivers', { params });
    return res.data;
};


export const getDriverById = async (id) => {
    const res = await api.get(`/admin/drivers/${id}`);
    return res.data;
};


export const createDriver = async (data) => {
    const res = await api.post('/admin/drivers', data, {
        headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {}
    });
    return res.data;
};


export const updateDriver = async (id, data) => {
    if (data instanceof FormData) {
        data.append('_method', 'PATCH');
        const res = await api.post(`/admin/drivers/${id}`, data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return res.data;
    }

    const res = await api.post(`/admin/drivers/${id}`, {
        ...data,
        _method: 'PATCH'
    });
    return res.data;
};

/**
 * Toggle driver status (Active/Blocked etc.)
 */
export const toggleDriverStatus = async (id, data = {}) => {
    const res = await api.post(`/admin/drivers/${id}/status`, {
        ...data,
        _method: 'PATCH'
    });
    return res.data;
};

/**
 * Delete a driver
 */
export const deleteDriver = async (id) => {
    const res = await api.post(`/admin/drivers/${id}`, {
        _method: 'DELETE'
    });
    return res.data;
};
/**
 * Update driver document status (Approved/Rejected)
 */
export const updateDocumentStatus = async (driverId, docId, data) => {
    const res = await api.post(`/admin/drivers/${driverId}/documents/${docId}/verify`, {
        ...data,
        _method: 'PATCH'
    });
    return res.data;
};
