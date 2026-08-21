import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Phone, ShieldCheck, Lock, ArrowLeft, Loader2, User } from 'lucide-react';

export default function AdminForgotPassword() {
    const [step, setStep] = useState(1); // 1: Identifier, 2: OTP, 3: New Password
    const [identifier, setIdentifier] = useState('');
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
            setError('Terminal communication failure');
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
                alert('Admin password updated successfully.');
                navigate('/login-Barangay');
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError('Terminal communication failure');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <button
                    onClick={() => step === 1 ? navigate('/login-Barangay') : setStep(step - 1)}
                    className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors group text-sm font-medium"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    {step === 1 ? 'Back to Portal' : 'Previous Step'}
                </button>

                <div className="bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-700">
                    <div className="p-8 pb-0 text-center">
                        <div className="bg-red-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                            <Shield className="w-8 h-8 text-red-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-1">
                            {step === 1 ? 'Reset Password' : step === 2 ? 'Security Verification' : 'Define New Auth'}
                        </h1>
                        <p className="text-slate-400 text-sm">
                            {step === 1 ? 'Enter your registered admin phone or email' :
                                step === 2 ? `Validating 6-digit link sent to your email` :
                                    'Establish new secure credentials'}
                        </p>
                    </div>

                    <div className="p-8">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl text-center mb-6">
                                {error}
                            </div>
                        )}

                        {step === 1 && (
                            <form onSubmit={handleSendOTP} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Admin Identity</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                                        <input
                                            required
                                            type="text"
                                            placeholder="Phone or Email"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-3.5 pl-12 pr-4 text-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                                            value={identifier}
                                            onChange={(e) => setIdentifier(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <button
                                    disabled={loading || !identifier}
                                    className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Request OTP Overlay'}
                                </button>
                            </form>
                        )}

                        {step === 2 && (
                            <form onSubmit={(e) => { e.preventDefault(); setStep(3); }} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Terminal Code (6-Digit)</label>
                                    <div className="relative">
                                        <ShieldCheck className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                                        <input
                                            required
                                            maxLength={6}
                                            placeholder="000000"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-3.5 pl-12 pr-4 text-white focus:ring-2 focus:ring-red-500 outline-none transition-all font-mono text-center text-lg tracking-[0.5em]"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                        />
                                    </div>
                                </div>
                                <button
                                    disabled={otp.length !== 6}
                                    className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    Verify Security Code
                                </button>
                            </form>
                        )}

                        {step === 3 && (
                            <form onSubmit={handleResetPassword} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">New Terminal Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                                        <input
                                            required
                                            type="password"
                                            placeholder="••••••••"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-3.5 pl-12 pr-4 text-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <button
                                    disabled={loading || newPassword.length < 6}
                                    className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Override Old Passcode'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
