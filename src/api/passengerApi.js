import api from './api';

export const getPassengers = async (params) => {
    const res = await api.get('/admin/passengers', { params });
    return res.data;
}

export const createPassenger = async (data) => {
    const res = await api.post('/admin/passengers', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
}

export const getPassengerById = async (id) => {
    // Loop through paginated search results to find the exact ID, avoiding 500 error on the direct endpoint 
    for (let page = 1; page <= 10; page++) {
        const res = await api.get('/admin/passengers', {
            params: { page }
        });
        const list = res.data?.data?.data || res.data?.data || [];
        const exactMatch = list.find(item => item.id == id);

        if (exactMatch) {
            return { data: exactMatch };
        }

        // Stop fetching if there's no next page
        const meta = res.data?.data || {};
        if (meta.current_page >= meta.last_page || !meta.next_page_url) {
            break;
        }
    }

    // If not found in all pages, return null
    return { data: null };
}

export const updatePassenger = async (id, data) => {
    const res = await api.post(`/admin/passengers/${id}`, {
        ...data,
        _method: 'PATCH'
    });
    return res.data;
}

export const togglePassengerStatus = async (id, data = {}) => {
    const res = await api.post(`/admin/passengers/${id}/status`, {
        ...data,
        _method: 'PATCH'
    });
    return res.data;
}

export const deletePassenger = async (id) => {
    const res = await api.post(`/admin/passengers/${id}`, {
        _method: 'DELETE'
    });
    return res.data;
}