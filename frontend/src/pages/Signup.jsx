import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Lock, User, Phone, Mail } from 'lucide-react';
import { URBAN_BARANGAYS, RURAL_BARANGAYS } from '../data/barangays';

export default function Signup() {
    const [formData, setFormData] = useState({ username: '', email: '', phone_number: '+63', password: '', role: 'resident', barangay: URBAN_BARANGAYS[0] });
    const [idImage, setIdImage] = useState(null);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!idImage && formData.role !== 'admin') {
            alert('Please upload a copy of your Barangay ID for verification.');
            return;
        }

        const data = new FormData();
        data.append('username', formData.username);
        data.append('email', formData.email);
        data.append('phone_number', formData.phone_number);
        data.append('password', formData.password);
        data.append('role', formData.role);
        data.append('barangay', formData.barangay);
        if (idImage) data.append('id_image', idImage);

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                body: data, // Use FormData for multipart/form-data
            });

            const result = await response.json();
            if (response.ok) {
                alert('Registration Successful! Please login.');
                navigate('/login-Residence');
            } else {
                alert(result.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Signup error:', error);
            alert('Cannot connect to the server. Please ensure the backend is running.');
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
                <h2 className="text-2xl font-bold text-center text-slate-800 mb-1">Join EcoConnect</h2>
                <p className="text-center text-slate-500 text-sm mb-6">Start your journey as an Eco Warrior</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Email Address</label>
                        <div className="relative">
                            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                            <input
                                required
                                type="email"
                                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                                placeholder="john@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Username</label>
                        <div className="relative">
                            <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                            <input
                                required
                                type="text"
                                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                                placeholder="johndoe"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Phone Number (+63)</label>
                        <div className="relative">
                            <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                            <input
                                required
                                type="tel"
                                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-mono"
                                placeholder="+639123456789"
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
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Select Barangay</label>
                        <select
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                            value={formData.barangay}
                            onChange={(e) => setFormData({ ...formData, barangay: e.target.value })}
                        >
                            <optgroup label="Urban Barangays">
                                {URBAN_BARANGAYS.map(b => <option key={b} value={b}>{b}</option>)}
                            </optgroup>
                            <optgroup label="Rural Barangays">
                                {RURAL_BARANGAYS.map(b => <option key={b} value={b}>{b}</option>)}
                            </optgroup>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Password</label>
                        <div className="relative">
                            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                            <input
                                required
                                type="password"
                                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                    </div>

                    {formData.role === 'resident' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Upload Barangay ID</label>
                            <input
                                required
                                type="file"
                                accept="image/*"
                                onChange={(e) => setIdImage(e.target.files[0])}
                                className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 border border-dashed border-slate-300 p-2 rounded-xl"
                            />
                            <p className="text-[10px] text-slate-400 mt-1 ml-1">*Required for verification</p>
                        </div>
                    )}

                    <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95 mt-4">
                        Register Account
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-slate-600">
                    Already have an account?{' '}
                    <Link to="/login-Residence" className="text-green-600 hover:text-green-700 font-medium">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
