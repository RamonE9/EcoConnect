import ScanCodeModal from './ScanCodeModal';

export default function ScanAttendanceModal({ event, onClose, onCheckedIn }) {
    return (
        <ScanCodeModal
            title="Scan attendance"
            subtitle={`${event.title} · +${event.points_reward} pts per attendee`}
            url={`/api/events/${event.id}/check-in`}
            successResult="checked_in"
            hint="Point the camera at the resident’s event ticket."
            placeholder="Or type ticket code, e.g. 7KQ2-M9XD"
            buttonLabel="Check in"
            logTitle="Checked in this session"
            onSuccess={onCheckedIn}
            onClose={onClose}
        />
    );
}
