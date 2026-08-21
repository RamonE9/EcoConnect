import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, MapPin, Calendar, Award, Leaf, Shield, Eye, X, Gift, Info, Menu, Users, ShoppingBag, ArrowRightLeft, Settings, Phone, Mail, Lock, History, Maximize2, Minimize2, Sparkles, Bot } from 'lucide-react';
import { URBAN_BARANGAYS } from '../data/barangays';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import ChatWidget from '../components/ChatWidget';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

export default function Dashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [events, setEvents] = useState([]);
    const [myEvents, setMyEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [redeeming, setRedeeming] = useState(false);
    const [officials, setOfficials] = useState([]);
    const [showOfficialsModal, setShowOfficialsModal] = useState(false);
    const [showRedeemModal, setShowRedeemModal] = useState(false);
    const [isMapMaximized, setIsMapMaximized] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState('Overview'); 
    const [transferRequests, setTransferRequests] = useState([]);
    const [transferLoading, setTransferLoading] = useState(false);
    const [transferTarget, setTransferTarget] = useState('');
    const [transferReason, setTransferReason] = useState('');
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [ecoTip, setEcoTip] = useState(null);
    const [smartReminders, setSmartReminders] = useState([]);
    const [profileFormData, setProfileFormData] = useState({ username: '', email: '', phone_number: '', password: '', profile_picture_file: null });
    const [updatingProfile, setUpdatingProfile] = useState(false);
    const [redemptionHistory, setRedemptionHistory] = useState([]);

    const REDEEM_CATALOG = [
        { id: 1, name: '1 Kilo of Rice', points: 50, icon: '🌾' },
        { id: 2, name: 'Canned Goods', points: 30, icon: '🥫' },
        { id: 3, name: 'School Supplies', points: 40, icon: '✏️' },
        { id: 4, name: 'Reusable Water Bottle', points: 60, icon: '🧴' },
    ];

    const getHeaders = (token) => {
        if (token === 'DEV_BYPASS_TOKEN') {
            return { 'X-Dev-Bypass': 'DEV_BYPASS_TOKEN', 'Content-Type': 'application/json' };
        }
        return { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    };

    useEffect(() => {
        let storedUser = localStorage.getItem('user');
        if (!storedUser || JSON.parse(storedUser).role === 'admin') {
            const devResident = {
                id: 100,
                username: 'Dev_Resident',
                role: 'resident',
                barangay: 'Santa Monica',
                points: 0,
                total_earned: 0,
                is_verified: true,
                email: 'resident@example.com',
                phone_number: '09123456789'
            };
            localStorage.setItem('user', JSON.stringify(devResident));
            localStorage.setItem('token', 'DEV_BYPASS_TOKEN');
            storedUser = JSON.stringify(devResident);
        }
        
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setProfileFormData({
            username: userData.username || '',
            email: userData.email || '',
            phone_number: userData.phone_number || '',
            password: ''
        });
        fetchData();
    }, [navigate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const eventsRes = await fetch('/api/events/', { headers: getHeaders(token) });
            if (eventsRes.status === 401) return handleUnauthorized();
            const eventsData = await eventsRes.json();
            setEvents(eventsData);

            if (token !== 'DEV_BYPASS_TOKEN') {
                const pRes = await fetch('/api/events/my-participation', { headers: getHeaders(token) });
                if (pRes.status === 401) return handleUnauthorized();
                setMyEvents(await pRes.json());

                const userRes = await fetch('/api/auth/me', { headers: getHeaders(token) });
                if (userRes.ok) {
                    const updatedUser = await userRes.json();
                    setUser(updatedUser);
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                }
            }

            const aiRes = await fetch('/api/ai/tips/', { headers: getHeaders(token) });
            if (aiRes.ok) setEcoTip(await aiRes.json());

            const officialsRes = await fetch('/api/auth/barangay/officials', { headers: getHeaders(token) });
            if (officialsRes.ok) setOfficials(await officialsRes.json());

            const redRes = await fetch('/api/finance/redemption/history', { headers: getHeaders(token) });
            if (redRes.ok) setRedemptionHistory(await redRes.json());

            const transferRes = await fetch('/api/auth/transfer/my-requests', { headers: getHeaders(token) });
            if (transferRes.ok) setTransferRequests(await transferRes.json());

            const remindRes = await fetch('/api/ai/reminders/', { headers: getHeaders(token) });
            if (remindRes.ok) setSmartReminders(await remindRes.json());
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async (eventId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/events/join/${eventId}`, {
                method: 'POST',
                headers: getHeaders(token)
            });
            if (res.status === 401) return handleUnauthorized();
            if (res.ok) fetchData();
            else {
                const data = await res.json();
                alert(data.message);
            }
        } catch (error) {
            console.error('Error joining event:', error);
        }
    };

    const handleRedeem = async (item) => {
        if (!window.confirm(`Redeem ${item.name} for ${item.points} points?`)) return;
        setRedeeming(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/finance/redemption/request', {
                method: 'POST',
                headers: getHeaders(token),
                body: JSON.stringify({ item_name: item.name, points_spent: item.points })
            });
            if (res.status === 401) return handleUnauthorized();
            if (res.ok) {
                alert(`Success! You have redeemed ${item.name}.`);
                fetchData();
                setShowRedeemModal(false);
            } else {
                const data = await res.json();
                alert(data.message);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setRedeeming(false);
        }
    };

    const handleRequestTransfer = async (e) => {
        e.preventDefault();
        if (!transferTarget) return alert('Select a target barangay');
        setTransferLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/auth/transfer/request', {
                method: 'POST',
                headers: getHeaders(token),
                body: JSON.stringify({ target_barangay: transferTarget, reason: transferReason })
            });
            if (res.ok) {
                alert('Transfer request submitted!');
                setTransferTarget('');
                setTransferReason('');
                fetchData();
            } else {
                const data = await res.json();
                alert(data.message);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setTransferLoading(false);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setUpdatingProfile(true);
        try {
            const token = localStorage.getItem('token');
            const data = new FormData();
            data.append('username', profileFormData.username);
            data.append('email', profileFormData.email);
            data.append('phone_number', profileFormData.phone_number);
            if (profileFormData.password) data.append('password', profileFormData.password);
            if (profileFormData.profile_picture_file) {
                data.append('profile_picture', profileFormData.profile_picture_file);
            }

            const res = await fetch('/api/auth/profile/update', {
                method: 'POST',
                headers: { 
                    'Authorization': token !== 'DEV_BYPASS_TOKEN' ? `Bearer ${token}` : '',
                    'X-Dev-Bypass': token === 'DEV_BYPASS_TOKEN' ? 'DEV_BYPASS_TOKEN' : ''
                },
                body: data
            });
            const result = await res.json();
            if (res.ok) {
                alert('Profile updated!');
                setUser(result.user);
                localStorage.setItem('user', JSON.stringify(result.user));
                setShowProfileModal(false);
                setProfileFormData({ ...profileFormData, password: '', profile_picture_file: null });
            } else alert(result.message);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setUpdatingProfile(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login-Residence');
    };

    const handleUnauthorized = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login-Residence');
    };

    if (!user) return null;
    const isJoined = (eventId) => myEvents.some(p => p.event_id === eventId);
    const isAnyModalOpen = showOfficialsModal || showRedeemModal || showProfileModal || selectedEvent || isMapMaximized;

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
            <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-slate-200 transition-all duration-300 flex flex-col z-20`}>
                <div className="p-6 flex items-center gap-3">
                    <div className="bg-green-600 p-2 rounded-xl text-white shadow-lg shadow-green-200">
                        <Leaf className="w-6 h-6" />
                    </div>
                    {isSidebarOpen && <span className="font-extrabold text-xl tracking-tighter text-slate-800">EcoConnect</span>}
                </div>

                <nav className="flex-1 px-4 mt-4 space-y-2">
                    <SidebarItem icon={<Calendar className="w-5 h-5" />} label="Overview" active={activeTab === 'Overview'} isOpen={isSidebarOpen} onClick={() => setActiveTab('Overview')} />
                    <SidebarItem icon={<Users className="w-5 h-5" />} label="Officials" active={activeTab === 'Officials'} isOpen={isSidebarOpen} onClick={() => setShowOfficialsModal(true)} />
                    <SidebarItem icon={<ShoppingBag className="w-5 h-5" />} label="Rewards" active={activeTab === 'Redeem'} isOpen={isSidebarOpen} onClick={() => setShowRedeemModal(true)} />
                    <SidebarItem icon={<User className="w-5 h-5" />} label="Profile" active={activeTab === 'Profile'} isOpen={isSidebarOpen} onClick={() => { setProfileFormData({username: user.username, email: user.email||'', phone_number: user.phone_number||'', password: ''}); setShowProfileModal(true); }} />
                    <SidebarItem icon={<ArrowRightLeft className="w-5 h-5" />} label="Transfer" active={activeTab === 'Transfer'} isOpen={isSidebarOpen} onClick={() => setActiveTab('Transfer')} />
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <button onClick={handleLogout} className={`w-full flex items-center ${isSidebarOpen ? 'justify-start px-4' : 'justify-center'} py-3 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all gap-3`}>
                        <LogOut className="w-5 h-5" />
                        {isSidebarOpen && <span className="font-semibold text-sm">Sign Out</span>}
                    </button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
                            <Menu className="w-5 h-5" />
                        </button>
                        <div>
                            <h2 className="text-sm font-bold text-green-600 uppercase tracking-widest">Citizen Portal</h2>
                            <p className="text-xl font-extrabold text-slate-800 tracking-tight">Welcome, {user.username}!</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-green-50 px-5 py-2.5 rounded-2xl border border-green-100">
                        <MapPin className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-black text-green-700 uppercase tracking-tighter">{user.barangay}</span>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="max-w-6xl mx-auto">
                        {activeTab === 'Overview' ? (
                            <div className="flex flex-col lg:flex-row gap-8">
                                <div className="flex-1 space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <StatCard icon={<Award className="w-6 h-6" />} label="Eco Points" value={user.points} color="text-green-600" bg="bg-green-50" />
                                        <StatCard icon={<Calendar className="w-6 h-6" />} label="Drives" value={myEvents.length} color="text-blue-600" bg="bg-blue-50" />
                                    </div>

                                    {smartReminders.length > 0 && (
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                                <Sparkles className="w-4 h-4 text-amber-500" /> Smart Mission Briefing
                                            </h3>
                                            <div className="grid grid-cols-1 gap-4">
                                                {smartReminders.map((remind, idx) => (
                                                    <div key={idx} className="bg-white border-2 border-blue-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                                                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:rotate-12 transition-transform">
                                                            <Plus className="w-20 h-20 text-blue-600" />
                                                        </div>
                                                        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                                                            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 shrink-0">
                                                                <Calendar className="w-6 h-6 text-blue-600" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <h4 className="text-lg font-bold text-slate-800 leading-tight mb-1">{remind.event_title}</h4>
                                                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{remind.date} • {remind.time}</p>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2 md:max-w-[300px]">
                                                                {remind.suggested_tools.map((tool, tIdx) => (
                                                                    <span key={tIdx} className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-tight flex items-center gap-1.5 border border-slate-200">
                                                                        {tool}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {ecoTip && (
                                        <div className="bg-gradient-to-r from-green-500 to-emerald-400 p-6 rounded-3xl text-white shadow-xl shadow-green-500/20 flex gap-4 items-start relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                                <Sparkles className="w-32 h-32" />
                                            </div>
                                            <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm shrink-0 border border-white/20"><Bot className="w-8 h-8 text-white" /></div>
                                            <div className="relative z-10">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full border border-white/20">Eco-Intelligence</span>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-green-100">{ecoTip.level}</span>
                                                </div>
                                                <p className="text-lg font-bold leading-relaxed shadow-sm">{ecoTip.tip}</p>
                                            </div>
                                        </div>
                                    )}
                                    {!user.is_verified && (
                                        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex items-center gap-6 shadow-sm">
                                            <div className="bg-amber-100 p-4 rounded-2xl text-amber-600 animate-pulse"><Shield className="w-8 h-8" /></div>
                                            <div>
                                                <h4 className="text-lg font-bold text-amber-800">Verification Pending</h4>
                                                <p className="text-sm text-amber-700">Your ID is being reviewed by the barangay staff.</p>
                                            </div>
                                        </div>
                                    )}
                                    <section>
                                        <h2 className="text-2xl font-extrabold text-slate-800 mb-6 tracking-tighter">Available Cleanup Drives</h2>
                                        <div className="grid grid-cols-1 gap-6">
                                            {events.map(event => (
                                                <EventItem key={event.id} event={event} isJoined={isJoined(event.id)} onView={() => setSelectedEvent(event)} onJoin={() => handleJoin(event.id)} user={user} />
                                            ))}
                                        </div>
                                    </section>
                                </div>
                                <div className="w-full lg:w-96 space-y-8">
                                    <div className="bg-white rounded-4xl p-8 shadow-xl shadow-slate-100 border border-slate-100">
                                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Award className="w-5 h-5 text-amber-500" />Ecological Activity</h3>
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-500">Points Progress</span><span className="text-sm font-bold text-green-600">{user.points}/500</span></div>
                                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-1000" style={{ width: `${Math.min((user.points / 500) * 100, 100)}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`bg-white rounded-4xl p-4 shadow-xl shadow-slate-100 border border-slate-100 aspect-square overflow-hidden transition-all duration-500 relative group/map ${isAnyModalOpen && !isMapMaximized ? 'blur-md grayscale opacity-40 scale-95' : ''}`}>
                                        <MapContainer center={[9.7407, 118.7353]} zoom={13} style={{ height: '100%', width: '100%', borderRadius: '1.5rem' }} zoomControl={false}>
                                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                            {events.map(event => (
                                                <Marker key={event.id} position={[9.7407 + (Math.random() * 0.05), 118.7353 + (Math.random() * 0.05)]} />
                                            ))}
                                        </MapContainer>
                                        <button 
                                            onClick={() => setIsMapMaximized(true)}
                                            className="absolute top-6 right-6 z-[999] p-4 bg-slate-900 text-white rounded-2xl shadow-2xl border border-white/20 backdrop-blur-md transition-all active:scale-95 hover:bg-slate-800"
                                            title="Enlarge Map"
                                        >
                                            <Maximize2 className="w-6 h-6 text-green-400" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : activeTab === 'Transfer' ? (
                            <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-white rounded-4xl p-10 shadow-xl shadow-slate-100 border border-slate-100">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="bg-blue-600 p-4 rounded-3xl text-white shadow-lg shadow-blue-100"><ArrowRightLeft className="w-8 h-8" /></div>
                                        <div><h2 className="text-3xl font-black text-slate-800 tracking-tighter">Relocation Request</h2><p className="text-slate-400 font-medium">Request to transfer your residency.</p></div>
                                    </div>
                                    <form onSubmit={handleRequestTransfer} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2"><label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Current Barangay</label><div className="bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100 text-slate-400 font-bold">{user.barangay}</div></div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Target Barangay</label>
                                                <select value={transferTarget} onChange={(e) => setTransferTarget(e.target.value)} required className="w-full bg-white px-6 py-4 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-slate-800 appearance-none">
                                                    <option value="">Select Destination...</option>
                                                    {URBAN_BARANGAYS.map(b => (b !== user.barangay && <option key={b} value={b}>{b}</option>))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-2"><label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Reason</label><textarea value={transferReason} onChange={(e) => setTransferReason(e.target.value)} placeholder="Why are you moving?" rows="4" className="w-full bg-white px-6 py-4 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all font-medium text-slate-800 resize-none" /></div>
                                        <button type="submit" disabled={transferLoading} className="w-full bg-blue-600 text-white font-extrabold py-5 rounded-3xl hover:bg-blue-700 active:scale-95 transition-all text-lg shadow-xl shadow-blue-100 disabled:opacity-50">{transferLoading ? 'Submitting...' : 'Submit Transfer Request'}</button>
                                    </form>
                                    
                                    <div className="mt-12 space-y-6">
                                        <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">Request History</h3>
                                        <div className="grid grid-cols-1 gap-4">
                                            {transferRequests.length === 0 ? (
                                                <div className="bg-slate-50 rounded-3xl p-8 text-center border border-dashed border-slate-200">
                                                    <p className="text-slate-400 font-bold">No previous transfer requests.</p>
                                                </div>
                                            ) : (
                                                transferRequests.map(req => (
                                                    <div key={req.id} className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`p-3 rounded-2xl ${req.status === 'Approved' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}><ArrowRightLeft className="w-5 h-5" /></div>
                                                            <div><h4 className="font-bold text-slate-800">To: {req.target_barangay}</h4><p className="text-xs text-slate-400 font-bold">{new Date(req.created_at).toLocaleDateString()}</p></div>
                                                        </div>
                                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${req.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{req.status}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} onJoin={() => { handleJoin(selectedEvent.id); setSelectedEvent(null); }} isJoined={isJoined(selectedEvent.id)} user={user} />}
            {showRedeemModal && <RedeemModal catalog={REDEEM_CATALOG} points={user.points} totalPoints={user.total_earned} onClose={() => setShowRedeemModal(false)} onRedeem={handleRedeem} loading={redeeming} history={redemptionHistory} />}
            {showOfficialsModal && <OfficialsModal officials={officials} onClose={() => setShowOfficialsModal(false)} />}
            {showProfileModal && <ProfileModal formData={profileFormData} setFormData={setProfileFormData} onClose={() => setShowProfileModal(false)} onSubmit={handleUpdateProfile} loading={updatingProfile} user={user} />}
            
            <ChatWidget />

            {isMapMaximized && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[2000] p-4 md:p-12 flex flex-col animate-in fade-in duration-300">
                    <div className="flex justify-between items-center mb-6 text-white">
                        <div>
                            <h2 className="text-3xl font-black tracking-tighter">Strategic Deployment Map</h2>
                            <p className="text-slate-400 font-medium">Real-time event locations across the jurisdiction</p>
                        </div>
                        <button onClick={() => setIsMapMaximized(false)} className="p-4 bg-white/10 hover:bg-white/20 rounded-3xl transition-all active:scale-95 border border-white/10 shadow-2xl">
                            <Minimize2 className="w-8 h-8" />
                        </button>
                    </div>
                    <div className="flex-1 bg-white rounded-[48px] overflow-hidden shadow-2xl border-4 border-white/10">
                        <MapContainer center={[9.7407, 118.7353]} zoom={14} style={{ height: '100%', width: '100%' }}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            {events.map(event => (
                                <Marker key={event.id} position={[9.7407 + (Math.random() * 0.05), 118.7353 + (Math.random() * 0.05)]} />
                            ))}
                        </MapContainer>
                    </div>
                </div>
            )}
        </div>
    );
}

function SidebarItem({ icon, label, active, isOpen, onClick }) {
    return (
        <button onClick={onClick} className={`w-full flex items-center ${isOpen ? 'justify-start px-4' : 'justify-center'} py-3 rounded-2xl transition-all gap-3 ${active ? 'bg-green-50 text-green-600 shadow-sm shadow-green-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
            <div className={active ? 'text-green-600' : 'text-slate-400'}>{icon}</div>
            {isOpen && <span className="font-bold text-sm">{label}</span>}
        </button>
    );
}

function StatCard({ icon, label, value, color, bg }) {
    return (
        <div className={`${bg} p-6 rounded-4xl border border-white/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all group`}>
            <div className={`p-3 rounded-2xl bg-white w-fit mb-4 shadow-sm group-hover:scale-110 transition-transform ${color}`}>{icon}</div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</p>
            <p className={`text-3xl font-black ${color} tracking-tighter mt-1`}>{value}</p>
        </div>
    );
}

function EventItem({ event, isJoined, onView, onJoin, user }) {
    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center justify-between group hover:border-green-200 hover:shadow-xl hover:shadow-green-50/50 transition-all">
            <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-green-50 group-hover:text-green-500 transition-colors"><Calendar className="w-8 h-8" /></div>
                <div>
                    <h4 className="text-lg font-bold text-slate-800 group-hover:text-green-700 transition-colors">{event.title}</h4>
                    <div className="flex items-center gap-4 mt-1">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400"><MapPin className="w-3.5 h-3.5" /> {event.location}</span>
                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400"><Calendar className="w-3.5 h-3.5" /> {new Date(event.date).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button onClick={onView} className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-50 transition-colors">Details</button>
                {isJoined ? (
                    <span className="flex items-center gap-1.5 px-5 py-2.5 bg-green-50 text-green-600 rounded-xl font-bold text-sm border border-green-100"><Shield className="w-4 h-4" /> Joined</span>
                ) : (
                    <button onClick={onJoin} disabled={!user.is_verified} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-green-600 disabled:opacity-50 disabled:grayscale transition-all">Join Event</button>
                )}
            </div>
        </div>
    );
}

function EventDetailModal({ event, onClose, onJoin, isJoined, user }) {
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[1001]">
            <div className="bg-white rounded-5xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="relative h-48 bg-gradient-to-br from-green-600 to-emerald-400 p-8 flex items-end">
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white backdrop-blur-md transition-colors"><X className="w-6 h-6" /></button>
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tighter mb-2">{event.title}</h2>
                        <span className="px-3 py-1 bg-white/20 rounded-full text-white text-xs font-bold uppercase tracking-widest backdrop-blur-md border border-white/20">Cleanup Drive</span>
                    </div>
                </div>
                <div className="p-8 space-y-8">
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3"><div className="p-2.5 bg-slate-50 rounded-xl text-slate-400"><MapPin className="w-5 h-5" /></div><div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</p><p className="font-bold text-slate-800">{event.location}</p></div></div>
                            <div className="flex items-center gap-3"><div className="p-2.5 bg-slate-50 rounded-xl text-slate-400"><Calendar className="w-5 h-5" /></div><div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Schedule</p><p className="font-bold text-slate-800">{new Date(event.date).toLocaleDateString()}</p></div></div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3"><div className="p-2.5 bg-slate-50 rounded-xl text-slate-400"><Users className="w-5 h-5" /></div><div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Max Participants</p><p className="font-bold text-slate-800">{event.max_participants || 'No Limit'}</p></div></div>
                            <div className="flex items-center gap-3"><div className="p-2.5 bg-slate-50 rounded-xl text-slate-400"><Award className="w-5 h-5" /></div><div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Points Reward</p><p className="font-bold text-green-600">{event.points_reward || 0} pts</p></div></div>
                        </div>
                    </div>
                    <div><h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3">About the Event</h4><p className="text-slate-600 leading-relaxed font-medium">{event.description}</p></div>
                    <div className="flex gap-4 pt-4">
                        <button onClick={onClose} className="flex-1 px-8 py-4 bg-slate-100 text-slate-600 font-extrabold rounded-2xl hover:bg-slate-200 transition-colors">Close</button>
                        {isJoined ? (
                            <div className="flex-[1.5] py-4 bg-green-50 text-green-600 font-extrabold rounded-2xl border border-green-100 flex items-center justify-center gap-2">Joined Successfully</div>
                        ) : (
                            <button onClick={onJoin} disabled={!user.is_verified} className="flex-[1.5] px-8 py-4 bg-slate-900 text-white font-extrabold rounded-2xl hover:bg-green-600 shadow-xl shadow-slate-100 transition-all disabled:opacity-50">Confirm Participation</button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function RedeemModal({ catalog, points, totalPoints, onClose, onRedeem, loading, history=[] }) {
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[1001]">
            <div className="bg-white rounded-5xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[85vh]">
                {/* Catalog Section */}
                <div className="flex-1 flex flex-col border-r border-slate-50">
                    <div className="p-8 pb-6 flex justify-between items-center border-b border-slate-50">
                        <div>
                            <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Shop Rewards</h2>
                            <p className="text-sm font-medium text-slate-400">Redeem points for essential goods</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Your Balance</span>
                                <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-2xl border border-green-100 text-green-600 font-black text-xl">{points} <Award className="w-5 h-5" /></div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Earned</span>
                                <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100 text-blue-600 font-black text-xl">{totalPoints || 0} <Leaf className="w-5 h-5" /></div>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 gap-4 custom-scrollbar">
                        {catalog.map(item => (
                            <div key={item.id} className="bg-slate-50 rounded-4xl p-6 border border-slate-100 hover:border-green-300 hover:bg-white transition-all group flex items-center justify-between">
                                <div className="flex items-center gap-5">
                                    <div className="text-4xl group-hover:scale-125 transition-transform">{item.icon}</div>
                                    <div><h4 className="text-lg font-black text-slate-800">{item.name}</h4><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{item.points} Points Req.</p></div>
                                </div>
                                <button onClick={() => onRedeem(item)} disabled={loading || points < item.points} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-green-600 disabled:opacity-50 transition-all shadow-lg active:scale-95">Redeem</button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* History Section */}
                <div className="w-full md:w-96 bg-slate-50/50 flex flex-col">
                    <div className="p-8 pb-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-800 tracking-tight">Recent Claims</h3>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                        {history.length === 0 ? (
                            <div className="text-center py-12">
                                <History className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                                <p className="text-slate-400 text-sm font-medium">No redemptions yet.</p>
                            </div>
                        ) : (
                            history.map(r => (
                                <div key={r.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-slate-800 text-sm">{r.item_name}</h4>
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${r.status === 'Claimed' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                                            {r.status}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold">{new Date(r.timestamp).toLocaleDateString()} • -{r.points_spent} pts</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function OfficialsModal({ officials, onClose }) {
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[1001]">
            <div className="bg-white rounded-5xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[80vh] flex flex-col">
                <div className="p-8 pb-6 flex justify-between items-center border-b border-slate-50">
                    <div><h2 className="text-3xl font-black text-slate-800 tracking-tighter">Barangay Council</h2></div>
                    <button onClick={onClose} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors"><X className="w-6 h-6" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                    {officials.length === 0 ? <p className="text-center py-8 text-slate-400 font-bold">No officials listed.</p> : officials.map((o, idx) => (
                        <div key={idx} className="flex items-center gap-6 p-4 rounded-3xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-green-500 to-emerald-400 flex items-center justify-center text-white font-black text-xl shadow-md">{o.username.charAt(0).toUpperCase()}</div>
                            <div><h4 className="font-bold text-slate-800 text-lg uppercase">{o.username}</h4><p className="text-xs font-black text-green-600 uppercase tracking-widest">{o.position || 'COUNCIL MEMBER'}</p></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function ProfileModal({ formData, setFormData, onClose, onSubmit, loading, user }) {
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[1001] animate-in fade-in duration-300">
            <div className="bg-white rounded-5xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
                <div className="w-full md:w-64 bg-slate-50 p-8 border-r border-slate-100 flex flex-col items-center">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Identity Verification</h3>
                    <div className="space-y-6 w-full">
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-32 h-32 rounded-3xl bg-white border-2 border-slate-200 overflow-hidden shadow-inner relative group">
                                {user.profile_picture ? (
                                    <img src={`/${user.profile_picture}`} className="w-full h-full object-cover" alt="Profile" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-200"><User className="w-16 h-16" /></div>
                                )}
                                <label className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                    <span className="text-white text-[10px] font-bold uppercase tracking-tighter">Change Photo</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={e => setFormData({...formData, profile_picture_file: e.target.files[0]})} />
                                </label>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Profile Photo</p>
                        </div>
                        
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-full aspect-[1.58/1] rounded-2xl bg-white border-2 border-slate-200 overflow-hidden shadow-inner relative group">
                                {user.id_image ? (
                                    <img src={`/${user.id_image}`} className="w-full h-full object-cover" alt="Barangay ID" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-200"><Shield className="w-8 h-8" /></div>
                                )}
                                <a href={`/${user.id_image}`} target="_blank" rel="noreferrer" className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Eye className="text-white w-5 h-5" />
                                </a>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Barangay ID Card</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-8">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tighter">My Account</h2>
                            <p className="text-sm font-medium text-slate-400">Manage your personal information</p>
                        </div>
                        <button onClick={onClose} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors"><X className="w-6 h-6" /></button>
                    </div>
                    
                    <form onSubmit={onSubmit} className="space-y-5">
                        <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label><div className="relative"><User className="w-5 h-5 text-slate-300 absolute left-4 top-4" /><input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="w-full bg-slate-50 pl-12 pr-6 py-4 rounded-2xl border border-slate-100 focus:border-green-500 focus:ring-4 focus:ring-green-50 outline-none transition-all font-bold text-slate-800" required /></div></div>
                        <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label><div className="relative"><Mail className="w-5 h-5 text-slate-300 absolute left-4 top-4" /><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-slate-50 pl-12 pr-6 py-4 rounded-2xl border border-slate-100 focus:border-green-500 focus:ring-4 focus:ring-green-500 outline-none transition-all font-bold text-slate-800" required /></div></div>
                        <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</label><div className="relative"><Phone className="w-5 h-5 text-slate-300 absolute left-4 top-4" /><input type="text" value={formData.phone_number} onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })} className="w-full bg-slate-50 pl-12 pr-6 py-4 rounded-2xl border border-slate-100 focus:border-green-500 focus:ring-4 focus:ring-green-500 outline-none transition-all font-bold text-slate-800" required /></div></div>
                        <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label><div className="relative"><Lock className="w-5 h-5 text-slate-300 absolute left-4 top-4" /><input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="********" className="w-full bg-slate-50 pl-12 pr-6 py-4 rounded-2xl border border-slate-100 focus:border-green-500 focus:ring-4 focus:ring-green-500 outline-none transition-all font-bold text-slate-800" /></div></div>
                        
                        {formData.profile_picture_file && (
                            <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex items-center gap-3 animate-in slide-in-from-top-2">
                                <div className="p-2 bg-green-100 rounded-lg text-green-600"><Eye className="w-4 h-4" /></div>
                                <p className="text-xs font-bold text-green-700">New Photo Ready: {formData.profile_picture_file.name}</p>
                            </div>
                        )}

                        <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-extrabold py-5 rounded-3xl hover:bg-slate-800 transition-all text-lg shadow-xl shadow-slate-100 disabled:opacity-50 mt-4">{loading ? 'Saving Changes...' : 'Update Profile'}</button>
                    </form>
                </div>
            </div>
        </div>
    );
}
