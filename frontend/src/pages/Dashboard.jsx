import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, MapPin, Calendar, Award, Leaf, Shield, Eye, X, Gift, Info, Menu, Users, ShoppingBag, ArrowRightLeft, Settings, Phone, Mail, Lock, History, Sparkles, Bot, Plus, CheckCircle2 } from 'lucide-react';
import { URBAN_BARANGAYS } from '../data/barangays';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
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
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
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
    const [photoTs, setPhotoTs] = useState(Date.now()); // cache-bust profile photo

    const REDEEM_CATALOG = [
        { id: 1, name: '1 Kilo of Rice', points: 50, icon: '🌾' },
        { id: 2, name: 'Canned Goods', points: 30, icon: '🥫' },
        { id: 3, name: 'School Supplies', points: 40, icon: '✏️' },
        { id: 4, name: 'Reusable Water Bottle', points: 60, icon: '🧴' },
    ];

    const getHeaders = (token) => {
        return { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (!storedUser || !token || token === 'DEV_BYPASS_TOKEN') {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            navigate('/login-Residence');
            return;
        }

        try {
            const userData = JSON.parse(storedUser);
            setUser(userData);
            setProfileFormData({
                username: userData.username || '',
                email: userData.email || '',
                phone_number: userData.phone_number || '',
                password: ''
            });
            fetchData();
        } catch {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            navigate('/login-Residence');
        }
    }, [navigate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const eventsRes = await fetch('/api/events/', { headers: getHeaders(token) });
            if (eventsRes.status === 401) return handleUnauthorized();
            const eventsData = await eventsRes.json();
            setEvents(eventsData);

            const pRes = await fetch('/api/events/my-participation', { headers: getHeaders(token) });
            if (pRes.status === 401) return handleUnauthorized();
            setMyEvents(await pRes.json());

            const userRes = await fetch('/api/auth/me', { headers: getHeaders(token) });
            if (userRes.ok) {
                const updatedUser = await userRes.json();
                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
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
                setPhotoTs(Date.now()); // force browser to re-fetch the new image
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
    const isJoined = (eventId) => myEvents.some((participation) => {
        const joinedEventId = typeof participation.event === 'object'
            ? participation.event?.id
            : participation.event;
        return joinedEventId === eventId;
    });

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
            {/* Mobile Drawer Backdrop */}
            {isMobileDrawerOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 lg:hidden"
                    onClick={() => setIsMobileDrawerOpen(false)}
                />
            )}

            <aside className={`
                fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200
                transform transition-all duration-300 ease-in-out lg:static lg:translate-x-0
                ${isMobileDrawerOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
                ${isSidebarOpen ? 'lg:w-64' : 'lg:w-20'}
                flex flex-col
            `}>
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-600 p-2 rounded-xl text-white shadow-lg shadow-green-200 shrink-0">
                            <Leaf className="w-6 h-6" />
                        </div>
                        {(isSidebarOpen || isMobileDrawerOpen) && (
                            <span className="font-extrabold text-xl tracking-tighter text-slate-800">EcoConnect</span>
                        )}
                    </div>
                    <button
                        onClick={() => setIsMobileDrawerOpen(false)}
                        className="lg:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-400"
                        aria-label="Close menu"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="flex-1 px-4 mt-4 space-y-2">
                    <SidebarItem icon={<Calendar className="w-5 h-5" />} label="Overview" active={activeTab === 'Overview'} isOpen={isSidebarOpen || isMobileDrawerOpen} onClick={() => { setActiveTab('Overview'); setIsMobileDrawerOpen(false); }} />
                    <SidebarItem icon={<Users className="w-5 h-5" />} label="Officials" active={activeTab === 'Officials'} isOpen={isSidebarOpen || isMobileDrawerOpen} onClick={() => { setShowOfficialsModal(true); setIsMobileDrawerOpen(false); }} />
                    <SidebarItem icon={<ShoppingBag className="w-5 h-5" />} label="Rewards" active={activeTab === 'Redeem'} isOpen={isSidebarOpen || isMobileDrawerOpen} onClick={() => { setShowRedeemModal(true); setIsMobileDrawerOpen(false); }} />
                    <SidebarItem icon={<User className="w-5 h-5" />} label="Profile" active={activeTab === 'Profile'} isOpen={isSidebarOpen || isMobileDrawerOpen} onClick={() => { setProfileFormData({username: user.username, email: user.email||'', phone_number: user.phone_number||'', password: ''}); setShowProfileModal(true); setIsMobileDrawerOpen(false); }} />
                    <SidebarItem icon={<ArrowRightLeft className="w-5 h-5" />} label="Transfer" active={activeTab === 'Transfer'} isOpen={isSidebarOpen || isMobileDrawerOpen} onClick={() => { setActiveTab('Transfer'); setIsMobileDrawerOpen(false); }} />
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <button onClick={handleLogout} className={`w-full flex items-center ${(isSidebarOpen || isMobileDrawerOpen) ? 'justify-start px-4' : 'justify-center'} py-3 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all gap-3`}>
                        <LogOut className="w-5 h-5 shrink-0" />
                        {(isSidebarOpen || isMobileDrawerOpen) && <span className="font-semibold text-sm">Sign Out</span>}
                    </button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-16 sm:h-20 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between z-10 shrink-0">
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <button onClick={() => setIsMobileDrawerOpen(true)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-600 lg:hidden" aria-label="Open menu">
                            <Menu className="w-5 h-5" />
                        </button>
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hidden lg:flex p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500" aria-label="Toggle sidebar">
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="min-w-0">
                            <h2 className="text-[10px] sm:text-xs font-black text-green-600 uppercase tracking-widest">Citizen Portal</h2>
                            <p className="text-base sm:text-xl font-extrabold text-slate-800 tracking-tight truncate">Welcome, {user.username}!</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-3 bg-green-50 px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-2xl border border-green-100 shrink-0">
                        <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 shrink-0" />
                        <span className="text-xs sm:text-sm font-black text-green-700 uppercase tracking-tighter truncate max-w-[110px] sm:max-w-none">{user.barangay}</span>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-28 lg:pb-8 custom-scrollbar">
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
                                <div className="w-full lg:w-80 space-y-6">
                                    <div className="bg-white rounded-3xl sm:rounded-4xl p-6 sm:p-8 shadow-sm border border-slate-100">
                                        <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Award className="w-5 h-5 text-amber-500" />Ecological Activity</h3>
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-500">Points Progress</span><span className="text-sm font-bold text-green-600">{user.points}/500</span></div>
                                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-1000" style={{ width: `${Math.min((user.points / 500) * 100, 100)}%` }} />
                                            </div>
                                            <button
                                                onClick={() => setShowRedeemModal(true)}
                                                className="w-full py-3 bg-green-50 hover:bg-green-100 text-green-700 font-bold text-xs uppercase tracking-wider rounded-2xl transition-all border border-green-200/60 flex items-center justify-center gap-2 active:scale-95"
                                            >
                                                <ShoppingBag className="w-4 h-4" /> Redeem Rewards
                                            </button>
                                        </div>
                                    </div>

                                    {/* My Registered Cleanup Drives */}
                                    <div className="bg-white rounded-3xl sm:rounded-4xl p-6 sm:p-8 shadow-sm border border-slate-100">
                                        <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <Calendar className="w-5 h-5 text-green-600" /> My Joined Drives
                                        </h3>
                                        {myEvents.length === 0 ? (
                                            <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                                                <p className="text-xs text-slate-400 font-medium">You haven't joined any cleanup drives yet.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                                                {myEvents.map((p, idx) => {
                                                    const ev = typeof p.event === 'object' ? p.event : events.find(e => e.id === p.event);
                                                    return (
                                                        <div key={idx} className="p-3.5 bg-slate-50 hover:bg-green-50/50 rounded-2xl border border-slate-100 transition-all flex items-center justify-between gap-2">
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-bold text-slate-800 truncate">{ev?.title || 'Cleanup Activity'}</p>
                                                                <p className="text-[10px] text-slate-400 font-medium">{ev?.date || 'Upcoming'}</p>
                                                            </div>
                                                            <span className="text-[10px] font-black uppercase text-green-600 bg-green-100 px-2 py-0.5 rounded-md shrink-0">
                                                                Joined
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
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
            {showProfileModal && <ProfileModal formData={profileFormData} setFormData={setProfileFormData} onClose={() => setShowProfileModal(false)} onSubmit={handleUpdateProfile} loading={updatingProfile} user={user} photoTs={photoTs} />}
            
            <ChatWidget />

            {/* Mobile Bottom Navigation Bar for Phone / PWA Viewport */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-3 py-2 flex items-center justify-around shadow-lg pb-safe">
                <button
                    onClick={() => { setActiveTab('Overview'); setIsMobileDrawerOpen(false); }}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'Overview' && !showRedeemModal ? 'text-green-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    <Calendar className="w-5 h-5" />
                    <span className="text-[10px]">Overview</span>
                </button>
                <button
                    onClick={() => { setShowRedeemModal(true); setIsMobileDrawerOpen(false); }}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${showRedeemModal ? 'text-green-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    <ShoppingBag className="w-5 h-5" />
                    <span className="text-[10px]">Rewards</span>
                </button>
                <button
                    onClick={() => { setActiveTab('Transfer'); setIsMobileDrawerOpen(false); }}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'Transfer' ? 'text-green-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    <ArrowRightLeft className="w-5 h-5" />
                    <span className="text-[10px]">Transfer</span>
                </button>
                <button
                    onClick={() => {
                        setProfileFormData({ username: user.username, email: user.email || '', phone_number: user.phone_number || '', password: '' });
                        setShowProfileModal(true);
                        setIsMobileDrawerOpen(false);
                    }}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${showProfileModal ? 'text-green-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    <User className="w-5 h-5" />
                    <span className="text-[10px]">Profile</span>
                </button>
                <button
                    onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all text-slate-500 hover:text-slate-800"
                >
                    <Menu className="w-5 h-5" />
                    <span className="text-[10px]">Menu</span>
                </button>
            </nav>
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

function parseEventCoordinates(locationStr) {
    if (!locationStr) return [9.7407, 118.7353];
    const parts = locationStr.split(',').map(s => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] >= -90 && parts[0] <= 90 && parts[1] >= -180 && parts[1] <= 180) {
        return parts;
    }
    return [9.7407, 118.7353];
}

function EventItem({ event, isJoined, onView, onJoin, user }) {
    return (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-green-200 hover:shadow-xl hover:shadow-green-50/50 transition-all">
            <div className="flex items-start sm:items-center gap-4 sm:gap-6 min-w-0">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-green-50 group-hover:text-green-500 transition-colors shrink-0">
                    <Calendar className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <div className="min-w-0">
                    <h4 className="text-base sm:text-lg font-bold text-slate-800 group-hover:text-green-700 transition-colors truncate">
                        {event.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                            <MapPin className="w-3.5 h-3.5 text-green-600 shrink-0" />
                            <span className="truncate max-w-[140px] sm:max-w-none">{event.location}</span>
                        </span>
                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                            <Calendar className="w-3.5 h-3.5 shrink-0" /> {new Date(event.date).toLocaleDateString()}
                        </span>
                        {event.points_reward && (
                            <span className="flex items-center gap-1 text-[11px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-md">
                                +{event.points_reward} pts
                            </span>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-50">
                <button
                    onClick={onView}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors text-center"
                >
                    Details & Map
                </button>
                {isJoined ? (
                    <span className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-green-50 text-green-600 rounded-xl font-bold text-xs sm:text-sm border border-green-100">
                        <Shield className="w-4 h-4" /> Joined
                    </span>
                ) : (
                    <button
                        onClick={onJoin}
                        disabled={!user.is_verified}
                        className="flex-1 sm:flex-none px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs sm:text-sm hover:bg-green-600 disabled:opacity-50 disabled:grayscale transition-all text-center"
                    >
                        Join Event
                    </button>
                )}
            </div>
        </div>
    );
}

function EventDetailModal({ event, onClose, onJoin, isJoined, user }) {
    const coords = parseEventCoordinates(event.location);

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-[1001] animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl sm:rounded-5xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
                {/* Header Banner */}
                <div className="relative h-36 sm:h-44 bg-gradient-to-br from-green-600 to-emerald-400 p-6 sm:p-8 flex items-end shrink-0">
                    <button
                        onClick={onClose}
                        className="absolute top-4 sm:top-6 right-4 sm:right-6 p-2 bg-white/20 hover:bg-white/30 rounded-full sm:rounded-xl text-white backdrop-blur-md transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                    <div>
                        <span className="px-3 py-1 bg-white/20 rounded-full text-white text-[10px] font-bold uppercase tracking-widest backdrop-blur-md border border-white/20">
                            Cleanup Drive
                        </span>
                        <h2 className="text-xl sm:text-3xl font-black text-white tracking-tighter mt-1 truncate">
                            {event.title}
                        </h2>
                    </div>
                </div>

                {/* Scrollable Body */}
                <div className="p-5 sm:p-8 overflow-y-auto space-y-6 custom-scrollbar">
                    <div className="grid grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400 shrink-0"><MapPin className="w-5 h-5 text-green-600" /></div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</p>
                                    <p className="font-bold text-slate-800 text-xs sm:text-sm truncate">{event.barangay || 'Puerto Princesa'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400 shrink-0"><Calendar className="w-5 h-5 text-blue-600" /></div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Schedule</p>
                                    <p className="font-bold text-slate-800 text-xs sm:text-sm">{new Date(event.date).toLocaleDateString()} {event.time ? `• ${event.time}` : ''}</p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400 shrink-0"><Users className="w-5 h-5 text-amber-500" /></div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Max Volunteers</p>
                                    <p className="font-bold text-slate-800 text-xs sm:text-sm">{event.max_participants || 'No Limit'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400 shrink-0"><Award className="w-5 h-5 text-green-600" /></div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Points Reward</p>
                                    <p className="font-bold text-green-600 text-xs sm:text-sm">{event.points_reward || 0} pts</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pinned Coordinates Map */}
                    <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs sm:text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 text-green-600" /> Activity Location (Pinned Map)
                            </h4>
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${coords[0]},${coords[1]}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-bold text-green-600 hover:text-green-700 hover:underline flex items-center gap-1"
                            >
                                Directions ↗
                            </a>
                        </div>
                        <div className="h-52 sm:h-64 w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200 relative z-0 shadow-inner">
                            <MapContainer
                                key={`event-map-${event.id}-${coords[0]}-${coords[1]}`}
                                center={coords}
                                zoom={15}
                                scrollWheelZoom={false}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <Marker position={coords}>
                                    <Popup>
                                        <div className="p-1 text-xs">
                                            <p className="font-bold text-slate-800">{event.title}</p>
                                            <p className="text-slate-500">{event.barangay || 'Puerto Princesa'}</p>
                                            <p className="text-[10px] font-mono text-slate-400 mt-1">{coords[0].toFixed(5)}, {coords[1].toFixed(5)}</p>
                                        </div>
                                    </Popup>
                                </Marker>
                            </MapContainer>
                        </div>
                        <p className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                            <span>GPS: {coords[0].toFixed(5)}, {coords[1].toFixed(5)}</span>
                            {event.barangay && <span className="font-sans font-bold text-slate-500">{event.barangay}</span>}
                        </p>
                    </div>

                    <div>
                        <h4 className="text-xs sm:text-sm font-black text-slate-400 uppercase tracking-widest mb-2">About the Event</h4>
                        <p className="text-slate-600 leading-relaxed font-medium text-xs sm:text-sm">{event.description}</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 sm:px-8 py-3.5 bg-white border border-slate-200 text-slate-600 font-extrabold rounded-2xl hover:bg-slate-100 transition-colors text-xs sm:text-sm"
                    >
                        Close
                    </button>
                    {isJoined ? (
                        <div className="flex-[1.5] py-3.5 bg-green-50 text-green-600 font-extrabold rounded-2xl border border-green-100 flex items-center justify-center gap-2 text-xs sm:text-sm">
                            <CheckCircle2 className="w-4 h-4" /> Joined Successfully
                        </div>
                    ) : (
                        <button
                            onClick={onJoin}
                            disabled={!user.is_verified}
                            className="flex-[1.5] px-4 sm:px-8 py-3.5 bg-slate-900 text-white font-extrabold rounded-2xl hover:bg-green-600 shadow-lg shadow-slate-200 transition-all disabled:opacity-50 text-xs sm:text-sm"
                        >
                            Confirm Participation
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function RedeemModal({ catalog, points, totalPoints, onClose, onRedeem, loading, history=[] }) {
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-[1001]">
            <div className="bg-white rounded-3xl sm:rounded-5xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
                {/* Sticky header with close — always visible */}
                <div className="flex items-center justify-between px-5 sm:px-8 py-4 border-b border-slate-100 shrink-0">
                    <div>
                        <h2 className="text-xl sm:text-3xl font-black text-slate-800 tracking-tighter">Shop Rewards</h2>
                        <p className="text-xs sm:text-sm font-medium text-slate-400">Redeem points for essential goods</p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="flex items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-2xl border border-green-100 text-green-600 font-black text-sm sm:text-xl">{points} <Award className="w-4 h-4 sm:w-5 sm:h-5" /></div>
                        <button onClick={onClose} className="p-2 sm:p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors shrink-0" aria-label="Close rewards"><X className="w-5 h-5 sm:w-6 sm:h-6" /></button>
                    </div>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto flex flex-col md:flex-row min-h-0">
                    {/* Catalog */}
                    <div className="flex-1 min-w-0 border-b md:border-b-0 md:border-r border-slate-100">
                        <div className="p-4 sm:px-8 sm:pt-5 pb-2 flex items-center gap-3 border-b border-slate-50">
                            <div className="flex flex-col items-start">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Balance</span>
                                <div className="flex items-center gap-1.5 bg-green-50 px-3 py-1 rounded-xl border border-green-100 text-green-600 font-black text-base">{points} <Award className="w-4 h-4" /></div>
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Earned</span>
                                <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1 rounded-xl border border-blue-100 text-blue-600 font-black text-base">{totalPoints || 0} <Leaf className="w-4 h-4" /></div>
                            </div>
                        </div>
                        <div className="p-4 sm:p-8 grid grid-cols-1 gap-3 sm:gap-4">
                            {catalog.map(item => (
                                <div key={item.id} className="bg-slate-50 rounded-3xl sm:rounded-4xl p-4 sm:p-6 border border-slate-100 hover:border-green-300 hover:bg-white transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-4 sm:gap-5">
                                        <div className="text-3xl sm:text-4xl group-hover:scale-110 transition-transform shrink-0">{item.icon}</div>
                                        <div><h4 className="text-base sm:text-lg font-black text-slate-800">{item.name}</h4><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{item.points} Points Req.</p></div>
                                    </div>
                                    <button onClick={() => onRedeem(item)} disabled={loading || points < item.points} className="w-full sm:w-auto px-6 py-2.5 sm:py-3 bg-slate-900 text-white rounded-2xl font-black text-xs sm:text-sm hover:bg-green-600 disabled:opacity-50 transition-all shadow-lg active:scale-95 text-center">Redeem</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* History */}
                    <div className="w-full md:w-80 bg-slate-50/50 flex flex-col shrink-0">
                        <div className="p-4 sm:p-6 pb-3 border-b border-slate-100">
                            <h3 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">Recent Claims</h3>
                        </div>
                        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 max-h-52 md:max-h-none overflow-y-auto custom-scrollbar">
                            {history.length === 0 ? (
                                <div className="text-center py-8 sm:py-12">
                                    <History className="w-8 h-8 sm:w-10 sm:h-10 text-slate-200 mx-auto mb-3" />
                                    <p className="text-slate-400 text-xs sm:text-sm font-medium">No redemptions yet.</p>
                                </div>
                            ) : (
                                history.map(r => (
                                    <div key={r.id} className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-100 shadow-sm">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-bold text-slate-800 text-xs sm:text-sm">{r.item_name}</h4>
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
        </div>
    );
}


function OfficialsModal({ officials, onClose }) {
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-[1001]">
            <div className="bg-white rounded-3xl sm:rounded-5xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col">
                <div className="p-5 sm:p-8 pb-4 sm:pb-6 flex justify-between items-center border-b border-slate-50">
                    <div><h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tighter">Barangay Council</h2></div>
                    <button onClick={onClose} className="p-2 sm:p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors" aria-label="Close modal"><X className="w-5 h-5 sm:w-6 sm:h-6" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-3 sm:space-y-4 custom-scrollbar">
                    {officials.length === 0 ? <p className="text-center py-8 text-slate-400 font-bold text-xs sm:text-sm">No officials listed.</p> : officials.map((o, idx) => (
                        <div key={idx} className="flex items-center gap-4 sm:gap-6 p-3 sm:p-4 rounded-3xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-green-500 to-emerald-400 flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-md shrink-0">{o.username.charAt(0).toUpperCase()}</div>
                            <div className="min-w-0"><h4 className="font-bold text-slate-800 text-sm sm:text-lg uppercase truncate">{o.username}</h4><p className="text-[10px] sm:text-xs font-black text-green-600 uppercase tracking-widest">{o.position || 'COUNCIL MEMBER'}</p></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function ProfileModal({ formData, setFormData, onClose, onSubmit, loading, user, photoTs }) {
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-[1001] animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl sm:rounded-5xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
                {/* Sticky header */}
                <div className="flex justify-between items-center px-5 sm:px-8 py-4 border-b border-slate-100 shrink-0">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tighter">My Account</h2>
                        <p className="text-xs sm:text-sm font-medium text-slate-400">Manage your personal information</p>
                    </div>
                    <button onClick={onClose} className="p-2 sm:p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors" aria-label="Close profile"><X className="w-5 h-5 sm:w-6 sm:h-6" /></button>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* Identity photos — horizontal strip on phone, vertical sidebar on md+ */}
                    <div className="bg-slate-50 px-5 sm:px-8 py-4 border-b border-slate-100 flex flex-row items-center gap-4 sm:gap-6">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:block shrink-0">Identity</h3>
                        {/* Profile photo */}
                        <div className="flex flex-col items-center gap-1 shrink-0">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border-2 border-slate-200 overflow-hidden shadow-inner relative group">
                                {formData.profile_picture_file ? (
                                    <img src={URL.createObjectURL(formData.profile_picture_file)} className="w-full h-full object-cover" alt="Profile preview" />
                                ) : user.profile_picture ? (
                                    <img src={`/${user.profile_picture}?t=${photoTs}`} className="w-full h-full object-cover" alt="Profile" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-200"><User className="w-8 h-8" /></div>
                                )}
                                <label className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                    <span className="text-white text-[9px] font-bold uppercase tracking-tighter text-center leading-tight">Change<br/>Photo</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={e => setFormData({...formData, profile_picture_file: e.target.files[0]})} />
                                </label>
                            </div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Photo</p>
                        </div>
                        {/* Barangay ID */}
                        <div className="flex flex-col items-center gap-1 shrink-0">
                            <div className="w-28 sm:w-36 aspect-[1.58/1] rounded-xl bg-white border-2 border-slate-200 overflow-hidden shadow-inner relative group">
                                {user.id_image ? (
                                    <img src={`/${user.id_image}?t=${photoTs}`} className="w-full h-full object-cover" alt="Barangay ID" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-200"><Shield className="w-6 h-6" /></div>
                                )}
                                <a href={`/${user.id_image}?t=${photoTs}`} target="_blank" rel="noreferrer" className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Eye className="text-white w-5 h-5" />
                                </a>
                            </div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Barangay ID</p>
                        </div>
                        {formData.profile_picture_file && (
                            <div className="flex-1 bg-green-50 p-3 rounded-2xl border border-green-100 flex items-center gap-2 min-w-0">
                                <Eye className="w-4 h-4 text-green-600 shrink-0" />
                                <p className="text-xs font-bold text-green-700 truncate">New: {formData.profile_picture_file.name}</p>
                            </div>
                        )}
                    </div>

                    {/* Form */}
                    <form onSubmit={onSubmit} className="p-5 sm:p-8 space-y-4 sm:space-y-5">
                        <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label><div className="relative"><User className="w-5 h-5 text-slate-300 absolute left-4 top-3.5 sm:top-4" /><input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="w-full bg-slate-50 pl-12 pr-4 sm:pr-6 py-3 sm:py-4 rounded-2xl border border-slate-100 focus:border-green-500 focus:ring-4 focus:ring-green-50 outline-none transition-all font-bold text-slate-800 text-sm" required /></div></div>
                        <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label><div className="relative"><Mail className="w-5 h-5 text-slate-300 absolute left-4 top-3.5 sm:top-4" /><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-slate-50 pl-12 pr-4 sm:pr-6 py-3 sm:py-4 rounded-2xl border border-slate-100 focus:border-green-500 focus:ring-4 focus:ring-green-50 outline-none transition-all font-bold text-slate-800 text-sm" required /></div></div>
                        <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</label><div className="relative"><Phone className="w-5 h-5 text-slate-300 absolute left-4 top-3.5 sm:top-4" /><input type="text" value={formData.phone_number} onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })} className="w-full bg-slate-50 pl-12 pr-4 sm:pr-6 py-3 sm:py-4 rounded-2xl border border-slate-100 focus:border-green-500 focus:ring-4 focus:ring-green-50 outline-none transition-all font-bold text-slate-800 text-sm" required /></div></div>
                        <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label><div className="relative"><Lock className="w-5 h-5 text-slate-300 absolute left-4 top-3.5 sm:top-4" /><input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Leave blank to keep unchanged" className="w-full bg-slate-50 pl-12 pr-4 sm:pr-6 py-3 sm:py-4 rounded-2xl border border-slate-100 focus:border-green-500 focus:ring-4 focus:ring-green-50 outline-none transition-all font-bold text-slate-800 text-sm" /></div></div>
                        <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-extrabold py-4 sm:py-5 rounded-2xl sm:rounded-3xl hover:bg-slate-800 transition-all text-base sm:text-lg shadow-xl shadow-slate-100 disabled:opacity-50 mt-2 active:scale-95">{loading ? 'Saving Changes...' : 'Update Profile'}</button>
                    </form>
                </div>
            </div>
        </div>
    );
}
