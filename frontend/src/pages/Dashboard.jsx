import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Calendar, Award, Shield, Eye, Users, ShoppingBag, ArrowRightLeft, Sparkles, CheckCircle2, Star, XCircle, LogOut, Minus, Plus, Ticket, Trophy, Flag } from 'lucide-react';
import { URBAN_BARANGAYS, RURAL_BARANGAYS } from '../data/barangays';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import ChatWidget from '../components/ChatWidget';
import { parseCoords } from '../lib/events';
import { AppShell, Modal, StatCard, EmptyState, SectionHeader, Avatar, Spinner, InputField, TextAreaField, SelectField } from '../components/ui';
import { toast } from '../lib/toast';
import { clearSession } from '../lib/api';
import { confirmDialog, confirmSignOut } from '../lib/confirm';
import { TITLE_THRESHOLDS, titleFor, nextTitleFor, achievementPoints } from '../lib/titles';
import LeaderboardList from '../components/LeaderboardList';
import TicketModal from '../components/TicketModal';
import { isFinished } from '../lib/eventStatus';
import IdImage from '../components/IdImage';
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
    const [ticketEventId, setTicketEventId] = useState(null);
    const [showTickets, setShowTickets] = useState(false);
    const [transferRequests, setTransferRequests] = useState([]);
    const [transferLoading, setTransferLoading] = useState(false);
    const [transferTarget, setTransferTarget] = useState('');
    const [transferReason, setTransferReason] = useState('');
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [ecoTip, setEcoTip] = useState(null);
    const [smartReminders, setSmartReminders] = useState([]);
    const [profileFormData, setProfileFormData] = useState({ username: '', email: '', phone_number: '', password: '', profile_picture_file: null });
    const [updatingProfile, setUpdatingProfile] = useState(false);
    const [replacingId, setReplacingId] = useState(false);
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
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                toast('Joined! Show this ticket at the event.', 'success');
                fetchData();
                setTicketEventId(eventId);
            } else toast(data.message || 'Could not join this event', 'error');
        } catch (error) {
            toast(error.message || 'Cannot connect to the server', 'error');
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
                toast('Profile updated', 'success');
                setUser(result.user);
                localStorage.setItem('user', JSON.stringify(result.user));
                setPhotoTs(Date.now()); // force browser to re-fetch the new image
                setProfileFormData({ ...profileFormData, password: '', profile_picture_file: null });
                return true;
            }
            toast(result.message || 'Could not update your profile', 'error');
            return false;
        } catch (error) {
            toast(error.message || 'Cannot connect to the server', 'error');
            return false;
        } finally {
            setUpdatingProfile(false);
        }
    };

    // Upload a new barangay ID. The account goes back to awaiting verification.
    const handleReplaceId = async (file) => {
        const ok = await confirmDialog({
            title: 'Change your barangay ID?',
            message: 'Your account will need to be verified again. Until then you can’t join new events.',
            confirmLabel: 'Upload new ID',
        });
        if (!ok) return false;
        setReplacingId(true);
        try {
            const data = new FormData();
            data.append('id_image', file);
            const res = await fetch('/api/auth/profile/id-image', {
                method: 'POST',
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                body: data,
            });
            const result = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast(result.message || 'Could not upload your ID', 'error');
                return false;
            }
            const updated = { ...result.user, id_version: Date.now() };
            setUser(updated);
            localStorage.setItem('user', JSON.stringify(result.user));
            toast(result.message, 'success');
            fetchData();
            return true;
        } catch (error) {
            toast(error.message || 'Cannot connect to the server', 'error');
            return false;
        } finally {
            setReplacingId(false);
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
    const openEvents = events.filter((e) => !isFinished(e));
    const finishedEvents = events.filter(isFinished);
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
    // Titles use the highest points ever reached, so redeeming rewards keeps them.
    const bestPoints = achievementPoints(user);
    const currentTitle = titleFor(bestPoints);
    const nextTitle = nextTitleFor(bestPoints);

    const onHome = !showRedeemModal && !showLeaderboardModal && !showTransferModal && !showOfficialsModal && !showProfileModal && !showTickets;
    const goHome = () => {
        setShowRedeemModal(false); setShowLeaderboardModal(false); setShowTransferModal(false);
        setShowOfficialsModal(false); setShowProfileModal(false); setShowTickets(false);
    };

    // Phones: these four live in the bottom bar, so the side menu skips them.
    const quickNav = [
        { label: 'Home', icon: Calendar, active: onHome, onClick: goHome },
        { label: 'Rewards', icon: ShoppingBag, active: showRedeemModal, onClick: () => setShowRedeemModal(true) },
        { label: 'Tickets', icon: Ticket, active: showTickets, onClick: () => setShowTickets(true) },
        { label: 'Profile', icon: User, active: showProfileModal, onClick: openProfile },
    ];
    const nav = [
        ...quickNav.map((item) => {
            const Icon = item.icon;
            return { ...item, icon: <Icon className="h-[18px] w-[18px]" />, desktopOnly: true };
        }),
        { label: 'Leaderboard', icon: <Trophy className="h-[18px] w-[18px]" />, active: showLeaderboardModal, onClick: () => setShowLeaderboardModal(true) },
        { label: 'Barangay officials', icon: <Users className="h-[18px] w-[18px]" />, active: showOfficialsModal, onClick: () => setShowOfficialsModal(true) },
        { label: 'Transfer barangay', icon: <ArrowRightLeft className="h-[18px] w-[18px]" />, active: showTransferModal, onClick: () => setShowTransferModal(true) },
        { label: 'Log out', icon: <LogOut className="h-[18px] w-[18px]" />, active: false, onClick: handleLogout, danger: true },
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
                showFooterLogout={false}
                title={`Welcome, ${user.username}`}
                subtitle={`Resident of ${user.barangay}`}
                actions={
                    <>
                        <span className="eco-badge eco-badge-green text-sm py-1">
                            <Award className="h-4 w-4" /> {user.points} pts
                        </span>
                        <button onClick={() => setShowTickets(true)} className="eco-btn eco-btn-outline eco-btn-sm hidden sm:inline-flex" title="Tickets for events you joined">
                            <Ticket className="h-4 w-4" /> My tickets
                        </button>
                    </>
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

                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                                <div className="space-y-6 lg:col-span-2">
                                    <section>
                                        <SectionHeader title="Cleanup drives" subtitle={`Open events in ${user.barangay}.`} />
                                        {loading ? <Spinner /> : openEvents.length === 0 ? (
                                            <EmptyState icon={<Calendar className="h-5 w-5" />}
                                                title={user.is_verified ? 'No open events' : 'Events appear after verification'}
                                                text={user.is_verified ? 'Your barangay hasn’t posted any new cleanup drives. Check back soon.' : 'Once your ID is approved you’ll see your barangay’s cleanup drives here.'} />
                                        ) : (
                                            <div className="space-y-3">
                                                {openEvents.map((event) => (
                                                    <EventItem key={event.id} event={event} isJoined={isJoined(event.id)}
                                                        participation={myEvents.find((p) => (p.event?.id ?? p.event) === event.id)}
                                                        onView={() => setSelectedEvent(event)} onJoin={() => handleJoin(event.id)} onLeave={handleLeave} user={user} onShowTicket={() => setTicketEventId(event.id)} />
                                                ))}
                                            </div>
                                        )}
                                    </section>

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

                                    {finishedEvents.length > 0 && (
                                        <section>
                                            <SectionHeader title="Finished events" subtitle="These events are done and no longer accept participants." />
                                            <div className="space-y-3">
                                                {finishedEvents.map((event) => (
                                                    <EventItem key={event.id} event={event} isJoined={isJoined(event.id)}
                                                        participation={myEvents.find((p) => (p.event?.id ?? p.event) === event.id)}
                                                        onView={() => setSelectedEvent(event)} onJoin={() => {}} onLeave={handleLeave} user={user} onShowTicket={() => setTicketEventId(event.id)} />
                                                ))}
                                            </div>
                                        </section>
                                    )}
                                </div>

                                <aside className="space-y-6">
                                    <div className="eco-card p-5">
                                        <div className="flex items-baseline justify-between">
                                            <h3 className="eco-section-title">Progress</h3>
                                            <span className="text-sm font-semibold text-brand-800">{bestPoints} / 500</span>
                                        </div>
                                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                            <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.min((bestPoints / 500) * 100, 100)}%` }} />
                                        </div>
                                        <button onClick={() => setShowRedeemModal(true)} className="eco-btn eco-btn-outline mt-4 w-full">
                                            <ShoppingBag className="h-4 w-4" /> Redeem rewards
                                        </button>
                                    </div>

                                    <div className="eco-card p-5">
                                        <h3 className="eco-section-title mb-3">Titles</h3>
                                        <ul className="space-y-1">
                                            {[...TITLE_THRESHOLDS].reverse().map(({ points: threshold, title, emoji }) => {
                                                const earned = bestPoints >= threshold;
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

                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                                <StatCard icon={<Award className="h-5 w-5" />} label="Eco-Points" value={user.points}
                                    hint={nextTitle ? `${nextTitle.points - bestPoints} pts to ${nextTitle.title}` : 'Highest title reached'} />
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
                        </div>
                    )}
                </div>
            </AppShell>

            {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} onJoin={() => { handleJoin(selectedEvent.id); setSelectedEvent(null); }} isJoined={isJoined(selectedEvent.id)} user={user} onShowTicket={() => { setTicketEventId(selectedEvent.id); setSelectedEvent(null); }} />}
            {showRedeemModal && <RedeemModal catalog={incentives} points={user.points} onClose={() => setShowRedeemModal(false)} onRedeem={handleRedeem} loading={redeeming} history={redemptionHistory} />}
            {showTickets && (
                <TicketsListModal myEvents={myEvents} events={events} onClose={() => setShowTickets(false)}
                    onOpen={(id) => { setShowTickets(false); setTicketEventId(id); }} />
            )}
            {ticketEventId && <TicketModal eventId={ticketEventId} user={user} onClose={() => setTicketEventId(null)} />}
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
            {showProfileModal && <ProfileModal formData={profileFormData} setFormData={setProfileFormData} onClose={() => setShowProfileModal(false)} onSubmit={handleUpdateProfile} loading={updatingProfile} user={user} photoTs={photoTs}
                myEvents={myEvents} events={events} redemptions={redemptionHistory} transfers={transferRequests} onReplaceId={handleReplaceId} replacingId={replacingId} />}

            <ChatWidget />

            {/* Phone bottom navigation */}
            <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-slate-200 bg-white px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] lg:hidden" aria-label="Quick">
                {quickNav.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button key={item.label} onClick={item.onClick} aria-current={item.active ? 'page' : undefined}
                            className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] ${item.active ? 'font-semibold text-brand-800' : 'text-slate-500'}`}>
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

function spotsInfo(event) {
    const limit = event.max_participants;
    const count = event.participants_count ?? 0;
    return { limit, count, full: Boolean(limit) && count >= limit, left: limit ? Math.max(limit - count, 0) : null };
}

function EventItem({ event, isJoined, participation, onView, onJoin, onLeave, user, onShowTicket }) {
    const finished = isFinished(event);
    const canCancel = isJoined && participation?.status === 'joined' && !finished;
    const spots = spotsInfo(event);
    return (
        <div className="eco-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{event.title}</p>
                    {event.category && <span className="eco-badge eco-badge-slate">{event.category}</span>}
                    {finished ? <span className="eco-badge eco-badge-slate"><Flag className="h-3 w-3" /> Finished</span>
                        : spots.full && !isJoined && <span className="eco-badge eco-badge-red">Full</span>}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {new Date(event.date).toLocaleDateString()} · {event.time}</span>
                    <span className="inline-flex items-center gap-1.5 font-medium text-brand-800"><Award className="h-4 w-4" /> {event.points_reward} pts</span>
                    <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" />
                        {spots.limit ? `${spots.count} / ${spots.limit} joined${spots.left && spots.left <= 5 ? ` · ${spots.left} left` : ''}` : `${spots.count} joined`}
                    </span>
                </div>
            </div>
            <div className="flex shrink-0 gap-2">
                <button onClick={onView} className="eco-btn eco-btn-outline flex-1 sm:flex-none">Details</button>
                {finished ? (
                    isJoined && (participation?.status === 'attended'
                        ? <span className="eco-btn flex-1 bg-brand-50 text-brand-800 sm:flex-none"><CheckCircle2 className="h-4 w-4" /> Attended</span>
                        : <span className="eco-btn flex-1 bg-slate-100 text-slate-600 sm:flex-none">Missed</span>)
                ) : isJoined ? (
                    <>
                        {participation?.status === 'attended' ? (
                            <span className="eco-btn flex-1 bg-brand-50 text-brand-800 sm:flex-none"><CheckCircle2 className="h-4 w-4" /> Attended</span>
                        ) : (
                            <button onClick={onShowTicket} className="eco-btn eco-btn-green flex-1 sm:flex-none" title="Show this at the event">
                                <Ticket className="h-4 w-4" /> Ticket
                            </button>
                        )}
                        {canCancel && (
                            <button onClick={() => onLeave(event.id)} className="eco-btn eco-btn-danger" title="Cancel participation">
                                <XCircle className="h-4 w-4" /> <span className="hidden sm:inline">Cancel</span>
                            </button>
                        )}
                    </>
                ) : (
                    <button onClick={onJoin} disabled={!user.is_verified || spots.full} className="eco-btn eco-btn-green flex-1 sm:flex-none">
                        {spots.full ? 'Full' : 'Join'}
                    </button>
                )}
            </div>
        </div>
    );
}

function TicketsListModal({ myEvents, events, onClose, onOpen }) {
    const rows = myEvents
        .map((p) => ({ p, ev: (typeof p.event === 'object' ? p.event : events.find((e) => e.id === p.event)) || {} }))
        .sort((a, b) => (a.p.status === 'attended') - (b.p.status === 'attended') || String(a.ev.date).localeCompare(String(b.ev.date)));
    return (
        <Modal title="My tickets" subtitle="Each event you join has its own ticket." onClose={onClose}>
            {rows.length === 0 ? (
                <EmptyState icon={<Ticket className="h-5 w-5" />} title="No tickets yet" text="Join a cleanup drive and its ticket will appear here." />
            ) : (
                <ul className="eco-card divide-y divide-slate-100">
                    {rows.map(({ p, ev }) => (
                        <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">{ev.title || 'Cleanup activity'}</p>
                                <p className="eco-meta">{ev.date} · {ev.time}</p>
                            </div>
                            {p.status === 'attended'
                                ? <span className="eco-badge eco-badge-green"><CheckCircle2 className="h-3.5 w-3.5" /> Attended</span>
                                : isFinished(ev)
                                    ? <span className="eco-badge eco-badge-slate">Event finished</span>
                                    : <button onClick={() => onOpen(ev.id)} className="eco-btn eco-btn-green eco-btn-sm"><Ticket className="h-4 w-4" /> Show ticket</button>}
                        </li>
                    ))}
                </ul>
            )}
        </Modal>
    );
}

function EventDetailModal({ event, onClose, onJoin, isJoined, user, onShowTicket }) {
    const coords = parseEventCoordinates(event.location);
    const spots = spotsInfo(event);
    return (
        <Modal
            title={event.title}
            subtitle={event.category}
            onClose={onClose}
            size="lg"
            footer={
                <>
                    <button onClick={onClose} className="eco-btn eco-btn-outline">Close</button>
                    {isFinished(event) ? (
                        <span className="eco-btn bg-slate-100 text-slate-600"><Flag className="h-4 w-4" /> This event is finished</span>
                    ) : isJoined ? (
                        <button onClick={onShowTicket} className="eco-btn eco-btn-green"><Ticket className="h-4 w-4" /> Show my ticket</button>
                    ) : (
                        <button onClick={onJoin} disabled={!user.is_verified || spots.full} className="eco-btn eco-btn-green">{spots.full ? 'Event is full' : 'Join event'}</button>
                    )}
                </>
            }
        >
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                    ['Date', new Date(event.date).toLocaleDateString()],
                    ['Time', event.time || '—'],
                    ['Points', `${event.points_reward || 0} pts`],
                    ['Spots', spots.limit ? `${spots.count} / ${spots.limit} joined` : `${spots.count} joined · no limit`],
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

function ProfileModal({ formData, setFormData, onClose, onSubmit, loading, user, photoTs, myEvents, events, redemptions, transfers, onReplaceId, replacingId }) {
    const [editing, setEditing] = useState(false);
    const [showId, setShowId] = useState(false);
    const [historyTab, setHistoryTab] = useState('events');
    const [awards, setAwards] = useState(null);

    useEffect(() => {
        fetch('/api/auth/me/point-awards', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
            .then((res) => (res.ok ? res.json() : []))
            .then((data) => setAwards(Array.isArray(data) ? data : []))
            .catch(() => setAwards([]));
    }, []);

    const preview = formData.profile_picture_file ? URL.createObjectURL(formData.profile_picture_file) : mediaUrl(user.profile_picture, photoTs);
    const set = (key) => (e) => setFormData({ ...formData, [key]: e.target.value });
    const bestPoints = achievementPoints(user);
    const title = titleFor(bestPoints);
    const next = nextTitleFor(bestPoints);
    const earned = [...TITLE_THRESHOLDS].reverse().filter((t) => bestPoints >= t.points);
    const eventOf = (p) => (typeof p.event === 'object' ? p.event : events.find((e) => e.id === p.event)) || {};
    const attended = myEvents.filter((p) => p.status === 'attended');
    const released = redemptions.filter((r) => r.status === 'Claimed');
    const statusBadge = { Claimed: 'eco-badge-green', Rejected: 'eco-badge-red', Pending: 'eco-badge-amber', Approved: 'eco-badge-green' };

    if (editing) {
        return (
            <Modal title="Edit details" subtitle="Change your account information." onClose={onClose}>
                <div className="mb-6 flex items-center gap-4">
                    <Avatar src={preview} name={user.username} size="lg" />
                    <label className="eco-btn eco-btn-outline eco-btn-sm cursor-pointer">
                        Change profile photo
                        <input type="file" className="sr-only" accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={(e) => setFormData({ ...formData, profile_picture_file: e.target.files[0] })} />
                    </label>
                </div>
                <form onSubmit={async (e) => { if (await onSubmit(e)) setEditing(false); }} className="space-y-5">
                    <InputField label="Username" required value={formData.username} onChange={set('username')} />
                    <InputField label="Email" type="email" required value={formData.email} onChange={set('email')} />
                    <InputField label="Mobile number" required value={formData.phone_number} onChange={set('phone_number')} hint="e.g. 09171234567" />
                    <InputField label="New password" type="password" value={formData.password} onChange={set('password')} placeholder="Leave blank to keep your current password" autoComplete="new-password" />
                    <div className="flex justify-end gap-2 pt-1">
                        <button type="button" onClick={() => setEditing(false)} className="eco-btn eco-btn-outline">Back to profile</button>
                        <button type="submit" disabled={loading} className="eco-btn eco-btn-green">{loading ? 'Saving…' : 'Save changes'}</button>
                    </div>
                </form>
            </Modal>
        );
    }

    const tabs = [
        ['events', 'Events', myEvents.length],
        ['rewards', 'Rewards', redemptions.length],
        ['bonus', 'Bonus points', awards?.length ?? 0],
        ['transfers', 'Transfers', transfers.length],
    ];

    return (
        <Modal title="My profile" onClose={onClose} size="lg"
            footer={<button onClick={() => setEditing(true)} className="eco-btn eco-btn-green"><User className="h-4 w-4" /> Edit details</button>}>
            {/* Identity */}
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <Avatar src={preview} name={user.username} size="xl" />
                <div className="min-w-0">
                    <p className="truncate text-xl font-bold tracking-tight text-slate-900">{user.username}</p>
                    <p className="text-sm text-slate-500">Resident of {user.barangay}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className={`eco-badge ${user.is_verified ? 'eco-badge-green' : 'eco-badge-amber'}`}>
                            <Shield className="h-3.5 w-3.5" /> {user.is_verified ? 'Verified resident' : 'Awaiting verification'}
                        </span>
                        {title && <span className="eco-badge eco-badge-slate"><Star className="h-3.5 w-3.5" /> {title}</span>}
                    </div>
                </div>
            </div>

            <dl className="mt-6 grid grid-cols-3 gap-3">
                {[['Eco-Points', user.points], ['Drives attended', attended.length], ['Rewards received', released.length]].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-slate-50 p-3 text-center">
                        <dd className="text-xl font-bold text-slate-900">{value}</dd>
                        <dt className="eco-meta">{label}</dt>
                    </div>
                ))}
            </dl>

            {/* Achievements */}
            <section className="mt-8">
                <h3 className="eco-section-title">Achievements</h3>
                {next && (
                    <div className="mt-3">
                        <div className="flex justify-between text-sm"><span className="text-slate-600">Next: {next.emoji} {next.title}</span><span className="font-medium text-slate-900">{bestPoints} / {next.points}</span></div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.min(100, (bestPoints / next.points) * 100)}%` }} />
                        </div>
                    </div>
                )}
                {earned.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">No titles yet. Earn {TITLE_THRESHOLDS[TITLE_THRESHOLDS.length - 1].points} points to unlock your first one.</p>
                ) : (
                    <ul className="mt-3 flex flex-wrap gap-2">
                        {earned.map((t) => (
                            <li key={t.title} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                                <span aria-hidden="true">{t.emoji}</span>
                                <span className="font-medium text-slate-900">{t.title}</span>
                                <span className="eco-meta">{t.points} pts</span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* History */}
            <section className="mt-8">
                <h3 className="eco-section-title">History</h3>
                <div className="mt-3 flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1" role="tablist" aria-label="History">
                    {tabs.map(([key, label, count]) => (
                        <button key={key} role="tab" aria-selected={historyTab === key} onClick={() => setHistoryTab(key)}
                            className={`h-9 shrink-0 flex-1 whitespace-nowrap rounded-md px-3 text-sm font-semibold transition-colors ${historyTab === key ? 'border border-slate-200 bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                            {label} <span className="font-normal text-slate-400">{count}</span>
                        </button>
                    ))}
                </div>
                <div className="mt-3">
                    {historyTab === 'events' && (myEvents.length === 0 ? <p className="text-sm text-slate-500">You haven’t joined any events yet.</p> : (
                        <ul className="eco-card divide-y divide-slate-100">
                            {myEvents.map((p) => {
                                const ev = eventOf(p);
                                return (
                                    <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-slate-900">{ev.title || 'Cleanup activity'}</p>
                                            <p className="eco-meta">{ev.date}{p.status === 'attended' && ev.points_reward ? ` · +${ev.points_reward} pts` : ''}</p>
                                        </div>
                                        <span className={`eco-badge ${p.status === 'attended' ? 'eco-badge-green' : 'eco-badge-slate'}`}>{p.status === 'attended' ? 'Attended' : 'Joined'}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    ))}
                    {historyTab === 'rewards' && (redemptions.length === 0 ? <p className="text-sm text-slate-500">No rewards claimed yet.</p> : (
                        <ul className="eco-card divide-y divide-slate-100">
                            {redemptions.map((r) => (
                                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-slate-900">{(r.quantity || 1) > 1 ? `${r.quantity} × ` : ''}{r.item_name}</p>
                                        <p className="eco-meta">{new Date(r.timestamp).toLocaleDateString()} · −{r.points_spent} pts</p>
                                    </div>
                                    <span className={`eco-badge ${statusBadge[r.status] || 'eco-badge-slate'}`}>{r.status === 'Claimed' ? 'Received' : r.status}</span>
                                </li>
                            ))}
                        </ul>
                    ))}
                    {historyTab === 'bonus' && (awards === null ? <Spinner /> : awards.length === 0 ? <p className="text-sm text-slate-500">No bonus points yet.</p> : (
                        <ul className="eco-card divide-y divide-slate-100">
                            {awards.map((a) => (
                                <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-slate-900">{a.reason}</p>
                                        <p className="eco-meta">{new Date(a.created_at).toLocaleDateString()}{a.awarded_by_username ? ` · from ${a.awarded_by_username}` : ''}</p>
                                    </div>
                                    <span className="eco-badge eco-badge-green">+{a.points} pts</span>
                                </li>
                            ))}
                        </ul>
                    ))}
                    {historyTab === 'transfers' && (transfers.length === 0 ? <p className="text-sm text-slate-500">No transfer requests.</p> : (
                        <ul className="eco-card divide-y divide-slate-100">
                            {transfers.map((t) => (
                                <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-slate-900">{t.source_barangay} → {t.target_barangay}</p>
                                        <p className="eco-meta">{new Date(t.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <span className={`eco-badge ${statusBadge[t.status] || 'eco-badge-amber'}`}>{t.status}</span>
                                </li>
                            ))}
                        </ul>
                    ))}
                </div>
            </section>

            {/* Personal details */}
            <section className="mt-8">
                <h3 className="eco-section-title">Personal details</h3>
                <dl className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {[['Username', user.username], ['Email', user.email || '—'], ['Mobile number', user.phone_number || '—'], ['Barangay', user.barangay || '—']].map(([term, detail]) => (
                        <div key={term} className="min-w-0">
                            <dt className="eco-meta">{term}</dt>
                            <dd className="truncate text-sm font-medium text-slate-900">{detail}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            {/* Barangay ID */}
            <section className="mt-8">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="eco-section-title">Barangay ID</h3>
                    <div className="flex gap-2">
                        {user.has_id_image && (
                            <button type="button" onClick={() => setShowId((v) => !v)} className="eco-btn eco-btn-ghost eco-btn-sm" aria-expanded={showId}>
                                <Eye className="h-4 w-4" /> {showId ? 'Hide' : 'View'}
                            </button>
                        )}
                        <label className={`eco-btn eco-btn-outline eco-btn-sm ${replacingId ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}>
                            {replacingId ? 'Uploading…' : 'Change ID photo'}
                            <input type="file" className="sr-only" accept="image/jpeg,image/png,image/gif,image/webp" disabled={replacingId}
                                onChange={async (e) => { const file = e.target.files[0]; e.target.value = ''; if (file && await onReplaceId(file)) setShowId(true); }} />
                        </label>
                    </div>
                </div>
                <p className="mt-1 eco-meta">Changing your ID photo sends your account back to your barangay for verification.</p>
                {showId && <div className="mt-3 max-w-sm"><IdImage key={user.id_version || user.is_verified} userId={user.id} alt="My barangay ID" /></div>}
            </section>
        </Modal>
    );
}
