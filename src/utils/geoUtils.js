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
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_KEY}&language=en`
        );

        if (response.data.status === 'OK' && response.data.results.length > 0) {
            // Find the first result that is NOT a plus_code and doesn't look like one
            const bestResult = response.data.results.find(result => {
                const isPlusCode = result.types.includes('plus_code');
                const hasPlusSign = result.formatted_address.includes('+');
                // Plus codes are often short and contain a plus sign, e.g., "WQ64+83H"
                // We want to avoid these.
                return !isPlusCode && !hasPlusSign;
            });

            const address = bestResult ? bestResult.formatted_address : response.data.results[0].formatted_address;
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
/**
 * Checks if a string looks like a Plus Code (e.g., "WQ64+83H")
 * @param {string} address 
 * @returns {boolean}
 */
export const isPlusCode = (address) => {
    if (!address || typeof address !== 'string') return false;
    // Plus codes typically contain a '+' and are relatively short, 
    // or they match the Global Code/Short Code format.
    return address.includes('+') && address.length < 20;
};
