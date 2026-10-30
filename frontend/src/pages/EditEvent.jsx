import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EventForm from '../components/EventForm';
import { SimplePage, Spinner, EmptyState } from '../components/ui';
import { toast } from '../lib/toast';
import { clearSession } from '../lib/api';

export default function EditEvent() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const handleUnauthorized = () => {
        clearSession();
        toast('Your session expired. Please sign in again.', 'error');
        navigate('/login-Barangay');
    };

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/events/', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
                if (res.status === 401) return handleUnauthorized();
                const events = await res.json();
                const event = (Array.isArray(events) ? events : []).find((e) => e.id === parseInt(eventId));
                if (event) setFormData(event);
            } catch {
                toast('Cannot connect to the server.', 'error');
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/events/${eventId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify(formData),
            });
            if (res.status === 401) return handleUnauthorized();
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                toast('Event updated', 'success');
                navigate('/admin');
            } else {
                toast(data.message || 'Could not update the event', 'error');
            }
        } catch {
            toast('Cannot connect to the server.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SimplePage title="Edit event" subtitle="Changes are visible to residents immediately." backTo="/admin" backLabel="Back to dashboard" width="max-w-2xl">
            {loading ? <Spinner /> : !formData ? (
                <EmptyState title="Event not found" text="It may have been deleted, or it belongs to another barangay." />
            ) : (
                <div className="eco-card p-5 sm:p-6">
                    <EventForm value={formData} onChange={setFormData} onSubmit={handleSubmit} submitting={submitting}
                        submitLabel="Save changes" onCancel={() => navigate('/admin')} />
                </div>
            )}
        </SimplePage>
    );
}
