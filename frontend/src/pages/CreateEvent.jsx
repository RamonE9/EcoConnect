import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EventForm from '../components/EventForm';
import { SimplePage } from '../components/ui';
import { toast } from '../lib/toast';
import { clearSession } from '../lib/api';

const EMPTY_EVENT = { title: '', description: '', location: '', date: '', time: '', points_reward: 10, category: 'General Cleanup' };

export default function CreateEvent() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState(EMPTY_EVENT);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        try {
            const res = await fetch('/api/events/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify(formData),
            });
            if (res.status === 401) {
                clearSession();
                toast('Your session expired. Please sign in again.', 'error');
                return navigate('/login-Barangay');
            }
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                toast('Event created', 'success');
                navigate('/admin');
            } else {
                toast(data.message || 'Could not create the event', 'error');
            }
        } catch {
            toast('Cannot connect to the server.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SimplePage title="New event" subtitle="Residents in your barangay will see it right away." backTo="/admin" backLabel="Back to dashboard" width="max-w-2xl">
            <div className="eco-card p-5 sm:p-6">
                <EventForm value={formData} onChange={setFormData} onSubmit={handleSubmit} submitting={submitting}
                    submitLabel="Create event" onCancel={() => navigate('/admin')} />
            </div>
        </SimplePage>
    );
}
