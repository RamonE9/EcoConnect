import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Lock, User, ArrowLeft, Loader2, MapPin } from 'lucide-react';
import { URBAN_BARANGAYS, RURAL_BARANGAYS } from '../data/barangays';

export default function AdminLogin() {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        barangay: URBAN_BARANGAYS[0]
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const result = await response.json();
            if (response.ok) {
                if (result.user.role !== 'admin') {
                    setError('Access Denied: Not an admin account');
                    setLoading(false);
                    return;
                }
                localStorage.setItem('token', result.access_token);
                localStorage.setItem('user', JSON.stringify(result.user));
                navigate('/admin');
            } else {
                setError(result.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            setError('Cannot connect to the server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full">


                <div className="bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-700">
                    <div className="p-8 pb-0 text-center">
                        <div className="bg-red-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                            <Shield className="w-8 h-8 text-red-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-1">Command Center</h1>
                        <p className="text-slate-400 text-sm">Authorized Personnel Only</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm text-center">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Admin Username</label>
                            <div className="relative">
                                <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Enter username"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-slate-600 focus:ring-2 focus:ring-red-500 outline-none transition-all"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Secure Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-slate-600 focus:ring-2 focus:ring-red-500 outline-none transition-all"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end mt-2">
                                <Link to="/admin/forgot-password" className="text-xs font-medium text-red-500 hover:text-red-400">
                                    Override Passcode? (Forgot Password)
                                </Link>
                            </div>
                        </div>

                        <button
                            id="login-btn"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-red-900/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" /> Authenticating...
                                </>
                            ) : (
                                'Log in to Terminal'
                            )}
                        </button>

                    </form>

                    <div className="p-6 bg-slate-900/50 border-t border-slate-700 text-center space-y-3">
                        <p className="text-slate-400 text-sm">
                            New Controller?{' '}
                            <Link to="/admin/signup" className="text-red-500 hover:text-red-400 font-medium">
                                Register Terminal Account
                            </Link>
                        </p>
                        <p className="text-slate-500 text-xs">
                            This terminal logs all access attempts. Protected by JWT Encryption.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
