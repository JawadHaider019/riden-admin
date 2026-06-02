import api from './api';

/**
 * Fetch all fares and vehicle categories
 * @param {string} vehicleType - Optional filter by vehicle type
 * @param {string} area - Optional filter by area
 */
export const getFares = async (vehicleType = '', area = '') => {
    const params = {};
    if (vehicleType) params.vehicle_type_id = vehicleType;
    if (area) params.service_areas_id = area;
    const res = await api.get('/admin/fares', { params });
    return res.data;
};

/**
 * Update fare for a specific day and vehicle type
 * @param {Object} data - Fare data including id, vehicle_type, day, etc.
 */
export const updateFare = async (data) => {
    const res = await api.post('/admin/fares/update', data);
    return res.data;
};
