import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, FileText, ArrowLeft } from 'lucide-react';

export default function CreateEvent() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        location: '',
        date: '',
        time: '',
        points_reward: 10
    });

    const handleUnauthorized = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        alert('Session expired. Please login again.');
        navigate('/login-Residence');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/events/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            if (res.status === 401) return handleUnauthorized();
            if (res.ok) {
                alert('Event created successfully!');
                navigate('/dashboard');
            } else {
                const data = await res.json();
                alert(data.message || 'Failed to create event');
            }
        } catch (error) {
            console.error('Error creating event:', error);
            alert('Server error');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4">
            <div className="max-w-xl mx-auto">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-slate-500 hover:text-green-600 mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </button>

                <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
                    <h1 className="text-2xl font-bold text-slate-800 mb-6">Host a Clean-up Drive</h1>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Event Title</label>
                            <input
                                required
                                type="text"
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                placeholder="e.g., Coastal Clean-up: Baywalk"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                            <textarea
                                required
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none h-24"
                                placeholder="What will happen during the event?"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            ></textarea>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                                <div className="relative">
                                    <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                    <input
                                        required
                                        type="date"
                                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                                <div className="relative">
                                    <Clock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                    <input
                                        required
                                        type="time"
                                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                        value={formData.time}
                                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                            <div className="relative">
                                <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                <input
                                    required
                                    type="text"
                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                    placeholder="e.g., Princesa Baywalk Park"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Points Reward</label>
                            <input
                                type="number"
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                value={formData.points_reward}
                                onChange={(e) => setFormData({ ...formData, points_reward: parseInt(e.target.value) })}
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all active:scale-95 mt-4"
                        >
                            Create Event
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
