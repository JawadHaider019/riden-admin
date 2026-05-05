import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginAdmin } from '../../api/auth';
import { useToast } from '@/components/UI';

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const { showToast } = useToast();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await loginAdmin(email, password);

            showToast('Login Successful', 'success');
            navigate('/');
        }
        catch (error) {
            showToast(error.response?.data?.message || 'Login failed', 'error');
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative font-sans"
            style={{ backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('/assets/images/login.jpg')" }}>

            <div className="w-full max-w-[460px] bg-white/10 backdrop-blur-[25px] border border-white/15 rounded-[28px] p-12 shadow-2xl animate-fade-in relative z-10">
                <div className="text-center mb-8">
                    <div className="font-['Audiowide'] text-[56px] text-[#D10000] tracking-[1.5px] mb-1 leading-none">RIDEN</div>
                    <h2 className="text-2xl font-bold text-white mb-2">Admin Login</h2>
                </div>

                <form className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Email Address</label>
                        <input
                            type="email"
                            className="w-full bg-red-400/10 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-4 focus:ring-red-600/20 focus:border-[#D10000] focus:bg-white/10 transition-all"
                            placeholder="name@riden.com"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                className="w-full bg-red-400/10 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-4 focus:ring-red-600/20 focus:border-[#D10000] focus:bg-white/10 transition-all"
                                placeholder="••••••••"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                            >
                                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'} text-lg`}></i>
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <label className="flex items-center gap-2 text-white/80 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 rounded border-white/15 bg-transparent text-[#D10000] focus:ring-0 focus:ring-offset-0" />
                            Keep me logged in
                        </label>
                        <Link to="/auth/forgot" className="text-white hover:text-white/80 font-medium transition-colors">
                            Forgot Password?
                        </Link>
                    </div>

                    <button onClick={handleLogin} className="w-full bg-[#D10000] hover:bg-[#D10000]/90 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-red-600/20 hover:-translate-y-0.5 transition-all text-base">
                        Login
                    </button>
                </form>

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
