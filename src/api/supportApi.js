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
    const res = await api.post(`/admin/support/${id}/reply`, data);
    return res.data;
};

export const createSupportTicket = async (data) => {
    const res = await api.post('/admin/support', data);
    return res.data;
};

export const updateSupportTicketStatus = async (id, status) => {
    const res = await api.post(`/admin/support/${id}/status`, {
        status,
        _method: 'PATCH'
    });
    return res.data;
};
