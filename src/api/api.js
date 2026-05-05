import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL?.trim();
export const STORAGE_URL = import.meta.env.VITE_STORAGE_URL?.trim() || API_URL.replace(/\/api\/?$/, '/storage');

let hasLoggedStorageError = false;

export const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const finalUrl = `${STORAGE_URL}/${path.replace(/^\//, '')}`;

    // Diagnostic Proof for Backend Developer
    if (!hasLoggedStorageError) {
        fetch(finalUrl, { method: 'HEAD' })
            .then(res => {
                if (res.status === 404) {
                    hasLoggedStorageError = true;
                    console.error(
                        `%c🚨 BACKEND STORAGE SYMLINK MISSING 🚨\n\n` +
                        `React successfully requested the image at:\n${finalUrl}\n\n` +
                        `But the Laravel server returned a 404 Not Found error!\n\n` +
                        `👉 This proves the Database string is correct, but the server's public/storage folder is missing.\n\n` +
                        `TELL THE BACKEND DEVELOPER TO SSH INTO THE SERVER AND RUN:\n` +
                        `php artisan storage:link\n\n` +
                        `Until they run this exact command, no image will ever load.`,
                        'color: white; background: red; font-size: 14px; font-weight: bold; padding: 10px; border-radius: 8px;'
                    );
                }
            })
            .catch(() => { });
    }

    return finalUrl;
};

const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
    },
});

// ✅ REQUEST INTERCEPTOR (ONLY AUTH SOURCE)
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");

    if (token && token !== "undefined" && token !== "null") {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

// ✅ RESPONSE DEBUG (GOOD FOR DEV)
api.interceptors.response.use(
    (res) => {
        console.log("✅ API:", res.config.url);
        return res;
    },
    (error) => {
        // Automatically logout if unauthorized (token expired or admin deleted)
        if (error.response?.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("admin");

            // Redirect to login if not already there
            if (!window.location.pathname.includes('/auth/login')) {
                window.location.href = '/auth/login';
            }
        }

        console.log("❌ API ERROR:");
        console.log("URL:", error.config?.url);
        console.log("STATUS:", error.response?.status);
        console.log("DATA:", error.response?.data);
        return Promise.reject(error);
    }
);

export default api;