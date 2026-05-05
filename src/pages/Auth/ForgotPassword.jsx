import React from 'react';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative font-sans"
            style={{ backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('/assets/images/login.jpg')" }}>

            <div className="w-full max-w-[460px] bg-white/10 backdrop-blur-[25px] border border-white/15 rounded-[28px] p-12 shadow-2xl animate-fade-in relative z-10">
                <div className="text-center mb-8">
                    <div className="font-['Audiowide'] text-[56px] text-[#D10000] tracking-[1.5px] mb-1 leading-none">RIDEN</div>
                    <h2 className="text-2xl font-bold text-white mb-2">Reset Password</h2>
                    <p className="text-white/60 text-sm font-medium">Enter your email to receive a reset link</p>
                </div>

                <form className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Email Address</label>
                        <input
                            type="email"
                            className="w-full bg-red-400/10 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-4 focus:ring-red-600/20 focus:border-[#D10000] focus:bg-white/10 transition-all"
                            placeholder="name@riden.com"
                            required
                        />
                    </div>

                    <button className="w-full bg-[#D10000] hover:bg-[#D10000]/90 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-red-600/20 hover:-translate-y-0.5 transition-all text-base">
                        Send reset link
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-white/80">
                    Remember your password?{' '}
                    <Link to="/auth/login" className="text-white font-bold hover:underline">
                        Log In
                    </Link>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in { animation: fade-in 0.8s ease-out; }
            ` }} />
        </div>
    );
}
