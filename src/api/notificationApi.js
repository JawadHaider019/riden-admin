import api from './api';

export const getNotifications = async () => {
    const res = await api.get('/admin/notifications');
    return res.data;
};

export const markNotificationAsRead = async (id) => {
    const res = await api.post(`/admin/notifications/${id}/read`);
    return res.data;
};

export const markAllAsRead = async () => {
    const res = await api.post('/admin/notifications/read-all');
    return res.data;
};
