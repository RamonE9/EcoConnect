import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Lock, User, Phone, ArrowLeft, Loader2, MapPin, Mail } from 'lucide-react';
import { URBAN_BARANGAYS, RURAL_BARANGAYS } from '../data/barangays';

export default function AdminSignup() {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        phone_number: '+63',
        password: '',
        role: 'admin',
        barangay: URBAN_BARANGAYS[0]
    });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const data = new FormData();
        data.append('username', formData.username);
        data.append('email', formData.email);
        data.append('phone_number', formData.phone_number);
        data.append('password', formData.password);
        data.append('role', formData.role);
        data.append('barangay', formData.barangay);

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                body: data,
            });

            const result = await response.json();
            if (response.ok) {
                alert('Admin Account Created! Please login to the terminal.');
                navigate('/login-Barangay');
            } else {
                alert(result.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Signup error:', error);
            alert('Cannot connect to the server. Please ensure the backend is running.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <button
                    onClick={() => navigate('/login-Barangay')}
                    className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Terminal Login
                </button>

                <div className="bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-700">
                    <div className="p-8 pb-0 text-center">
                        <div className="bg-red-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                            <Shield className="w-8 h-8 text-red-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-1">New Administrator</h1>
                        <p className="text-slate-400 text-sm">Register new access credentials</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Admin Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                                <input
                                    required
                                    type="email"
                                    placeholder="admin@example.com"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-slate-600 focus:ring-2 focus:ring-red-500 outline-none transition-all"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Admin Username</label>
                            <div className="relative">
                                <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. AdminControl"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-slate-600 focus:ring-2 focus:ring-red-500 outline-none transition-all"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Phone Number (+63)</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                                <input
                                    required
                                    type="tel"
                                    placeholder="+639XXXXXXXXX"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-slate-600 focus:ring-2 focus:ring-red-500 outline-none transition-all font-mono"
                                    value={formData.phone_number}
                                    onChange={(e) => {
                                        let val = e.target.value;
                                        if (!val.startsWith('+63')) val = '+63' + val.replace(/\D/g, '');
                                        setFormData({ ...formData, phone_number: val });
                                    }}
                                />
                            </div>
                        </div>


                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Assigned Barangay</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                                <select
                                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-3.5 pl-12 pr-4 text-white focus:ring-2 focus:ring-red-500 outline-none transition-all appearance-none"
                                    value={formData.barangay}
                                    onChange={(e) => setFormData({ ...formData, barangay: e.target.value })}
                                >
                                    <optgroup label="Urban Barangays" className="bg-slate-900">
                                        {URBAN_BARANGAYS.map(b => <option key={b} value={b}>{b}</option>)}
                                    </optgroup>
                                    <optgroup label="Rural Barangays" className="bg-slate-900">
                                        {RURAL_BARANGAYS.map(b => <option key={b} value={b}>{b}</option>)}
                                    </optgroup>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Secure Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                                <input
                                    required
                                    type="password"
                                    placeholder="••••••••"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-slate-600 focus:ring-2 focus:ring-red-500 outline-none transition-all"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>

                        <button
                            disabled={loading}
                            type="submit"
                            className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-red-900/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                'Register Administrator'
                            )}
                        </button>
                    </form>

                    <div className="p-6 bg-slate-900/50 border-t border-slate-700 text-center">
                        <p className="text-slate-400 text-sm">
                            Already have access?{' '}
                            <Link to="/login-Barangay" className="text-red-500 hover:text-red-400 font-medium">
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
