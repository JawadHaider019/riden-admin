import api from './api';

/**
 * Update commission setting for a specific vehicle type or global default
 * @param {Object} data - Commission data
 */
export const updateCommissionSetting = async (data) => {
    const res = await api.post('/admin/commissions/settings', data);
    return res.data;
};

/**
 * Get all commission rules
 */
export const getCommissions = async () => {
    const res = await api.get('/admin/commissions/settings');
    return res.data;
};
