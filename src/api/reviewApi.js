import api from './api';

/**
 * Get all reviews with stats
 * @param {Object} params - { type: 'driver'|'passenger', page: number, per_page: number, sender_id: number, receiver_id: number }
 */
export const getReviews = async (params = {}) => {
    try {
        const response = await api.get('/admin/reviews', { params });
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Delete a review
 * @param {number|string} id 
 */
export const deleteReview = async (id) => {
    try {
        const response = await api.post(`/admin/reviews/${id}`, {
            _method: 'DELETE'
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Submit a review (not typically used by admin, but supported by back-end)
 * @param {Object} data 
 */
export const storeReview = async (data) => {
    try {
        const response = await api.post('/admin/reviews', data);
        return response.data;
    } catch (error) {
        throw error;
    }
};
