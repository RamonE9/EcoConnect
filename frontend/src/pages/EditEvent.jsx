import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, FileText, ArrowLeft, Save } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

function LocationMarker({ position, setPosition }) {
    useMapEvents({
        click(e) {
            setPosition(e.latlng);
        },
    });

    return position === null ? null : (
        <Marker position={position}></Marker>
    );
}

export default function EditEvent() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        location: '',
        date: '',
        time: '',
        points_reward: 10
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEvent();
    }, [eventId]);

    const handleUnauthorized = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        alert('Session expired. Please login again.');
        navigate('/login-Barangay');
    };

    const fetchEvent = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/events/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.status === 401) return handleUnauthorized();
            const allEvents = await res.json();
            const event = allEvents.find(e => e.id === parseInt(eventId));
            if (event) {
                setFormData(event);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/events/${eventId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            if (res.status === 401) return handleUnauthorized();
            if (res.ok) {
                alert('Event updated successfully!');
                navigate('/admin');
            } else {
                const data = await res.json();
                alert(data.message || 'Failed to update event');
            }
        } catch (error) {
            console.error('Error updating event:', error);
            alert('Server error');
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading event data...</div>;

    return (
        <div className="min-h-screen bg-slate-50 p-4">
            <div className="max-w-xl mx-auto">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-slate-500 hover:text-green-600 mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>

                <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
                    <h1 className="text-2xl font-bold text-slate-800 mb-6">Edit Event</h1>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Event Title</label>
                            <input
                                required
                                type="text"
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                            <textarea
                                required
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none h-24"
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
                            <label className="block text-sm font-medium text-slate-700 mb-1">Geographic Coordinates (Pin Location)</label>
                            <div className="rounded-xl overflow-hidden border border-slate-200 h-64 relative z-0">
                                <MapContainer
                                    center={formData.location && formData.location.includes(',') ? formData.location.split(',').map(Number) : [9.7392, 118.7357]}
                                    zoom={13}
                                    style={{ height: '100%', width: '100%' }}
                                >
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    <LocationMarker
                                        position={formData.location && formData.location.includes(',') ? formData.location.split(',').map(Number) : null}
                                        setPosition={(latlng) => setFormData({ ...formData, location: `${latlng.lat}, ${latlng.lng}` })}
                                    />
                                </MapContainer>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                Selected: {formData.location || 'Tap on map to set location'}
                            </p>
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
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all active:scale-95 mt-4 flex items-center justify-center gap-2"
                        >
                            <Save className="w-5 h-5" /> Save Changes
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
