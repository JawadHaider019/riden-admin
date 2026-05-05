import api from './api';

export const getBookings = async (params) => {
    const res = await api.get('/admin/bookings', { params });
    return res.data;
};

export const getBookingDetail = async (id) => {
    const res = await api.get(`/admin/bookings/${id}`);
    return res.data;
};

export const createBooking = async (data) => {
    const res = await api.post('/admin/bookings', data);
    return res.data;
};

export const updateBookingStatus = async (id, status) => {
    const res = await api.patch(`/admin/bookings/${id}/status`, { status });
    return res.data;
};