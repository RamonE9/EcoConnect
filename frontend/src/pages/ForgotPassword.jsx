import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Leaf, Phone, ShieldCheck, Lock, ArrowLeft, Loader2, User } from 'lucide-react';

export default function ForgotPassword() {
    const [step, setStep] = useState(1); // 1: Identifier, 2: OTP, 3: New Password
    const [identifier, setIdentifier] = useState(''); // Can be phone or email
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: identifier })
            });
            const data = await res.json();
            if (res.ok) {
                setStep(2);
                alert(data.message || 'OTP sent successfully!');
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: identifier,
                    otp_code: otp,
                    new_password: newPassword
                })
            });
            const data = await res.json();
            if (res.ok) {
                alert('Password reset successfully! Please login with your new password.');
                navigate('/login-Residence');
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-slate-100">
                <button
                    onClick={() => step === 1 ? navigate('/login-Residence') : setStep(step - 1)}
                    className="flex items-center gap-2 text-slate-400 hover:text-green-600 mb-6 transition-colors group text-sm font-medium"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    {step === 1 ? 'Back to Login' : 'Go Back'}
                </button>

                <div className="flex justify-center mb-6">
                    <div className="bg-green-100 p-3 rounded-2xl">
                        <Leaf className="w-8 h-8 text-green-600" />
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-center text-slate-800 mb-1">
                    {step === 1 ? 'Reset Password' : step === 2 ? 'Verify OTP' : 'New Password'}
                </h2>
                <p className="text-center text-slate-500 text-sm mb-8">
                    {step === 1 ? 'Enter your registered phone or email' :
                        step === 2 ? `Enter the 6-digit code sent to your email` :
                            'Set your new secure password'}
                </p>

                {error && (
                    <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-100 text-center mb-6">
                        {error}
                    </div>
                )}

                {step === 1 && (
                    <form onSubmit={handleSendOTP} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Phone or Email</label>
                            <div className="relative">
                                <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. +639... or john@email.com"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-slate-800 focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                />
                            </div>
                        </div>
                        <button
                            disabled={loading || !identifier}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-900/10 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send OTP Code'}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={(e) => { e.preventDefault(); setStep(3); }} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">6-Digit Code</label>
                            <div className="relative">
                                <ShieldCheck className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                                <input
                                    required
                                    maxLength={6}
                                    placeholder="000000"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-slate-800 focus:ring-2 focus:ring-green-500 outline-none transition-all font-mono text-center text-lg tracking-[0.5em]"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                />
                            </div>
                        </div>
                        <button
                            disabled={otp.length !== 6}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-900/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            Verify Code
                        </button>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handleResetPassword} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">New Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                                <input
                                    required
                                    type="password"
                                    placeholder="••••••••"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-slate-800 focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                            </div>
                        </div>
                        <button
                            disabled={loading || newPassword.length < 6}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-900/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
