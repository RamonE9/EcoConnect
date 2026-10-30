import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Calendar, Award, Shield, Eye, Users, ShoppingBag, ArrowRightLeft, Sparkles, CheckCircle2, Star, XCircle, LogOut, Minus, Plus, Trophy } from 'lucide-react';
import { URBAN_BARANGAYS, RURAL_BARANGAYS } from '../data/barangays';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import ChatWidget from '../components/ChatWidget';
import { parseCoords } from '../lib/events';
import { AppShell, Modal, StatCard, EmptyState, SectionHeader, Avatar, Spinner, InputField, TextAreaField, SelectField } from '../components/ui';
import { toast } from '../lib/toast';
import { clearSession } from '../lib/api';
import { confirmDialog, confirmSignOut } from '../lib/confirm';
import { TITLE_THRESHOLDS, titleFor, nextTitleFor } from '../lib/titles';
import LeaderboardList from '../components/LeaderboardList';
import { mediaUrl } from '../lib/media';


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
    const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
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
    const [incentives, setIncentives] = useState([]);


    const getHeaders = (token) => {
        return { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (!storedUser || !token) {
            clearSession();
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
            clearSession();
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

            const incRes = await fetch('/api/incentives/', { headers: getHeaders(token) });
            if (incRes.ok) setIncentives(await incRes.json());
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
                toast(data.message);
            }
        } catch (error) {
            console.error('Error joining event:', error);
        }
    };

    const handleLeave = async (eventId) => {
        const ok = await confirmDialog({ title: 'Cancel participation?', message: 'You will be removed from this event. You can join again later.', confirmLabel: 'Cancel participation', cancelLabel: 'Keep me in', danger: true });
        if (!ok) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/events/leave/${eventId}`, {
                method: 'DELETE',
                headers: getHeaders(token)
            });
            if (res.status === 401) return handleUnauthorized();
            if (res.ok) {
                fetchData();
            } else {
                const data = await res.json();
                toast(data.message);
            }
        } catch (error) {
            console.error('Error leaving event:', error);
        }
    };


    // Returns true on success so the quantity picker can close.
    const handleRedeem = async (item, quantity = 1) => {
        if (redeeming) return false;
        setRedeeming(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/finance/redemption/request', {
                method: 'POST',
                headers: getHeaders(token),
                body: JSON.stringify({ incentive_id: item.id, quantity })
            });
            if (res.status === 401) { handleUnauthorized(); return false; }
            if (res.ok) {
                toast(`Request sent: ${quantity} × ${item.name}. Your barangay will release it soon.`, 'success');
                fetchData();
                return true;
            }
            const data = await res.json().catch(() => ({}));
            toast(data.message || 'Could not redeem this reward', 'error');
            return false;
        } catch (error) {
            toast(error.message || 'Cannot connect to the server', 'error');
            return false;
        } finally {
            setRedeeming(false);
        }
    };

    const handleRequestTransfer = async (e) => {
        e.preventDefault();
        if (!transferTarget) return toast('Select a target barangay');
        setTransferLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/auth/transfer/request', {
                method: 'POST',
                headers: getHeaders(token),
                body: JSON.stringify({ target_barangay: transferTarget, reason: transferReason })
            });
            if (res.ok) {
                toast('Transfer request submitted. The new barangay will review it.', 'success');
                setTransferTarget('');
                setTransferReason('');
                fetchData();
            } else {
                const data = await res.json();
                toast(data.message);
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
                headers: { 'Authorization': `Bearer ${token}` },
                body: data
            });
            const result = await res.json();
            if (res.ok) {
                toast('Profile updated!');
                setUser(result.user);
                localStorage.setItem('user', JSON.stringify(result.user));
                setPhotoTs(Date.now()); // force browser to re-fetch the new image
                setShowProfileModal(false);
                setProfileFormData({ ...profileFormData, password: '', profile_picture_file: null });
            } else toast(result.message);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setUpdatingProfile(false);
        }
    };

    const handleLogout = async () => {
        if (!(await confirmSignOut())) return;
        clearSession();
        navigate('/login-Residence');
    };

    const handleUnauthorized = () => {
        clearSession();
        navigate('/login-Residence');
    };

    if (!user) return null;
    const isJoined = (eventId) => myEvents.some((participation) => {
        const joinedEventId = typeof participation.event === 'object'
            ? participation.event?.id
            : participation.event;
        return joinedEventId === eventId;
    });

    const openProfile = () => {
        setProfileFormData({ username: user.username, email: user.email || '', phone_number: user.phone_number || '', password: '' });
        setShowProfileModal(true);
    };
    const photoSrc = mediaUrl(user.profile_picture, photoTs);
    // Title is always worked out from current points, so it updates right away.
    const currentTitle = titleFor(user.points);
    const nextTitle = nextTitleFor(user.points);

    const nav = [
        { label: 'Overview', icon: <Calendar className="h-[18px] w-[18px]" />, active: !showRedeemModal && !showLeaderboardModal && !showTransferModal && !showOfficialsModal && !showProfileModal, onClick: () => {} },
        { label: 'Rewards', icon: <ShoppingBag className="h-[18px] w-[18px]" />, active: showRedeemModal, onClick: () => setShowRedeemModal(true) },
        { label: 'Leaderboard', icon: <Trophy className="h-[18px] w-[18px]" />, active: showLeaderboardModal, onClick: () => setShowLeaderboardModal(true) },
        { label: 'Barangay officials', icon: <Users className="h-[18px] w-[18px]" />, active: showOfficialsModal, onClick: () => setShowOfficialsModal(true) },
        { label: 'Transfer barangay', icon: <ArrowRightLeft className="h-[18px] w-[18px]" />, active: showTransferModal, onClick: () => setShowTransferModal(true) },
        { label: 'My profile', icon: <User className="h-[18px] w-[18px]" />, active: showProfileModal, onClick: openProfile },
    ];

    return (
        <>
            <AppShell
                nav={nav}
                user={user}
                roleLabel="Resident"
                photoSrc={photoSrc}
                onLogout={handleLogout}
                mobileOpen={isMobileDrawerOpen}
                setMobileOpen={setIsMobileDrawerOpen}
                homeTo="/dashboard"
                title={`Welcome, ${user.username}`}
                subtitle={`Resident of ${user.barangay}`}
                actions={
                    <span className="eco-badge eco-badge-green text-sm py-1">
                        <Award className="h-4 w-4" /> {user.points} pts
                    </span>
                }
            >
                <div className="pb-20 lg:pb-0">
                    {(
                        <div className="space-y-6">
                            {!user.is_verified && (
                                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                                    <Shield className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                                    <div>
                                        <p className="text-sm font-semibold text-amber-900">Verification pending</p>
                                        <p className="text-sm text-amber-800">Your barangay is reviewing your ID. You can join events once you're verified.</p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                                <StatCard icon={<Award className="h-5 w-5" />} label="Eco-Points" value={user.points}
                                    hint={nextTitle ? `${nextTitle.points - user.points} pts to ${nextTitle.title}` : 'Highest title reached'} />
                                <StatCard icon={<Calendar className="h-5 w-5" />} label="Drives joined" value={myEvents.length}
                                    hint={`${myEvents.filter((p) => p.status === 'attended').length} attended`} />
                                <div className="col-span-2 sm:col-span-1">
                                    <StatCard icon={<Star className="h-5 w-5" />} label="Current title" value={<span className="text-lg sm:text-xl">{currentTitle || 'None yet'}</span>}
                                        hint="Earn points to unlock titles" />
                                </div>
                            </div>

                            {ecoTip && (
                                <div className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
                                    <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
                                    <div>
                                        <p className="text-sm font-semibold text-brand-900">Eco tip</p>
                                        <p className="text-sm text-brand-900/80">{ecoTip.tip}</p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                                <div className="space-y-6 lg:col-span-2">
                                    {smartReminders.length > 0 && (
                                        <section>
                                            <SectionHeader title="Coming up for you" subtitle="Events you joined and what to bring." />
                                            <div className="space-y-3">
                                                {smartReminders.map((remind) => (
                                                    <div key={remind.event_id} className="eco-card p-4">
                                                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                                                            <p className="font-semibold text-slate-900">{remind.event_title}</p>
                                                            <span className="eco-meta">{remind.date} · {remind.time}</span>
                                                        </div>
                                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                                            {remind.suggested_tools.map((tool) => (
                                                                <span key={tool} className="eco-badge eco-badge-slate">{tool}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    <section>
                                        <SectionHeader title="Cleanup drives" subtitle={`Open events in ${user.barangay}.`} />
                                        {loading ? <Spinner /> : events.length === 0 ? (
                                            <EmptyState icon={<Calendar className="h-5 w-5" />}
                                                title={user.is_verified ? 'No events yet' : 'Events appear after verification'}
                                                text={user.is_verified ? 'Your barangay hasn’t posted any cleanup drives. Check back soon.' : 'Once your ID is approved you’ll see your barangay’s cleanup drives here.'} />
                                        ) : (
                                            <div className="space-y-3">
                                                {events.map((event) => (
                                                    <EventItem key={event.id} event={event} isJoined={isJoined(event.id)}
                                                        participation={myEvents.find((p) => (p.event?.id ?? p.event) === event.id)}
                                                        onView={() => setSelectedEvent(event)} onJoin={() => handleJoin(event.id)} onLeave={handleLeave} user={user} />
                                                ))}
                                            </div>
                                        )}
                                    </section>
                                </div>

                                <aside className="space-y-6">
                                    <div className="eco-card p-5">
                                        <div className="flex items-baseline justify-between">
                                            <h3 className="eco-section-title">Progress</h3>
                                            <span className="text-sm font-semibold text-brand-800">{user.points} / 500</span>
                                        </div>
                                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                            <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.min((user.points / 500) * 100, 100)}%` }} />
                                        </div>
                                        <button onClick={() => setShowRedeemModal(true)} className="eco-btn eco-btn-outline mt-4 w-full">
                                            <ShoppingBag className="h-4 w-4" /> Redeem rewards
                                        </button>
                                    </div>

                                    <div className="eco-card p-5">
                                        <h3 className="eco-section-title mb-3">Titles</h3>
                                        <ul className="space-y-1">
                                            {[...TITLE_THRESHOLDS].reverse().map(({ points: threshold, title, emoji }) => {
                                                const earned = user.points >= threshold;
                                                return (
                                                    <li key={title} className={`flex items-center justify-between rounded-lg px-2 py-2 ${earned ? '' : 'opacity-50'}`}>
                                                        <span className="flex items-center gap-2 text-sm text-slate-800">
                                                            <span aria-hidden="true">{emoji}</span> {title}
                                                        </span>
                                                        {earned ? <span className="eco-badge eco-badge-green">Earned</span> : <span className="eco-meta">{threshold} pts</span>}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>

                                    <div className="eco-card p-5">
                                        <h3 className="eco-section-title mb-3">My drives</h3>
                                        {myEvents.length === 0 ? (
                                            <p className="text-sm text-slate-500">You haven’t joined any drives yet.</p>
                                        ) : (
                                            <ul className="divide-y divide-slate-100">
                                                {myEvents.map((p) => {
                                                    const ev = typeof p.event === 'object' ? p.event : events.find((e) => e.id === p.event);
                                                    return (
                                                        <li key={p.id} className="flex items-center justify-between gap-2 py-2.5">
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-medium text-slate-900">{ev?.title || 'Cleanup activity'}</p>
                                                                <p className="eco-meta">{ev?.date || 'Upcoming'}</p>
                                                            </div>
                                                            <span className={`eco-badge ${p.status === 'attended' ? 'eco-badge-green' : 'eco-badge-slate'}`}>
                                                                {p.status === 'attended' ? 'Attended' : 'Joined'}
                                                            </span>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                    </div>
                                </aside>
                            </div>
                        </div>
                    )}
                </div>
            </AppShell>

            {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} onJoin={() => { handleJoin(selectedEvent.id); setSelectedEvent(null); }} isJoined={isJoined(selectedEvent.id)} user={user} />}
            {showRedeemModal && <RedeemModal catalog={incentives} points={user.points} onClose={() => setShowRedeemModal(false)} onRedeem={handleRedeem} loading={redeeming} history={redemptionHistory} />}
            {showLeaderboardModal && (
                <Modal title="Leaderboard" subtitle="Top environmental contributors." onClose={() => setShowLeaderboardModal(false)}>
                    <LeaderboardList currentUser={user} />
                </Modal>
            )}
            {showTransferModal && (
                <TransferModal user={user} target={transferTarget} setTarget={setTransferTarget} reason={transferReason} setReason={setTransferReason}
                    loading={transferLoading} requests={transferRequests} onSubmit={handleRequestTransfer} onClose={() => setShowTransferModal(false)} />
            )}
            {showOfficialsModal && <OfficialsModal officials={officials} onClose={() => setShowOfficialsModal(false)} />}
            {showProfileModal && <ProfileModal formData={profileFormData} setFormData={setProfileFormData} onClose={() => setShowProfileModal(false)} onSubmit={handleUpdateProfile} loading={updatingProfile} user={user} photoTs={photoTs} />}

            <ChatWidget />

            {/* Phone bottom navigation */}
            <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-slate-200 bg-white px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] lg:hidden" aria-label="Quick">
                {[
                    { label: 'Home', icon: Calendar, active: !showRedeemModal && !showProfileModal && !showLeaderboardModal, onClick: () => { setShowRedeemModal(false); setShowLeaderboardModal(false); setShowProfileModal(false); } },
                    { label: 'Rewards', icon: ShoppingBag, active: showRedeemModal, onClick: () => setShowRedeemModal(true) },
                    { label: 'Ranks', icon: Trophy, active: showLeaderboardModal, onClick: () => setShowLeaderboardModal(true) },
                    { label: 'Profile', icon: User, active: showProfileModal, onClick: openProfile },
                    { label: 'Sign out', icon: LogOut, active: false, onClick: handleLogout, danger: true },
                ].map((item) => {
                    const Icon = item.icon;
                    return (
                        <button key={item.label} onClick={item.onClick}
                            className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] ${item.danger ? 'text-red-600' : item.active ? 'font-semibold text-brand-800' : 'text-slate-500'}`}>
                            <Icon className="h-5 w-5" /> {item.label}
                        </button>
                    );
                })}
            </nav>
        </>
    );
}

function parseEventCoordinates(locationStr) {
    return parseCoords(locationStr) || [9.7407, 118.7353];
}

function EventItem({ event, isJoined, participation, onView, onJoin, onLeave, user }) {
    const canCancel = isJoined && participation?.status === 'joined';
    return (
        <div className="eco-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{event.title}</p>
                    {event.category && <span className="eco-badge eco-badge-slate">{event.category}</span>}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {new Date(event.date).toLocaleDateString()} · {event.time}</span>
                    <span className="inline-flex items-center gap-1.5 font-medium text-brand-800"><Award className="h-4 w-4" /> {event.points_reward} pts</span>
                </div>
            </div>
            <div className="flex shrink-0 gap-2">
                <button onClick={onView} className="eco-btn eco-btn-outline flex-1 sm:flex-none">Details</button>
                {isJoined ? (
                    <>
                        <span className="eco-btn flex-1 bg-brand-50 text-brand-800 sm:flex-none">
                            <CheckCircle2 className="h-4 w-4" /> {participation?.status === 'attended' ? 'Attended' : 'Joined'}
                        </span>
                        {canCancel && (
                            <button onClick={() => onLeave(event.id)} className="eco-btn eco-btn-danger" title="Cancel participation">
                                <XCircle className="h-4 w-4" /> <span className="hidden sm:inline">Cancel</span>
                            </button>
                        )}
                    </>
                ) : (
                    <button onClick={onJoin} disabled={!user.is_verified} className="eco-btn eco-btn-green flex-1 sm:flex-none">Join</button>
                )}
            </div>
        </div>
    );
}

function EventDetailModal({ event, onClose, onJoin, isJoined, user }) {
    const coords = parseEventCoordinates(event.location);
    return (
        <Modal
            title={event.title}
            subtitle={event.category}
            onClose={onClose}
            size="lg"
            footer={
                <>
                    <button onClick={onClose} className="eco-btn eco-btn-outline">Close</button>
                    {isJoined ? (
                        <span className="eco-btn bg-brand-50 text-brand-800"><CheckCircle2 className="h-4 w-4" /> You joined this event</span>
                    ) : (
                        <button onClick={onJoin} disabled={!user.is_verified} className="eco-btn eco-btn-green">Join event</button>
                    )}
                </>
            }
        >
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                    ['Date', new Date(event.date).toLocaleDateString()],
                    ['Time', event.time || '—'],
                    ['Points', `${event.points_reward || 0} pts`],
                    ['Barangay', event.barangay || 'Puerto Princesa'],
                ].map(([term, detail]) => (
                    <div key={term}>
                        <dt className="eco-meta">{term}</dt>
                        <dd className="text-sm font-semibold text-slate-900">{detail}</dd>
                    </div>
                ))}
            </dl>

            <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-slate-700">{event.description}</p>

            <div className="mt-5">
                <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="eco-label mb-0">Location</span>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${coords[0]},${coords[1]}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand-800 hover:underline">
                        Get directions
                    </a>
                </div>
                <div className="relative z-0 h-56 overflow-hidden rounded-lg border border-slate-200 sm:h-64">
                    <MapContainer key={`event-map-${event.id}`} center={coords} zoom={15} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={coords}>
                            <Popup>{event.title}</Popup>
                        </Marker>
                    </MapContainer>
                </div>
            </div>
        </Modal>
    );
}

function QuantityPicker({ item, points, loading, onConfirm, onClose }) {
    const cost = item.points_cost;
    const limit = Math.max(1, Math.min(item.max_per_claim || 1, item.stock, Math.floor(points / cost)));
    const [quantity, setQuantity] = useState(1);
    const total = cost * quantity;
    const capReason = quantity < limit ? '' :
        limit === (item.max_per_claim || 1) ? `Limit of ${item.max_per_claim || 1} per claim` :
        limit === item.stock ? `Only ${item.stock} left in stock` : 'That’s all your points can cover';

    return (
        <Modal title={`Redeem ${item.name}`} subtitle={`${cost} pts each · up to ${item.max_per_claim || 1} per claim`} onClose={onClose} size="sm"
            footer={
                <>
                    <button onClick={onClose} className="eco-btn eco-btn-outline">Cancel</button>
                    <button onClick={() => onConfirm(quantity)} disabled={loading} className="eco-btn eco-btn-green">
                        {loading ? 'Sending…' : `Redeem for ${total} pts`}
                    </button>
                </>
            }
        >
            <div className="flex items-center justify-between">
                <span className="eco-label mb-0">Quantity</span>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1}
                        className="eco-btn eco-btn-outline h-10 w-10 px-0" aria-label="Decrease quantity"><Minus className="h-4 w-4" /></button>
                    <span className="w-10 text-center text-lg font-bold text-slate-900" aria-live="polite">{quantity}</span>
                    <button type="button" onClick={() => setQuantity((q) => Math.min(limit, q + 1))} disabled={quantity >= limit}
                        className="eco-btn eco-btn-outline h-10 w-10 px-0" aria-label="Increase quantity"><Plus className="h-4 w-4" /></button>
                </div>
            </div>
            {capReason && <p className="mt-2 text-right eco-meta">{capReason}</p>}
            <dl className="mt-5 space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Total cost</dt><dd className="font-semibold text-slate-900">{total} pts</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Points left after</dt><dd className="font-semibold text-slate-900">{points - total} pts</dd></div>
            </dl>
            <p className="mt-3 eco-meta">Points are deducted now and refunded if your barangay rejects the request.</p>
        </Modal>
    );
}

function TransferModal({ user, target, setTarget, reason, setReason, loading, requests, onSubmit, onClose }) {
    const hasPending = requests.some((r) => r.status === 'Pending');
    return (
        <Modal title="Transfer barangay" subtitle="Ask to move your account to the barangay you now live in." onClose={onClose} size="lg">
            {hasPending ? (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <ArrowRightLeft className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <p className="text-sm text-amber-900">You already have a pending request. You can send a new one after it’s approved or rejected.</p>
                </div>
            ) : (
                <form onSubmit={onSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <InputField label="Current barangay" value={user.barangay} disabled readOnly />
                        <SelectField label="Move to" required value={target} onChange={(e) => setTarget(e.target.value)}>
                            <option value="">Select a barangay</option>
                            {[...URBAN_BARANGAYS, ...RURAL_BARANGAYS].filter((b) => b !== user.barangay).map((b) => <option key={b} value={b}>{b}</option>)}
                        </SelectField>
                    </div>
                    <TextAreaField label="Reason" placeholder="Why are you moving? (optional)" maxLength={500} rows={3}
                        value={reason} onChange={(e) => setReason(e.target.value)} />
                    <div className="flex justify-end">
                        <button type="submit" disabled={loading || !target} className="eco-btn eco-btn-green">
                            {loading ? 'Submitting…' : 'Submit request'}
                        </button>
                    </div>
                </form>
            )}

            <h3 className="eco-section-title mb-3 mt-8">Request history</h3>
            {requests.length === 0 ? (
                <p className="text-sm text-slate-500">No requests yet.</p>
            ) : (
                <div className="eco-card divide-y divide-slate-100">
                    {requests.map((req) => (
                        <div key={req.id} className="flex items-center justify-between gap-3 px-4 py-3">
                            <div>
                                <p className="text-sm font-medium text-slate-900">To {req.target_barangay}</p>
                                <p className="eco-meta">{new Date(req.created_at).toLocaleDateString()}</p>
                            </div>
                            <span className={`eco-badge ${req.status === 'Approved' ? 'eco-badge-green' : req.status === 'Rejected' ? 'eco-badge-red' : 'eco-badge-amber'}`}>{req.status}</span>
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    );
}

function RedeemModal({ catalog, points, onClose, onRedeem, loading, history = [] }) {
    const statusBadge = { Claimed: 'eco-badge-green', Rejected: 'eco-badge-red', Pending: 'eco-badge-amber' };
    const [picking, setPicking] = useState(null);
    return (
        <>
        <Modal title="Rewards" subtitle={`You have ${points} Eco-Points to spend.`} onClose={onClose} size="xl">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="md:col-span-2">
                    {catalog.length === 0 ? (
                        <EmptyState icon={<ShoppingBag className="h-5 w-5" />} title="No rewards yet" text="Your barangay hasn’t listed any rewards. Check back soon." />
                    ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {catalog.map((item) => {
                                const cost = item.points_cost ?? item.points;
                                const outOfStock = item.stock !== undefined && item.stock <= 0;
                                const short = points < cost;
                                return (
                                    <div key={item.id} className={`eco-card flex flex-col p-4 ${outOfStock ? 'opacity-60' : ''}`}>
                                        <div className="flex items-start gap-3">
                                            <span className="text-3xl leading-none" aria-hidden="true">{item.icon}</span>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-900">{item.name}</p>
                                                <p className="text-sm text-slate-500">{cost} pts · {outOfStock ? 'Out of stock' : `${item.stock} left`}</p>
                                                {!outOfStock && <p className="eco-meta">Up to {item.max_per_claim || 1} per claim</p>}
                                            </div>
                                        </div>
                                        <button onClick={() => setPicking(item)} disabled={loading || short || outOfStock} className="eco-btn eco-btn-green mt-4 w-full">
                                            {outOfStock ? 'Out of stock' : short ? `Need ${cost - points} more pts` : 'Redeem'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div>
                    <h3 className="eco-section-title mb-3">Recent claims</h3>
                    {history.length === 0 ? (
                        <p className="text-sm text-slate-500">No claims yet.</p>
                    ) : (
                        <ul className="eco-card divide-y divide-slate-100">
                            {history.map((r) => (
                                <li key={r.id} className="flex items-start justify-between gap-2 px-4 py-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-slate-900">{(r.quantity || 1) > 1 ? `${r.quantity} × ` : ''}{r.item_name}</p>
                                        <p className="eco-meta">{new Date(r.timestamp).toLocaleDateString()} · {r.points_spent} pts</p>
                                    </div>
                                    <span className={`eco-badge ${statusBadge[r.status] || 'eco-badge-slate'}`}>{r.status}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </Modal>
        {picking && (
            <QuantityPicker item={picking} points={points} loading={loading} onClose={() => setPicking(null)}
                onConfirm={async (quantity) => { if (await onRedeem(picking, quantity)) setPicking(null); }} />
        )}
        </>
    );
}

function OfficialsModal({ officials, onClose }) {
    return (
        <Modal title="Barangay officials" subtitle="Contact your barangay for verification or reward questions." onClose={onClose}>
            {officials.length === 0 ? (
                <EmptyState icon={<Users className="h-5 w-5" />} title="No officials listed" />
            ) : (
                <ul className="divide-y divide-slate-100">
                    {officials.map((o) => (
                        <li key={o.id} className="flex items-center gap-3 py-3">
                            <Avatar src={mediaUrl(o.profile_picture)} name={o.username} />
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">{o.username}</p>
                                <p className="truncate eco-meta">{[o.email, o.phone_number].filter(Boolean).join(' · ') || 'Barangay official'}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </Modal>
    );
}

function ProfileModal({ formData, setFormData, onClose, onSubmit, loading, user, photoTs }) {
    const preview = formData.profile_picture_file ? URL.createObjectURL(formData.profile_picture_file) : mediaUrl(user.profile_picture, photoTs);
    const set = (key) => (e) => setFormData({ ...formData, [key]: e.target.value });
    return (
        <Modal title="My profile" subtitle="Update your account details." onClose={onClose}>
            <div className="mb-6 flex items-center gap-4">
                <Avatar src={preview} name={user.username} size="lg" />
                <div className="flex flex-wrap gap-2">
                    <label className="eco-btn eco-btn-outline eco-btn-sm cursor-pointer">
                        Change photo
                        <input type="file" className="sr-only" accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={(e) => setFormData({ ...formData, profile_picture_file: e.target.files[0] })} />
                    </label>
                    {user.id_image && (
                        <a href={mediaUrl(user.id_image, photoTs)} target="_blank" rel="noreferrer" className="eco-btn eco-btn-ghost eco-btn-sm">
                            <Eye className="h-4 w-4" /> View my ID
                        </a>
                    )}
                </div>
            </div>
            <form onSubmit={onSubmit} className="space-y-5">
                <InputField label="Username" required value={formData.username} onChange={set('username')} />
                <InputField label="Email" type="email" required value={formData.email} onChange={set('email')} />
                <InputField label="Mobile number" required value={formData.phone_number} onChange={set('phone_number')} hint="e.g. 09171234567" />
                <InputField label="New password" type="password" value={formData.password} onChange={set('password')} placeholder="Leave blank to keep your current password" autoComplete="new-password" />
                <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={onClose} className="eco-btn eco-btn-outline">Cancel</button>
                    <button type="submit" disabled={loading} className="eco-btn eco-btn-green">{loading ? 'Saving…' : 'Save changes'}</button>
                </div>
            </form>
        </Modal>
    );
}
