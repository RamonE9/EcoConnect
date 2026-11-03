import { confirmDialog } from './confirm';
import { toast } from './toast';

export const isFinished = (event) => event?.status === 'completed' || event?.status === 'cancelled';

export async function changeEventStatus(event, action) {
    const finishing = action === 'finish';
    const ok = await confirmDialog(finishing ? {
        title: 'Mark this event as done?',
        message: `“${event.title}” will stop accepting participants, and no one else can be checked in. You can reopen it later if needed.`,
        confirmLabel: 'Mark as done',
    } : {
        title: 'Reopen this event?',
        message: 'Residents will be able to join again and you can record attendance.',
        confirmLabel: 'Reopen event',
    });
    if (!ok) return null;
    try {
        const res = await fetch(`/api/events/${event.id}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify({ action }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            toast(data.message || 'Could not update the event', 'error');
            return null;
        }
        toast(finishing ? `${data.message} ${data.attended} attended.` : data.message, 'success');
        return data.event;
    } catch (error) {
        toast(error.message || 'Cannot connect to the server', 'error');
        return null;
    }
}
