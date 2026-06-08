import api from './api';

export const getSupportTickets = async (params) => {
    const res = await api.get('/admin/support', { params });
    return res.data;
};

export const getSupportTicketById = async (id) => {
    const res = await api.get(`/admin/support/${id}`);
    return res.data;
};

export const replyToSupportTicket = async (id, data) => {
    // According to user routes: Route::post('/{id}/reply', ...)
    // Ensure multipart/form-data for attachments
    const res = await api.post(`/admin/support/${id}/reply`, data, {
        headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {}
    });
    return res.data;
};

export const updateSupportTicketStatus = async (id, status) => {
    // Using POST with _method spoofing for higher compatibility with Laravel/Proxies
    const res = await api.post(`/admin/support/${id}/status`, {
        status,
        _method: 'PATCH'
    });
    return res.data;
};
