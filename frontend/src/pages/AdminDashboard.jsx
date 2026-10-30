import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Calendar, Search, Plus, Users, Activity, ClipboardList, Database, FileCheck, History, FileSpreadsheet, ArrowRightLeft, Settings, Award, Sparkles, Star, Package, Trophy } from 'lucide-react';
import { URBAN_BARANGAYS, RURAL_BARANGAYS } from '../data/barangays';
import ChatWidget from '../components/ChatWidget';
import EventForm from '../components/EventForm';
import { AppShell, Modal, StatCard, EmptyState, Avatar, Spinner, InputField, TextAreaField, SelectField } from '../components/ui';
import { toast } from '../lib/toast';
import { clearSession } from '../lib/api';
import { confirmDialog, confirmSignOut } from '../lib/confirm';
import LeaderboardList from '../components/LeaderboardList';
import IdImage from '../components/IdImage';
import { mediaUrl } from '../lib/media';

export default function AdminDashboard() {
    const [events, setEvents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creatingEvent, setCreatingEvent] = useState(false);
    const [schedulingAdvice, setSchedulingAdvice] = useState(null);
    const [stats, setStats] = useState({ totalEvents: 0, activeParticipants: 0, totalPoints: 0 });
    const [adminUser, setAdminUser] = useState(() => JSON.parse(localStorage.getItem('user') || '{}') || {});
    const [newForm, setNewForm] = useState({
        title: '', description: '', location: '', date: '', time: '', points_reward: 10, max_participants: '', barangay: (adminUser && adminUser.barangay) || URBAN_BARANGAYS[0], category: 'General Cleanup'
    });

    const [globalLogs, setGlobalLogs] = useState([]);
    const [barangayStats, setBarangayStats] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [showUsersModal, setShowUsersModal] = useState(false);
    const [residentSearch, setResidentSearch] = useState('');
    const [verifyFilter, setVerifyFilter] = useState('pending');
    const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
    const [redemptions, setRedemptions] = useState([]);
    const [showRedemptionModal, setShowRedemptionModal] = useState(false);
    const [redemptionBusy, setRedemptionBusy] = useState(null);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [transferBarangay, setTransferBarangay] = useState('');
    const [reportFilter, setReportFilter] = useState('All');
    const [residentView, setResidentView] = useState('Local');
    const [externalResidents, setExternalResidents] = useState([]);
    const [isSearchingExternal, setIsSearchingExternal] = useState(false);
    const [incomingTransfers, setIncomingTransfers] = useState([]);
    const [showTransferRequestsModal, setShowTransferRequestsModal] = useState(false);
    const [selectedResidentProfile, setSelectedResidentProfile] = useState(null);
    const [showResidentDetailModal, setShowResidentDetailModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [profileFormData, setProfileFormData] = useState({
        username: adminUser.username || '',
        email: adminUser.email || '',
        phone_number: adminUser.phone_number || '',
        password: ''
    });
    const [updatingProfile, setUpdatingProfile] = useState(false);
    const [photoTs, setPhotoTs] = useState(Date.now());

    // Incentive / Stock management
    const [incentives, setIncentives] = useState([]);
    const [showIncentiveModal, setShowIncentiveModal] = useState(false);
    const [newIncentive, setNewIncentive] = useState({ name: '', points_cost: 50, stock: 0, max_per_claim: 1, icon: '🎁' });

    // Award points directly to a resident
    const [showAwardPointsModal, setShowAwardPointsModal] = useState(false);
    const [awardTarget, setAwardTarget] = useState(null);
    const [awardPointsForm, setAwardPointsForm] = useState({ points: '', reason: '' });



    const filteredEvents = events.filter(event => {
        const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase());
        if (reportFilter === 'All') return matchesSearch;
        const eventDate = new Date(event.date);
        const now = new Date();
        if (reportFilter === 'Weekly') {
            const weekAgo = new Date();
            weekAgo.setDate(now.getDate() - 7);
            return matchesSearch && eventDate >= weekAgo;
        }
        if (reportFilter === 'Monthly') {
            const monthAgo = new Date();
            monthAgo.setMonth(now.getMonth() - 1);
            return matchesSearch && eventDate >= monthAgo;
        }
        if (reportFilter === 'Yearly') {
            const yearAgo = new Date();
            yearAgo.setFullYear(now.getFullYear() - 1);
            return matchesSearch && eventDate >= yearAgo;
        }
        return matchesSearch;
    });

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();

    const closeAllModals = () => {
        setShowLogsModal(false);
        setShowStatsModal(false);
        setShowUsersModal(false);
        setShowIncentiveModal(false);
        setShowRedemptionModal(false);
        setShowTransferRequestsModal(false);
        setShowProfileModal(false);
        setShowAwardPointsModal(false);
        setShowLeaderboardModal(false);
    };

    const navItems = [
        { 
            label: 'Dashboard', 
            icon: <Activity className="h-[18px] w-[18px]" />, 
            onClick: () => { closeAllModals(); }, 
            active: !showLogsModal && !showStatsModal && !showUsersModal && !showIncentiveModal && !showRedemptionModal && !showTransferRequestsModal && !showProfileModal && !showLeaderboardModal 
        },
        { label: 'Activity log', icon: <ClipboardList className="h-[18px] w-[18px]" />, onClick: () => { closeAllModals(); setShowLogsModal(true); }, active: showLogsModal },
        { label: 'Leaderboard', icon: <Trophy className="h-[18px] w-[18px]" />, onClick: () => { closeAllModals(); setShowLeaderboardModal(true); }, active: showLeaderboardModal },
        { label: 'Statistics', icon: <Database className="h-[18px] w-[18px]" />, onClick: () => { closeAllModals(); setShowStatsModal(true); }, active: showStatsModal },
        { label: 'Residents', icon: <Users className="h-[18px] w-[18px]" />, onClick: () => { closeAllModals(); setShowUsersModal(true); }, active: showUsersModal, badge: allUsers.filter(u => u.role === 'resident' && !u.is_verified).length },
        { label: 'Rewards inventory', icon: <Package className="h-[18px] w-[18px]" />, onClick: () => { closeAllModals(); setShowIncentiveModal(true); }, active: showIncentiveModal },
        { label: 'Reward claims', icon: <History className="h-[18px] w-[18px]" />, onClick: () => { closeAllModals(); setShowRedemptionModal(true); }, active: showRedemptionModal, badge: redemptions.filter(r => r.status === 'Pending').length },
        { label: 'Transfer requests', icon: <ArrowRightLeft className="h-[18px] w-[18px]" />, onClick: () => { closeAllModals(); setShowTransferRequestsModal(true); }, active: showTransferRequestsModal, badge: incomingTransfers.filter(r => r.status === 'Pending').length },
        { label: 'My profile', icon: <Settings className="h-[18px] w-[18px]" />, onClick: () => { closeAllModals(); setProfileFormData({username: adminUser.username, email: adminUser.email||'', phone_number: adminUser.phone_number||'', password: ''}); setShowProfileModal(true); }, active: showProfileModal },
    ];

    useEffect(() => {
        // No token means no access. The role is confirmed by the server, not by
        // the (editable) copy of the user kept in localStorage.
        const token = localStorage.getItem('token');
        if (!token) {
            handleUnauthorized();
            return;
        }
        (async () => {
            try {
                const res = await fetch('/api/auth/me', { headers: getHeaders(localStorage.getItem('token')) });
                if (!res.ok) return handleUnauthorized();
                const me = await res.json();
                if (!['admin', 'official', 'barangay_official'].includes(me.role)) return handleUnauthorized();
                localStorage.setItem('user', JSON.stringify(me));
                setAdminUser(me);
                fetchData();
            } catch {
                toast('Cannot connect to the server. Check your internet connection.', 'error');
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const getHeaders = (token) => ({ 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' });

    const handleLogout = async () => {
        if (!(await confirmSignOut())) return;
        clearSession();
        navigate('/login-Barangay');
    };

    const handleUnauthorized = () => {
        clearSession();
        navigate('/login-Barangay');
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/events/', { headers: getHeaders(token) });
            if (res.status === 401) return handleUnauthorized();
            const data = await res.json();
            setEvents(Array.isArray(data) ? data : []);

            const lbRes = await fetch('/api/events/leaderboard', { headers: getHeaders(token) });
            const lbData = await lbRes.json();
            setStats({ totalEvents: data.length, activeParticipants: lbData.length, totalPoints: lbData.reduce((acc, curr) => acc + curr.points, 0) });

            const logsRes = await fetch('/api/events/global-logs', { headers: getHeaders(token) });
            setGlobalLogs(await logsRes.json());

            const statsRes = await fetch('/api/events/barangay-stats', { headers: getHeaders(token) });
            setBarangayStats(await statsRes.json());

            const usersRes = await fetch('/api/auth/users', { headers: getHeaders(token) });
            setAllUsers(await usersRes.json());

            const redRes = await fetch('/api/finance/redemption/history', { headers: getHeaders(token) });
            if (redRes.ok) setRedemptions(await redRes.json());

            const incRes = await fetch('/api/incentives/', { headers: getHeaders(token) });
            if (incRes.ok) setIncentives(await incRes.json());

            const transRes = await fetch('/api/auth/transfer/incoming', { headers: getHeaders(token) });
            if (transRes.ok) setIncomingTransfers(await transRes.json());

            const aiRes = await fetch('/api/ai/scheduling/', { headers: getHeaders(token) });
            if (aiRes.ok) setSchedulingAdvice(await aiRes.json());
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const handleCreateIncentive = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/incentives/', {
                method: 'POST',
                headers: getHeaders(token),
                body: JSON.stringify(newIncentive)
            });
            if (res.ok) {
                setNewIncentive({ name: '', points_cost: 50, stock: 0, max_per_claim: 1, icon: '🎁' });
                fetchData();
            } else {
                const err = await res.json();
                toast(err.message || 'Failed to create incentive');
            }
        } catch (error) { console.error(error); }
    };

    const handleUpdateIncentive = async (incentiveId, fields) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/incentives/${incentiveId}`, {
                method: 'PUT',
                headers: getHeaders(token),
                body: JSON.stringify(fields)
            });
            const result = await res.json().catch(() => ({}));
            if (res.ok) { toast('Reward updated', 'success'); fetchData(); }
            else toast(result.message || 'Could not update the reward', 'error');
        } catch (error) { toast(error.message || 'Cannot connect to the server', 'error'); }
    };

    const handleDeleteIncentive = async (incentiveId) => {
        if (!(await confirmDialog({ title: 'Remove this reward?', message: 'Residents will no longer see it in the rewards list.', confirmLabel: 'Remove', danger: true }))) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/incentives/${incentiveId}`, {
                method: 'DELETE',
                headers: getHeaders(token)
            });
            if (res.ok) fetchData();
        } catch (error) { console.error(error); }
    };

    const handleAwardPoints = async (e) => {
        e.preventDefault();
        if (!awardTarget || !awardPointsForm.points) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/auth/users/${awardTarget.id}/award-points`, {
                method: 'POST',
                headers: getHeaders(token),
                body: JSON.stringify({
                    points: parseInt(awardPointsForm.points),
                    reason: awardPointsForm.reason || 'Direct award by official'
                })
            });
            const result = await res.json();
            if (res.ok) {
                toast(result.message);
                setShowAwardPointsModal(false);
                setAwardPointsForm({ points: '', reason: '' });
                setAwardTarget(null);
                fetchData();
            } else {
                toast(result.message || 'Failed to award points');
            }
        } catch (error) { console.error(error); }
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
                toast('Admin profile updated!');
                localStorage.setItem('user', JSON.stringify(result.user));
                setAdminUser(result.user);
                setPhotoTs(Date.now());
                setShowProfileModal(false);
                setProfileFormData({ ...profileFormData, password: '', profile_picture_file: null });
                fetchData();
            } else toast(result.message);
        } catch (error) { console.error(error); } finally { setUpdatingProfile(false); }
    };

    const handleVerifyUser = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/auth/users/verify/${userId}`, { method: 'POST', headers: getHeaders(token) });
            if (res.ok) fetchData();
        } catch (error) { console.error(error); }
    };

    const handleTransferResident = async (targetUser, newBarangay) => {
        if (!targetUser || !newBarangay) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/auth/users/transfer/${targetUser.id}`, {
                method: 'POST',
                headers: getHeaders(token),
                body: JSON.stringify({ new_barangay: newBarangay })
            });
            const result = await res.json().catch(() => ({}));
            if (res.ok) {
                setShowTransferModal(false);
                fetchData();
                if (residentView === 'External') handleSearchExternal(residentSearch);
                toast(`${targetUser.username} moved to ${newBarangay}`, 'success');
            } else toast(result.message || 'Transfer failed', 'error');
        } catch (error) { toast(error.message || 'Cannot connect to the server', 'error'); }
    };

    const handleTransferDecision = async (requestId, decision) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/auth/transfer/decision', {
                method: 'POST',
                headers: getHeaders(token),
                body: JSON.stringify({ request_id: requestId, decision })
            });
            if (res.ok) { fetchData(); toast(`Request ${decision}`); }
        } catch (error) { console.error(error); }
    };

    // decision: 'approve' releases the reward; 'reject' refunds points and restocks.
    const handleRedemptionDecision = async (id, decision) => {
        if (redemptionBusy) return; // prevent double clicks
        setRedemptionBusy(id);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/finance/redemption/${decision}/${id}`, { method: 'POST', headers: getHeaders(token) });
            const result = await res.json().catch(() => ({}));
            if (res.ok) {
                toast(decision === 'approve' ? 'Reward released to resident' : 'Request rejected. Points refunded.', 'success');
                fetchData();
            } else toast(result.message || 'Action failed', 'error');
        } catch (error) {
            toast(error.message || 'Cannot connect to the server', 'error');
        } finally {
            setRedemptionBusy(null);
        }
    };

    const handleExportResidents = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/auth/users/export', { headers: getHeaders(token) });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Residents_${adminUser.barangay}_${new Date().toISOString().split('T')[0]}.xlsx`;
                a.click();
            }
        } catch (error) { console.error(error); }
    };

    const handleDelete = async (eventId) => {
        if (!(await confirmDialog({ title: 'Delete this event?', message: 'Points already given to attendees will be taken back. This cannot be undone.', confirmLabel: 'Delete event', danger: true }))) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/events/${eventId}`, { method: 'DELETE', headers: getHeaders(token) });
            if (res.ok) fetchData();
        } catch (error) { console.error(error); }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (creatingEvent) return;
        setCreatingEvent(true);
        try {
            const token = localStorage.getItem('token');
            const currentAdmin = JSON.parse(localStorage.getItem('user')) || {};
            
            const res = await fetch('/api/events/', {
                method: 'POST',
                headers: getHeaders(token),
                body: JSON.stringify({ 
                    ...newForm, 
                    points_reward: parseInt(newForm.points_reward),
                    barangay: currentAdmin.barangay // Ensure it matches the admin's jurisdiction
                })
            });
            if (res.ok) { 
                setShowCreateModal(false); 
                setNewForm({ title: '', description: '', location: '', date: '', time: '', points_reward: 10, max_participants: '', barangay: currentAdmin.barangay, category: 'General Cleanup' });
                toast('Event created', 'success');
                fetchData();
            } else {
                const result = await res.json().catch(() => ({}));
                toast(result.message || 'Could not create the event', 'error');
            }
        } catch (error) {
            toast(error.message || 'Cannot connect to the server', 'error');
        } finally {
            setCreatingEvent(false);
        }
    };

    const handleSearchExternal = async (query) => {
        if (!query) return setExternalResidents([]);
        setIsSearchingExternal(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/auth/users/search?query=${query}`, { headers: getHeaders(token) });
            if (res.ok) setExternalResidents(await res.json());
        } catch (error) { console.error(error); } finally { setIsSearchingExternal(false); }
    };

    useEffect(() => {
        if (residentView === 'External' && residentSearch.length >= 2) {
            const timer = setTimeout(() => handleSearchExternal(residentSearch), 500);
            return () => clearTimeout(timer);
        }
    }, [residentSearch, residentView]);

    const photoSrc = mediaUrl(adminUser.profile_picture, photoTs);
    const residents = allUsers.filter((u) => u.role === 'resident');
    const pendingVerifications = residents.filter((u) => !u.is_verified).length;
    const pendingClaims = redemptions.filter((r) => r.status === 'Pending').length;
    const verifyCounts = { pending: pendingVerifications, verified: residents.length - pendingVerifications, all: residents.length };
    const localMatches = residents
        .filter((u) => u.username.toLowerCase().includes(residentSearch.toLowerCase()))
        .filter((u) => verifyFilter === 'all' || (verifyFilter === 'pending' ? !u.is_verified : u.is_verified))
        .sort((a, b) => Number(a.is_verified) - Number(b.is_verified) || a.username.localeCompare(b.username));
    const redemptionBadge = { Claimed: 'eco-badge-green', Rejected: 'eco-badge-red', Pending: 'eco-badge-amber' };
    const openResidents = () => { closeAllModals(); setShowUsersModal(true); };
    const openAward = (user) => { setAwardTarget(user); setAwardPointsForm({ points: '', reason: '' }); setShowAwardPointsModal(true); };
    const openTransfer = (user) => { setSelectedUser(user); setTransferBarangay(user.barangay); setShowTransferModal(true); };

    return (
        <>
            <AppShell
                nav={navItems}
                user={adminUser}
                roleLabel="Official"
                photoSrc={photoSrc}
                onLogout={handleLogout}
                mobileOpen={sidebarOpen}
                setMobileOpen={setSidebarOpen}
                homeTo="/admin"
                title="Dashboard"
                subtitle={`Barangay ${adminUser.barangay || ''} · cleanup events and residents`}
                actions={
                    <button onClick={() => setShowCreateModal(true)} className="eco-btn eco-btn-green">
                        <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New event</span>
                    </button>
                }
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        <StatCard icon={<Calendar className="h-5 w-5" />} label="Events" value={stats.totalEvents} />
                        <StatCard icon={<Users className="h-5 w-5" />} label="Residents" value={residents.length} />
                        <button onClick={openResidents} className="text-left">
                            <StatCard icon={<FileCheck className="h-5 w-5" />} label="Awaiting verification" value={pendingVerifications} hint="Open resident list" alert={pendingVerifications > 0} />
                        </button>
                        <button onClick={() => { closeAllModals(); setShowRedemptionModal(true); }} className="text-left">
                            <StatCard icon={<Package className="h-5 w-5" />} label="Pending claims" value={pendingClaims} hint="Review redemptions" alert={pendingClaims > 0} />
                        </button>
                    </div>

                    {schedulingAdvice && (
                        <div className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
                            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
                            <div>
                                <p className="text-sm font-semibold text-brand-900">Scheduling suggestion</p>
                                <p className="text-sm text-brand-900/80">{schedulingAdvice.suggestion}</p>
                                <p className="mt-1 text-xs text-brand-900/60">{schedulingAdvice.data_analysis}</p>
                            </div>
                        </div>
                    )}

                    <section className="eco-card">
                        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="eco-section-title">Events</h2>
                                <p className="text-sm text-slate-500">Manage participants, edit or remove events.</p>
                            </div>
                            <div className="flex gap-2">
                                <div className="relative flex-1 sm:w-56">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input type="search" placeholder="Search events" aria-label="Search events" className="eco-input h-10 pl-9"
                                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                </div>
                                <select aria-label="Filter by date" className="eco-input h-10 w-auto" value={reportFilter} onChange={(e) => setReportFilter(e.target.value)}>
                                    {['All', 'Weekly', 'Monthly', 'Yearly'].map((f) => <option key={f} value={f}>{f === 'All' ? 'All time' : `Past ${f.replace('ly', '').toLowerCase()}`}</option>)}
                                </select>
                            </div>
                        </div>
                        {loading ? <Spinner /> : filteredEvents.length === 0 ? (
                            <div className="p-4">
                                <EmptyState icon={<Calendar className="h-5 w-5" />} title="No events found"
                                    text={events.length ? 'Try a different search or date filter.' : 'Create your first cleanup drive to get started.'}
                                    action={!events.length && <button onClick={() => setShowCreateModal(true)} className="eco-btn eco-btn-green"><Plus className="h-4 w-4" /> New event</button>} />
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="eco-table min-w-[640px]">
                                    <thead>
                                        <tr><th>Event</th><th>Date</th><th>Joined</th><th>Points</th><th className="text-right">Actions</th></tr>
                                    </thead>
                                    <tbody>
                                        {filteredEvents.map((event) => (
                                            <tr key={event.id}>
                                                <td>
                                                    <p className="font-medium text-slate-900">{event.title}</p>
                                                    {event.category && <p className="eco-meta">{event.category}</p>}
                                                </td>
                                                <td className="whitespace-nowrap">{event.date} · {event.time}</td>
                                                <td className="whitespace-nowrap">
                                                    {event.participants_count ?? 0}{event.max_participants ? ` / ${event.max_participants}` : ''}
                                                    {event.max_participants && event.participants_count >= event.max_participants && <span className="eco-badge eco-badge-red ml-1.5">Full</span>}
                                                </td>
                                                <td><span className="eco-badge eco-badge-green">{event.points_reward} pts</span></td>
                                                <td>
                                                    <div className="flex justify-end gap-1">
                                                        <button onClick={() => navigate(`/manage-participants/${event.id}`)} className="eco-btn eco-btn-outline eco-btn-sm"><Users className="h-4 w-4" /> Participants</button>
                                                        <button onClick={() => navigate(`/edit-event/${event.id}`)} className="eco-icon-btn" aria-label={`Edit ${event.title}`} title="Edit"><Edit2 className="h-4 w-4" /></button>
                                                        <button onClick={() => handleDelete(event.id)} className="eco-icon-btn hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${event.title}`} title="Delete"><Trash2 className="h-4 w-4" /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            </AppShell>

            {showCreateModal && (
                <Modal title="New event" subtitle="Residents in your barangay will see it right away." onClose={() => setShowCreateModal(false)} size="lg">
                    <EventForm value={newForm} onChange={setNewForm} onSubmit={handleCreate} submitting={creatingEvent}
                        submitLabel="Create event" onCancel={() => setShowCreateModal(false)} />
                </Modal>
            )}

            {showProfileModal && (
                <Modal title="My profile" subtitle="Update your official account." onClose={() => setShowProfileModal(false)}>
                    <div className="mb-6 flex items-center gap-4">
                        <Avatar src={profileFormData.profile_picture_file ? URL.createObjectURL(profileFormData.profile_picture_file) : photoSrc} name={adminUser.username} size="lg" />
                        <label className="eco-btn eco-btn-outline eco-btn-sm cursor-pointer">
                            Change photo
                            <input type="file" className="sr-only" accept="image/jpeg,image/png,image/gif,image/webp"
                                onChange={(e) => setProfileFormData({ ...profileFormData, profile_picture_file: e.target.files[0] })} />
                        </label>
                    </div>
                    <form onSubmit={handleUpdateProfile} className="space-y-5">
                        <InputField label="Username" required value={profileFormData.username} onChange={(e) => setProfileFormData({ ...profileFormData, username: e.target.value })} />
                        <InputField label="Email" type="email" required value={profileFormData.email} onChange={(e) => setProfileFormData({ ...profileFormData, email: e.target.value })} />
                        <InputField label="Mobile number" required value={profileFormData.phone_number} onChange={(e) => setProfileFormData({ ...profileFormData, phone_number: e.target.value })} />
                        <InputField label="New password" type="password" autoComplete="new-password" placeholder="Leave blank to keep your current password"
                            value={profileFormData.password} onChange={(e) => setProfileFormData({ ...profileFormData, password: e.target.value })} />
                        <div className="flex justify-end gap-2 pt-1">
                            <button type="button" onClick={() => setShowProfileModal(false)} className="eco-btn eco-btn-outline">Cancel</button>
                            <button disabled={updatingProfile} className="eco-btn eco-btn-green">{updatingProfile ? 'Saving…' : 'Save changes'}</button>
                        </div>
                    </form>
                </Modal>
            )}

            {showUsersModal && (
                <Modal title="Residents" subtitle={`Registered residents of ${adminUser.barangay}.`} onClose={() => setShowUsersModal(false)} size="xl">
                    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center">
                        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                            {[['Local', 'Our residents'], ['External', 'Other barangays']].map(([key, label]) => (
                                <button key={key} onClick={() => setResidentView(key)}
                                    className={`h-9 rounded-md px-3 text-sm font-semibold transition-colors ${residentView === key ? 'border border-slate-200 bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                                    {label}
                                </button>
                            ))}
                        </div>
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input type="search" className="eco-input h-10 pl-9" aria-label="Search residents"
                                placeholder={residentView === 'Local' ? 'Search by username' : 'Search other barangays (2+ letters)'}
                                value={residentSearch} onChange={(e) => setResidentSearch(e.target.value)} />
                        </div>
                        <button onClick={handleExportResidents} className="eco-btn eco-btn-outline"><FileSpreadsheet className="h-4 w-4" /> Export to Excel</button>
                    </div>

                    {residentView === 'Local' && (
                        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter by verification">
                            {[['pending', 'Awaiting verification'], ['verified', 'Verified'], ['all', 'All']].map(([key, label]) => (
                                <button key={key} onClick={() => setVerifyFilter(key)} aria-pressed={verifyFilter === key}
                                    className={`eco-btn eco-btn-sm ${verifyFilter === key ? 'bg-slate-900 text-white hover:bg-slate-800' : 'eco-btn-outline'}`}>
                                    {label}
                                    <span className={`rounded-full px-1.5 text-[11px] ${key === 'pending' && verifyCounts.pending > 0 ? 'bg-red-600 text-white' : verifyFilter === key ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>
                                        {verifyCounts[key]}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {residentView === 'Local' ? (
                        localMatches.length === 0 ? (
                            <EmptyState icon={<Users className="h-5 w-5" />}
                                title={verifyFilter === 'pending' && !residentSearch ? 'No one is waiting for verification' : 'No residents found'}
                                text={verifyFilter === 'pending' && !residentSearch ? 'New sign-ups will appear here for you to review.' : undefined} />
                        ) : (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                                {localMatches.map((user) => (
                                    <ResidentCard key={user.id} user={user} onVerify={handleVerifyUser} onTransfer={() => openTransfer(user)}
                                        onView={() => { setSelectedResidentProfile(user); setShowResidentDetailModal(true); }} onAwardPoints={() => openAward(user)} />
                                ))}
                            </div>
                        )
                    ) : isSearchingExternal ? <Spinner label="Searching…" /> : externalResidents.length === 0 ? (
                        <EmptyState icon={<Search className="h-5 w-5" />} title="Search other barangays" text="Type at least two letters of a username or phone number." />
                    ) : (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {externalResidents.map((user) => (
                                <div key={user.id} className="eco-card p-4">
                                    <div className="flex items-center gap-3">
                                        <Avatar src={mediaUrl(user.profile_picture)} name={user.username} />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-900">{user.username}</p>
                                            <p className="truncate eco-meta">{user.barangay}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleTransferResident(user, adminUser.barangay)} className="eco-btn eco-btn-outline mt-4 w-full">
                                        <ArrowRightLeft className="h-4 w-4" /> Move to {adminUser.barangay}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </Modal>
            )}

            {showLeaderboardModal && (
                <Modal title="Leaderboard" subtitle="Top contributors among residents." onClose={() => setShowLeaderboardModal(false)}>
                    <LeaderboardList currentUser={adminUser} />
                </Modal>
            )}

            {showLogsModal && (
                <Modal title="Activity log" subtitle="Who joined and attended your events." onClose={() => setShowLogsModal(false)} size="lg">
                    {globalLogs.length === 0 ? <EmptyState icon={<ClipboardList className="h-5 w-5" />} title="No activity yet" /> : (
                        <div className="-mx-5 overflow-x-auto sm:-mx-6">
                            <table className="eco-table min-w-[520px]">
                                <thead><tr><th>Resident</th><th>Event</th><th>Status</th></tr></thead>
                                <tbody>
                                    {globalLogs.map((log) => (
                                        <tr key={log.id}>
                                            <td className="font-medium text-slate-900">{log.user?.username}</td>
                                            <td>{log.event?.title}</td>
                                            <td><span className={`eco-badge ${log.status === 'attended' ? 'eco-badge-green' : 'eco-badge-amber'}`}>{log.status === 'attended' ? 'Attended' : 'Joined'}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Modal>
            )}

            {showStatsModal && (
                <Modal title="Barangay statistics" onClose={() => setShowStatsModal(false)}>
                    {barangayStats.length === 0 ? <EmptyState icon={<Database className="h-5 w-5" />} title="No data yet" /> : (
                        <div className="space-y-3">
                            {[...barangayStats].sort((a, b) => b.total_points - a.total_points).map((s) => (
                                <div key={s.barangay} className="grid grid-cols-2 gap-3">
                                    <StatCard icon={<Users className="h-5 w-5" />} label="Residents" value={s.total_users} hint={s.barangay} />
                                    <StatCard icon={<Award className="h-5 w-5" />} label="Points earned" value={s.total_points.toLocaleString()} hint="All residents combined" />
                                </div>
                            ))}
                        </div>
                    )}
                </Modal>
            )}

            {showIncentiveModal && (
                <Modal title="Rewards inventory" subtitle="Items residents can redeem with their points." onClose={() => setShowIncentiveModal(false)} size="xl">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        <form onSubmit={handleCreateIncentive} className="eco-card space-y-4 p-4">
                            <h3 className="eco-section-title">Add an item</h3>
                            <InputField label="Item name" required maxLength={100} placeholder="e.g. 5 kg rice"
                                value={newIncentive.name} onChange={(e) => setNewIncentive({ ...newIncentive, name: e.target.value })} />
                            <div className="grid grid-cols-2 gap-3">
                                <InputField label="Cost (pts)" type="number" min={1} required value={newIncentive.points_cost}
                                    onChange={(e) => setNewIncentive({ ...newIncentive, points_cost: e.target.value })} />
                                <InputField label="Stock" type="number" min={0} required value={newIncentive.stock}
                                    onChange={(e) => setNewIncentive({ ...newIncentive, stock: e.target.value })} />
                            </div>
                            <InputField label="Max per claim" type="number" min={1} max={100} required value={newIncentive.max_per_claim}
                                hint="Most a resident can take in one request."
                                onChange={(e) => setNewIncentive({ ...newIncentive, max_per_claim: e.target.value })} />
                            <InputField label="Icon (emoji)" maxLength={4} placeholder="🎁" value={newIncentive.icon}
                                onChange={(e) => setNewIncentive({ ...newIncentive, icon: e.target.value })} />
                            <button type="submit" className="eco-btn eco-btn-green w-full"><Plus className="h-4 w-4" /> Add item</button>
                        </form>

                        <div className="md:col-span-2">
                            {incentives.length === 0 ? (
                                <EmptyState icon={<Package className="h-5 w-5" />} title="No items yet" text="Add your first reward on the left." />
                            ) : (
                                <ul className="eco-card divide-y divide-slate-100">
                                    {incentives.map((item) => (
                                        <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                                            <span className="text-2xl" aria-hidden="true">{item.icon}</span>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                                                <p className="eco-meta">{item.points_cost} pts each</p>
                                            </div>
                                            <label className="flex items-center gap-2 text-sm text-slate-500">
                                                Stock
                                                <input type="number" min={0} defaultValue={item.stock} aria-label={`Stock for ${item.name}`}
                                                    onBlur={(e) => Number(e.target.value) !== item.stock && handleUpdateIncentive(item.id, { stock: Number(e.target.value) })}
                                                    className="eco-input h-9 w-20 text-center" />
                                            </label>
                                            <label className="flex items-center gap-2 text-sm text-slate-500" title="Most a resident can take in one request">
                                                Max/claim
                                                <input type="number" min={1} max={100} defaultValue={item.max_per_claim || 1} aria-label={`Max per claim for ${item.name}`}
                                                    onBlur={(e) => Number(e.target.value) !== (item.max_per_claim || 1) && handleUpdateIncentive(item.id, { max_per_claim: Number(e.target.value) })}
                                                    className="eco-input h-9 w-16 text-center" />
                                            </label>
                                            <button onClick={() => handleDeleteIncentive(item.id)} className="eco-icon-btn hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${item.name}`} title="Remove">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </Modal>
            )}

            {showAwardPointsModal && awardTarget && (
                <Modal title="Award points" subtitle={`Give bonus Eco-Points to ${awardTarget.username}.`} onClose={() => { setShowAwardPointsModal(false); setAwardTarget(null); }} size="sm">
                    <form onSubmit={handleAwardPoints} className="space-y-5">
                        <InputField label="Points" type="number" required min={1} max={500} placeholder="e.g. 50" hint="Up to 500 points per award."
                            value={awardPointsForm.points} onChange={(e) => setAwardPointsForm({ ...awardPointsForm, points: e.target.value })} />
                        <TextAreaField label="Reason" rows={3} maxLength={255} placeholder="e.g. Helped organize the river cleanup"
                            value={awardPointsForm.reason} onChange={(e) => setAwardPointsForm({ ...awardPointsForm, reason: e.target.value })} />
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => { setShowAwardPointsModal(false); setAwardTarget(null); }} className="eco-btn eco-btn-outline">Cancel</button>
                            <button type="submit" className="eco-btn eco-btn-green">Award points</button>
                        </div>
                    </form>
                </Modal>
            )}

            {showRedemptionModal && (
                <Modal title="Reward claims" subtitle="Release rewards to residents, or reject to refund their points." onClose={() => setShowRedemptionModal(false)} size="lg">
                    {redemptions.length === 0 ? <EmptyState icon={<History className="h-5 w-5" />} title="No claims yet" /> : (
                        <ul className="eco-card divide-y divide-slate-100">
                            {redemptions.map((r) => (
                                <li key={r.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-900">{(r.quantity || 1) > 1 ? `${r.quantity} × ` : ''}{r.item_name}</p>
                                        <p className="eco-meta">{r.username} · {new Date(r.timestamp).toLocaleDateString()} · {r.points_spent} pts</p>
                                    </div>
                                    {r.status === 'Pending' ? (
                                        <div className="flex gap-2">
                                            <button disabled={redemptionBusy === r.id} onClick={() => handleRedemptionDecision(r.id, 'reject')} className="eco-btn eco-btn-danger eco-btn-sm">Reject</button>
                                            <button disabled={redemptionBusy === r.id} onClick={() => handleRedemptionDecision(r.id, 'approve')} className="eco-btn eco-btn-green eco-btn-sm">Release</button>
                                        </div>
                                    ) : (
                                        <span className={`eco-badge ${redemptionBadge[r.status] || 'eco-badge-slate'}`}>{r.status === 'Claimed' ? 'Released' : r.status}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </Modal>
            )}

            {showTransferRequestsModal && (
                <Modal title="Transfer requests" subtitle={`Residents asking to move into ${adminUser.barangay}.`} onClose={() => setShowTransferRequestsModal(false)} size="lg">
                    {incomingTransfers.length === 0 ? <EmptyState icon={<ArrowRightLeft className="h-5 w-5" />} title="No transfer requests" /> : (
                        <ul className="eco-card divide-y divide-slate-100">
                            {incomingTransfers.map((req) => (
                                <li key={req.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-900">{req.username}</p>
                                        <p className="eco-meta">From {req.source_barangay} · {new Date(req.created_at).toLocaleDateString()}</p>
                                        {req.reason && <p className="mt-1 text-sm text-slate-600">“{req.reason}”</p>}
                                    </div>
                                    {req.status === 'Pending' ? (
                                        <div className="flex gap-2">
                                            <button onClick={() => handleTransferDecision(req.id, 'Rejected')} className="eco-btn eco-btn-danger eco-btn-sm">Reject</button>
                                            <button onClick={() => handleTransferDecision(req.id, 'Approved')} className="eco-btn eco-btn-green eco-btn-sm">Approve</button>
                                        </div>
                                    ) : (
                                        <span className={`eco-badge ${req.status === 'Approved' ? 'eco-badge-green' : 'eco-badge-red'}`}>{req.status}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </Modal>
            )}

            {showResidentDetailModal && selectedResidentProfile && (
                <Modal title={selectedResidentProfile.username} subtitle={`Resident of ${selectedResidentProfile.barangay}`} onClose={() => setShowResidentDetailModal(false)} size="lg"
                    footer={
                        <>
                            <button onClick={() => { openTransfer(selectedResidentProfile); setShowResidentDetailModal(false); }} className="eco-btn eco-btn-outline"><ArrowRightLeft className="h-4 w-4" /> Transfer</button>
                            <button onClick={() => { openAward(selectedResidentProfile); setShowResidentDetailModal(false); }} className="eco-btn eco-btn-outline"><Star className="h-4 w-4" /> Award points</button>
                            <button onClick={() => { handleVerifyUser(selectedResidentProfile.id); setShowResidentDetailModal(false); }}
                                className={`eco-btn ${selectedResidentProfile.is_verified ? 'eco-btn-danger' : 'eco-btn-green'}`}>
                                {selectedResidentProfile.is_verified ? 'Revoke verification' : 'Verify resident'}
                            </button>
                        </>
                    }
                >
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
                        <div className="md:col-span-2">
                            <p className="eco-label">Barangay ID</p>
                            {selectedResidentProfile.has_id_image ? (
                                <IdImage userId={selectedResidentProfile.id} alt={`${selectedResidentProfile.username}'s barangay ID`} />
                            ) : (
                                <div className="grid aspect-[1.58/1] place-items-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-400">No ID uploaded</div>
                            )}
                        </div>
                        <dl className="grid grid-cols-2 content-start gap-4 md:col-span-3">
                            {[
                                ['Status', <span key="s" className={`eco-badge ${selectedResidentProfile.is_verified ? 'eco-badge-green' : 'eco-badge-amber'}`}>{selectedResidentProfile.is_verified ? 'Verified' : 'Pending review'}</span>],
                                ['Eco-Points', `${selectedResidentProfile.points} pts`],
                                ['Email', selectedResidentProfile.email || '—'],
                                ['Mobile', selectedResidentProfile.phone_number || '—'],
                                ['Title', selectedResidentProfile.title || 'None yet'],
                            ].map(([term, detail]) => (
                                <div key={term} className="min-w-0">
                                    <dt className="eco-meta">{term}</dt>
                                    <dd className="truncate text-sm font-semibold text-slate-900">{detail}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </Modal>
            )}

            {showTransferModal && selectedUser && (
                <Modal title="Transfer resident" subtitle={`Move ${selectedUser.username} to another barangay.`} onClose={() => setShowTransferModal(false)} size="sm">
                    <div className="space-y-5">
                        <SelectField label="New barangay" value={transferBarangay} onChange={(e) => setTransferBarangay(e.target.value)}>
                            {URBAN_BARANGAYS.concat(RURAL_BARANGAYS).map((b) => <option key={b} value={b}>{b}</option>)}
                        </SelectField>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowTransferModal(false)} className="eco-btn eco-btn-outline">Cancel</button>
                            <button onClick={() => handleTransferResident(selectedUser, transferBarangay)} disabled={transferBarangay === selectedUser.barangay} className="eco-btn eco-btn-green">Confirm transfer</button>
                        </div>
                    </div>
                </Modal>
            )}

            <ChatWidget />
        </>
    );
}

function ResidentCard({ user, onVerify, onTransfer, onView, onAwardPoints }) {
    return (
        <div className="eco-card flex flex-col p-4">
            <div className="flex items-start gap-3">
                <Avatar src={mediaUrl(user.profile_picture)} name={user.username} />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{user.username}</p>
                    <p className="truncate eco-meta">{user.email || 'No email'}</p>
                </div>
                <span className={`eco-badge ${user.is_verified ? 'eco-badge-green' : 'eco-badge-amber'}`}>{user.is_verified ? 'Verified' : 'Pending'}</span>
            </div>
            <p className="mt-3 text-sm text-slate-600"><span className="font-semibold text-slate-900">{user.points || 0}</span> Eco-Points</p>
            <div className="mt-4 flex gap-2">
                <button onClick={onView} className="eco-btn eco-btn-outline eco-btn-sm flex-1">View</button>
                <button onClick={() => onVerify(user.id)} className={`eco-btn eco-btn-sm flex-1 ${user.is_verified ? 'eco-btn-outline' : 'eco-btn-green'}`}>
                    {user.is_verified ? 'Revoke' : 'Verify'}
                </button>
                <button onClick={onAwardPoints} className="eco-icon-btn h-8 w-8" aria-label={`Award points to ${user.username}`} title="Award points"><Star className="h-4 w-4" /></button>
                <button onClick={onTransfer} className="eco-icon-btn h-8 w-8" aria-label={`Transfer ${user.username}`} title="Transfer"><ArrowRightLeft className="h-4 w-4" /></button>
            </div>
        </div>
    );
}
