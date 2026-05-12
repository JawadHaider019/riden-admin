import axios from 'axios';

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

const geoCache = new Map();

/**
 * Reverse geocodes coordinates using Google Maps Geocoding API
 * @param {number|string} lat 
 * @param {number|string} lng 
 * @returns {Promise<string>}
 */
export const reverseGeocode = async (lat, lng) => {
    if (!lat || !lng || !GOOGLE_MAPS_KEY) return 'N/A';

    const cacheKey = `${lat},${lng}`;
    if (geoCache.has(cacheKey)) return geoCache.get(cacheKey);

    try {
        const response = await axios.get(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_KEY}`
        );

        if (response.data.status === 'OK') {
            const address = response.data.results[0].formatted_address;
            geoCache.set(cacheKey, address);
            return address;
        } else {
            console.error('Geocoding Error:', response.data.status, response.data.error_message);
            return `${lat}, ${lng}`;
        }
    } catch (error) {
        console.error('Geocoding API failed:', error);
        return `${lat}, ${lng}`;
    }
};
