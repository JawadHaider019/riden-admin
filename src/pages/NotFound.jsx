import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] flex-col p-4 font-sans relative overflow-hidden">
            {/* Background minimalist decor */}
            <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-red-50 rounded-full opacity-50 blur-3xl"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[300px] h-[300px] bg-red-50 rounded-full opacity-50 blur-3xl"></div>

            <div className="text-center relative z-10">
                <div className="relative inline-block mb-8">
                    <div className="text-[#D10000] text-[180px] font-black leading-none select-none opacity-10 blur-[2px] absolute inset-0 -translate-y-4">404</div>
                    <div className="text-[#D10000] text-[150px] font-black leading-none drop-shadow-xl">404</div>
                </div>

                <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">Lost in the Ride?</h1>
                <p className="text-gray-500 mb-10 max-w-md mx-auto text-lg leading-relaxed">
                    The page you're looking for doesn't exist or has been moved to another location.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center px-10 py-4 bg-[#D10000] text-white font-bold rounded-xl transition-all hover:bg-[#b00000] hover:-translate-y-1 shadow-lg shadow-red-200 active:scale-95"
                    >
                        <i className="bi bi-house-door mr-2"></i>
                        Return Home
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center justify-center px-10 py-4 bg-white text-gray-700 font-bold rounded-xl border border-gray-200 transition-all hover:bg-gray-50 hover:-translate-y-1 active:scale-95"
                    >
                        <i className="bi bi-arrow-left mr-2"></i>
                        Go Back
                    </button>
                </div>
            </div>

            {/* Logo watermark */}
            <div className="mt-16 font-['Audiowide'] text-[#D10000] text-2xl tracking-[4px] opacity-20">
                RIDEN
            </div>
        </div>
    );
}
