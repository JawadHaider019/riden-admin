import api from './api';

export const getDashboardStats = async () => {
    const res = await api.get('admin/stats');
    return res.data;
}

export const getDashboardAnalytics = async () => {
    const res = await api.get('admin/analytics');
    return res.data;
}

export const getOnlineDrivers = async () => {
    const res = await api.get('admin/drivers/online');
    return res.data;
}
