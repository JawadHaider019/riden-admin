import React from 'react';
import { Link } from 'react-router-dom';

export default function Unauthorized() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col p-4">
            <div className="text-center">
                <div className="text-[#D10000] text-9xl font-black mb-4">403</div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Denied</h1>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    You don't have permission to access this module. If you believe this is an error, please contact the system administrator.
                </p>
                <Link
                    to="/"
                    className="inline-flex items-center justify-center px-8 py-3 bg-[#D10000] text-white font-bold rounded-full transition-transform hover:scale-105 shadow-lg shadow-red-100"
                >
                    Back to Dashboard
                </Link>
            </div>
        </div>
    );
}
