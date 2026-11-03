import { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { Modal, InputField } from './ui';
import { readMessage } from '../lib/api';
import { toast } from '../lib/toast';

/*
 * Officials pick "Overall" or a date range, then download the statistics
 * report (every feature, their barangay only) as an Excel file.
 */

const isoDay = (date) => {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
};

function presetRange(key) {
    const today = new Date();
    if (key === 'month') return [isoDay(new Date(today.getFullYear(), today.getMonth(), 1)), isoDay(today)];
    if (key === '30days') return [isoDay(new Date(today.getTime() - 29 * 86400000)), isoDay(today)];
    return [isoDay(new Date(today.getFullYear(), 0, 1)), isoDay(today)];
}

const PRESETS = [['month', 'This month'], ['30days', 'Last 30 days'], ['year', 'This year']];

export default function ReportModal({ barangay, onClose }) {
    const [mode, setMode] = useState('overall');
    const [[start, end], setRange] = useState(() => presetRange('month'));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const rangeError = mode === 'range' && (!start || !end ? 'Choose both a start and an end date.'
        : start > end ? 'The start date must be on or before the end date.' : '');

    const download = async () => {
        if (loading || rangeError) return;
        setLoading(true);
        setError('');
        try {
            const query = mode === 'range' ? `?start=${start}&end=${end}` : '';
            const res = await fetch(`/api/reports/statistics${query}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            if (!res.ok) return setError(await readMessage(res, 'Could not generate the report.'));
            const blob = await res.blob();
            const name = /filename="?([^";]+)"?/.exec(res.headers.get('Content-Disposition') || '')?.[1]
                || `EcoConnect_Report_${barangay}.xlsx`;
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = name;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            toast('Report downloaded.', 'success');
            onClose();
        } catch (err) {
            setError(err.message?.includes('too long') ? err.message : 'Cannot connect to the server. Check your internet connection.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title="Generate statistics report"
            subtitle={`Every feature for Barangay ${barangay || ''}, exported to Excel.`}
            onClose={onClose}
            size="sm"
            footer={
                <>
                    <button type="button" onClick={onClose} className="eco-btn eco-btn-outline">Cancel</button>
                    <button type="button" onClick={download} disabled={loading || Boolean(rangeError)} className="eco-btn eco-btn-green">
                        <FileSpreadsheet className="h-4 w-4" /> {loading ? 'Generating…' : 'Download Excel'}
                    </button>
                </>
            }
        >
            <fieldset className="space-y-2">
                <legend className="eco-label">Report period</legend>
                {[['overall', 'Overall', 'Everything since the system started.'], ['range', 'Specific date range', 'Only activity between two dates.']].map(([key, label, hint]) => (
                    <label key={key} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${mode === key ? 'border-brand-600 bg-brand-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <input type="radio" name="period" value={key} checked={mode === key} onChange={() => setMode(key)} className="mt-0.5 h-4 w-4 accent-brand-700" />
                        <span>
                            <span className="block text-sm font-semibold text-slate-900">{label}</span>
                            <span className="block text-xs text-slate-500">{hint}</span>
                        </span>
                    </label>
                ))}
            </fieldset>

            {mode === 'range' && (
                <div className="mt-4 space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                        {PRESETS.map(([key, label]) => (
                            <button key={key} type="button" onClick={() => setRange(presetRange(key))} className="eco-btn eco-btn-outline eco-btn-sm">{label}</button>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <InputField label="From" type="date" value={start} max={end || undefined} onChange={(e) => setRange([e.target.value, end])} />
                        <InputField label="To" type="date" value={end} min={start || undefined} onChange={(e) => setRange([start, e.target.value])} />
                    </div>
                    {rangeError && <p className="text-sm text-red-600">{rangeError}</p>}
                </div>
            )}

            <p className="mt-4 text-xs text-slate-500">
                Includes a summary plus sheets for events, event categories, attendance, new residents, bonus points,
                reward claims, rewards catalog, transfers and the leaderboard.
            </p>
            {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </Modal>
    );
}
