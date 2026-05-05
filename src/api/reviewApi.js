import api from './api';

export const getReviews = async (page = 1) => {
    const response = await api.get(`/admin/reviews?page=${page}`);
    return response.data;
};

export const deleteReview = async (id) => {
    const response = await api.delete(`/admin/reviews/${id}`);
    return response.data;
};
