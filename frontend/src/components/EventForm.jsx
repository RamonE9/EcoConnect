import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { InputField, TextAreaField, SelectField } from './ui';
import { EVENT_CATEGORIES, PUERTO_PRINCESA, parseCoords } from '../lib/events';

L.Marker.prototype.options.icon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });

function PinPicker({ position, onPick }) {
    useMapEvents({ click: (e) => onPick(e.latlng) });
    return position ? <Marker position={position} /> : null;
}

/**
 * Event fields shared by "add event" and "edit event".
 * `value` is the form object; `onChange` receives the updated object.
 */
export default function EventForm({ value, onChange, onSubmit, submitting, submitLabel = 'Save event', onCancel }) {
    const set = (key) => (e) => onChange({ ...value, [key]: e.target.value });
    const coords = parseCoords(value.location);
    const today = new Date().toISOString().split('T')[0];

    return (
        <form onSubmit={onSubmit} className="space-y-5">
            <InputField label="Event title" required maxLength={100} placeholder="e.g. Coastal cleanup at Baywalk"
                value={value.title} onChange={set('title')} />

            <TextAreaField label="Description" required maxLength={2000} rows={3}
                placeholder="What will volunteers do? What should they bring?"
                value={value.description} onChange={set('description')} />

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <InputField label="Date" type="date" required min={today} value={value.date} onChange={set('date')} />
                <InputField label="Time" type="time" required value={value.time} onChange={set('time')} />
                <InputField label="Points reward" type="number" required min={1} max={500}
                    value={value.points_reward} onChange={set('points_reward')} />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <SelectField label="Category" value={value.category || 'General Cleanup'} onChange={set('category')}>
                    {EVENT_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </SelectField>
                <InputField label="Participant limit" type="number" min={1} max={10000} placeholder="No limit"
                    hint="Leave empty for no limit." value={value.max_participants ?? ''} onChange={set('max_participants')} />
            </div>

            <div>
                <div className="flex items-baseline justify-between">
                    <span className="eco-label">Location</span>
                    <span className="eco-meta">{coords ? `${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}` : 'Tap the map to drop a pin'}</span>
                </div>
                <div className="relative z-0 h-56 overflow-hidden rounded-lg border border-slate-200">
                    <MapContainer center={coords || PUERTO_PRINCESA} zoom={13} style={{ height: '100%', width: '100%' }}>
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <PinPicker position={coords}
                            onPick={(ll) => onChange({ ...value, location: `${ll.lat.toFixed(6)},${ll.lng.toFixed(6)}` })} />
                    </MapContainer>
                </div>
            </div>

            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                {onCancel && <button type="button" onClick={onCancel} className="eco-btn eco-btn-outline">Cancel</button>}
                <button type="submit" disabled={submitting || !value.location} className="eco-btn eco-btn-green">
                    {submitting ? 'Saving…' : submitLabel}
                </button>
            </div>
        </form>
    );
}
