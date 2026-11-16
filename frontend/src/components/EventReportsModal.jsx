import { useEffect, useState } from 'react';
import { BarChart3, FileSpreadsheet, Search, X } from 'lucide-react';
import { Modal, EmptyState, Spinner } from './ui';
import { EVENT_CATEGORIES } from '../lib/events';
import { buildQuery, downloadFile } from '../lib/download';
import { toast } from '../lib/toast';

const STATUS_LABEL = { upcoming: 'Open', completed: 'Done', cancelled: 'Cancelled' };

function useDebounced(value, delay = 350) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
}

function Total({ label, value }) {
    return (
        <div className="rounded-lg border border-slate-200 px-3 py-2">
            <p className="eco-meta">{label}</p>
            <p className="text-lg font-bold text-slate-900">{value}</p>
        </div>
    );
}

export default function EventReportsModal({ onClose }) {
    const [text, setText] = useState('');
    const [category, setCategory] = useState('');
    const [status, setStatus] = useState('');
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [report, setReport] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState('');
    const query = useDebounced(text);
    const rangeError = start && end && start > end ? 'The start date must be on or before the end date.' : '';
    const filters = { q: query, category, status, start, end };
    const filterKey = JSON.stringify(filters);

    useEffect(() => {
        if (rangeError) return undefined;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/reports/events${buildQuery(JSON.parse(filterKey))}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                });
                const data = await res.json().catch(() => null);
                if (cancelled) return;
                if (!res.ok) { setError(data?.message || 'Could not load the report.'); return; }
                setError('');
                setReport(data);
            } catch {
                if (!cancelled) setError('Cannot connect to the server.');
            }
        })();
        return () => { cancelled = true; };
    }, [filterKey, rangeError]);

    const download = async (key, url, name) => {
        if (busy) return;
        setBusy(key);
        try {
            await downloadFile(url, name);
            toast('Report downloaded.', 'success');
        } catch (err) {
            toast(err.message || 'Could not download the report.', 'error');
        } finally {
            setBusy('');
        }
    };

    const filtering = Boolean(text || category || status || start || end);
    const totals = report?.totals;
    const events = report?.events || [];

    return (
        <Modal title="Event reports" subtitle="Search past and upcoming events and see how many residents joined and attended." onClose={onClose} size="xl"
            footer={
                <button type="button" disabled={Boolean(busy) || Boolean(rangeError) || !events.length}
                    onClick={() => download('all', `/api/reports/events${buildQuery({ ...filters, export: 'xlsx' })}`, 'EcoConnect_Event_Report.xlsx')}
                    className="eco-btn eco-btn-green">
                    <FileSpreadsheet className="h-4 w-4" /> {busy === 'all' ? 'Preparing…' : `Export ${filtering ? 'results' : 'all events'} to Excel`}
                </button>
            }>
            <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
                <label className="relative block">
                    <span className="sr-only">Search events</span>
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input type="search" className="eco-input h-10 pl-9" placeholder="Search title, location or details"
                        value={text} onChange={(e) => setText(e.target.value)} />
                </label>
                <select className="eco-input h-10" aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="">All categories</option>
                    {EVENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="eco-input h-10" aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">Any status</option>
                    <option value="upcoming">Open</option>
                    <option value="completed">Done</option>
                </select>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <label className="flex items-center gap-2">Event date from
                    <input type="date" className="eco-input h-10" value={start} max={end || undefined} onChange={(e) => setStart(e.target.value)} />
                </label>
                <label className="flex items-center gap-2">to
                    <input type="date" className="eco-input h-10" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} />
                </label>
                {filtering && (
                    <button type="button" onClick={() => { setText(''); setCategory(''); setStatus(''); setStart(''); setEnd(''); }}
                        className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-slate-900">
                        <X className="h-3.5 w-3.5" /> Clear filters
                    </button>
                )}
            </div>

            {rangeError || error ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{rangeError || error}</p>
            ) : !report ? <Spinner /> : (
                <>
                    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                        <Total label="Events" value={totals.events} />
                        <Total label="Registered" value={totals.registered} />
                        <Total label="Attended" value={totals.attended} />
                        <Total label="Attendance rate" value={`${totals.attendance_rate}%`} />
                        <Total label="Points given" value={totals.points_given} />
                    </div>
                    {events.length === 0 ? (
                        <EmptyState icon={<BarChart3 className="h-5 w-5" />} title={filtering ? 'No events match your search' : 'No events yet'} />
                    ) : (
                        <div className="-mx-5 overflow-x-auto sm:-mx-6">
                            <table className="eco-table min-w-[760px]">
                                <thead>
                                    <tr>
                                        <th>Event</th><th>Date</th><th>Status</th><th className="text-right">Registered</th>
                                        <th className="text-right">Attended</th><th className="text-right">Rate</th><th className="text-right">Points given</th><th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {events.map((e) => (
                                        <tr key={e.id}>
                                            <td>
                                                <p className="font-medium text-slate-900">{e.title}</p>
                                                <p className="eco-meta">{e.category} · {e.location}</p>
                                            </td>
                                            <td className="whitespace-nowrap">{e.date} · {e.time}</td>
                                            <td><span className={`eco-badge ${e.status === 'completed' ? 'eco-badge-slate' : 'eco-badge-green'}`}>{STATUS_LABEL[e.status] || e.status}</span></td>
                                            <td className="text-right">{e.registered}{e.max_participants ? ` / ${e.max_participants}` : ''}</td>
                                            <td className="text-right">{e.attended}</td>
                                            <td className="text-right">{e.attendance_rate}%</td>
                                            <td className="text-right">{e.points_given}</td>
                                            <td className="text-right">
                                                <button type="button" disabled={Boolean(busy)} title="Download this event's attendance"
                                                    onClick={() => download(`e${e.id}`, `/api/events/${e.id}/participants/export`, `Attendance_${e.id}.xlsx`)}
                                                    className="eco-btn eco-btn-outline eco-btn-sm whitespace-nowrap">
                                                    <FileSpreadsheet className="h-4 w-4" /> {busy === `e${e.id}` ? '…' : 'Attendance'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </Modal>
    );
}
