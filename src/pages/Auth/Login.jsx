import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginAdmin } from '../../api/auth';
import { useToast, Loader } from '@/components/UI';

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await loginAdmin(email, password);

            showToast('Login Successful', 'success');
            navigate('/');
        }
        catch (error) {
            showToast(error.response?.data?.message || 'Login failed', 'error');
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            {loading && <Loader />}
            <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a0a] relative font-sans overflow-hidden">
                {/* Background Decoration: Gradient Blobs */}
                <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-[#D10000] opacity-[0.8] rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-[#D10000] opacity-[0.5] rounded-full blur-[100px]"></div>

                <div className="w-full max-w-[460px] bg-black/40 backdrop-blur-[25px] border border-white/10 rounded-[32px] p-10 md:p-12 shadow-[0_0_80px_rgba(209,0,0,0.15)] animate-fade-in relative z-10">
                    <div className="text-center mb-10">
                        <div className="font-['Audiowide'] text-[56px] tracking-[2px] mb-2 leading-none 
                            bg-gradient-to-b from-[#ff4d4d] via-[#D10000] to-[#800000] bg-clip-text text-transparent
                            drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
                            RIDEN
                        </div>
                        <h2 className="text-2xl font-[600] text-white/90 tracking-tight">Admin Portal</h2>
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
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-[13px] font-[600] text-white/50 mb-2 uppercase tracking-wider">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 outline-none focus:ring-4 focus:ring-[#D10000]/20 focus:border-[#D10000]/50 focus:bg-white/10 transition-all duration-300"
                                    placeholder="••••••••"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                                >
                                    <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'} text-xl`}></i>
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm pt-2">

                            <Link to="/auth/forgot" className="text-[#D10000] hover:text-[#ff4d4d] font-[600] transition-colors">
                                Reset Password?
                            </Link>
                        </div>

                        <button onClick={handleLogin} className="w-full bg-[#D10000] hover:bg-[#A30000] text-white font-[700] py-4.5 rounded-2xl shadow-[0_8px_25px_rgba(209,0,0,0.3)] hover:shadow-[0_12px_35px_rgba(209,0,0,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all text-[15px] uppercase tracking-wider mt-4">
                            Log In to Dashboard
                        </button>
                    </form>

                </div>


            </div>

        </>
    );
}
