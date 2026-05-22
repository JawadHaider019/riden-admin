import api from './api';

export const getVehicleTypes = async () => {
    const res = await api.get('/admin/vehicle-types');
    return res.data;
};

export const getVehicles = async (params) => {
    const res = await api.get('/admin/vehicles', { params });
    return res.data;
};

export const getVehicleDetail = async (id) => {
    const res = await api.get(`/admin/vehicles/${id}`);
    return res.data;
};

export const createVehicle = async (data) => {
    const res = await api.post('/admin/vehicles', data, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return res.data;
};

export const updateVehicle = async (id, data) => {
    const res = await api.post(`/admin/vehicles/${id}`, data, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return res.data;
};

export const deleteVehicle = async (id) => {
    const res = await api.post(`/admin/vehicles/${id}`, {
        _method: 'DELETE'
    });
    return res.data;
};

export const toggleVehicleStatus = async (id) => {
    const res = await api.post(`/admin/vehicles/toggle-status/${id}`);
    return res.data;
};