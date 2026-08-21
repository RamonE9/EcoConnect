import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Lock, User } from 'lucide-react';
import { URBAN_BARANGAYS, RURAL_BARANGAYS } from '../data/barangays';

export default function Login() {
    const [formData, setFormData] = useState({ username: '', password: '', barangay: URBAN_BARANGAYS[0] });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const result = await response.json();
            if (response.ok) {
                localStorage.setItem('token', result.access_token);
                localStorage.setItem('user', JSON.stringify(result.user));
                navigate('/dashboard');
            } else {
                alert(result.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Cannot connect to the server. Please ensure the backend is running.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full">
                <div className="flex justify-center mb-6">
                    <div className="bg-green-100 p-3 rounded-full">
                        <Leaf className="w-8 h-8 text-green-600" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-center text-slate-800 mb-1">Welcome Back</h2>
                <p className="text-center text-slate-500 text-sm mb-8">Log in to your Eco Warrior portal</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Username</label>
                        <div className="relative">
                            <User className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                            <input
                                required
                                type="text"
                                className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm transition-all"
                                placeholder="Enter username"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2 ml-1">
                            <label className="block text-xs font-bold text-slate-400 uppercase">Password</label>
                            <Link to="/forgot-password" className="text-xs font-bold text-green-600 hover:text-green-700">Forgot Password?</Link>
                        </div>
                        <div className="relative">
                            <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                            <input
                                required
                                type="password"
                                className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm transition-all"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                    </div>

                    <button
                        disabled={loading}
                        type="submit"
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 mt-2"
                    >
                        {loading ? 'Logging in...' : 'Sign In'}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-slate-600">
                    Don't have an account?{' '}
                    <Link to="/signup" className="text-green-600 hover:text-green-700 font-medium">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
}
