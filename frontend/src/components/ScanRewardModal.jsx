import ScanCodeModal from './ScanCodeModal';
import { displayName } from '../lib/names';

function itemLabel(redemption) {
    if (!redemption) return '';
    return `${(redemption.quantity || 1) > 1 ? `${redemption.quantity} × ` : ''}${redemption.item_name}`;
}

export default function ScanRewardModal({ onClose, onReleased }) {
    return (
        <ScanCodeModal
            title="Scan reward QR"
            subtitle="Scan the resident’s reward QR, then hand over the item."
            url="/api/finance/redemption/scan"
            successResult="released"
            hint="Point the camera at the reward QR on the resident’s phone."
            placeholder="Or type reward code, e.g. 7KQ2-M9XD"
            buttonLabel="Release"
            logTitle="Released this session"
            logText={(item) => `${itemLabel(item.redemption)} · ${displayName(item.user)}`}
            onSuccess={onReleased}
            onClose={onClose}
        />
    );
}
