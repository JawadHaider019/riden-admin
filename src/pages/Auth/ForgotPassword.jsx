import React from 'react';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a0a] relative font-sans overflow-hidden">
            {/* Background Decoration: Gradient Blobs */}
            <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-[#D10000] opacity-[0.15] rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-[#D10000] opacity-[0.1] rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>

            <div className="w-full max-w-[460px] bg-black/40 backdrop-blur-[25px] border border-white/10 rounded-[32px] p-10 md:p-12 shadow-[0_0_80px_rgba(209,0,0,0.15)] animate-fade-in relative z-10">
                <div className="text-center mb-10">
                    <div className="font-['Audiowide'] text-[56px] tracking-[2px] mb-2 leading-none 
                        bg-gradient-to-b from-[#ff4d4d] via-[#D10000] to-[#800000] bg-clip-text text-transparent
                        drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
                        RIDEN
                    </div>
                    <h2 className="text-2xl font-[600] text-white/90 tracking-tight">Reset Password</h2>
                    <p className="text-white/40 text-sm mt-1 uppercase tracking-widest font-[500]">Secure Access Only</p>
                </div>

                <form className="space-y-6">
                    <div>
                        <label className="block text-[13px] font-[600] text-white/50 mb-2 uppercase tracking-wider">Email Address</label>
                        <input
                            type="email"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 outline-none focus:ring-4 focus:ring-[#D10000]/20 focus:border-[#D10000]/50 focus:bg-white/10 transition-all duration-300"
                            placeholder="name@riden.com"
                            required
                        />
                    </div>

                    <button className="w-full bg-[#D10000] hover:bg-[#A30000] text-white font-[700] py-4.5 rounded-2xl shadow-[0_8px_25px_rgba(209,0,0,0.3)] hover:shadow-[0_12px_35px_rgba(209,0,0,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all text-[15px] uppercase tracking-wider mt-4">
                        Send reset link
                    </button>
                </form>

                <div className="mt-8 text-center text-sm">
                    <span className="text-white/40">Remember your password?</span>{' '}
                    <Link to="/auth/login" className="text-[#D10000] font-[600] hover:text-[#ff4d4d] transition-colors ml-1">
                        Go back to Login
                    </Link>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in { animation: fade-in 1s cubic-bezier(0.16, 1, 0.3, 1); }
            ` }} />
        </div>
    );
}
