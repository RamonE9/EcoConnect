import { useEffect, useState } from 'react';
import { Download, MoreVertical, PlusSquare, Share, Smartphone } from 'lucide-react';
import { Modal } from './ui';

const SEEN_KEY = 'ecoconnect_install_prompt_seen';

let deferredPrompt = null;
const promptListeners = new Set();
window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    promptListeners.forEach((fn) => fn(event));
});

function detectPlatform() {
    const ua = navigator.userAgent || '';
    const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    if (/iPhone|iPad|iPod/i.test(ua) || iPadOS) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    return null;
}

function isInstalled() {
    return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function seenThisVisit() {
    try {
        return sessionStorage.getItem(SEEN_KEY) === '1';
    } catch {
        return false;
    }
}

function markSeen() {
    try {
        sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
    }
}

const STEPS = {
    android: [
        { icon: MoreVertical, text: <>Open EcoConnect in <b>Chrome</b> and tap the <b>⋮ menu</b> at the top right.</> },
        { icon: Download, text: <>Tap <b>Install app</b> (or <b>Add to Home screen</b>).</> },
        { icon: Smartphone, text: <>Tap <b>Install</b>. EcoConnect appears on your home screen like a normal app.</> },
    ],
    ios: [
        { icon: Share, text: <>Open EcoConnect in <b>Safari</b> and tap the <b>Share</b> button (the square with an arrow) at the bottom.</> },
        { icon: PlusSquare, text: <>Scroll down and tap <b>Add to Home Screen</b>.</> },
        { icon: Smartphone, text: <>Tap <b>Add</b> at the top right. EcoConnect appears on your home screen.</> },
    ],
};

export default function InstallAppPrompt() {
    const [platform] = useState(detectPlatform);
    const [tab, setTab] = useState(platform || 'android');
    const [open, setOpen] = useState(() => Boolean(platform) && !isInstalled() && !seenThisVisit());
    const [installEvent, setInstallEvent] = useState(deferredPrompt);

    useEffect(() => {
        if (open) markSeen();
    }, [open]);

    useEffect(() => {
        promptListeners.add(setInstallEvent);
        const onInstalled = () => setOpen(false);
        window.addEventListener('appinstalled', onInstalled);
        return () => {
            promptListeners.delete(setInstallEvent);
            window.removeEventListener('appinstalled', onInstalled);
        };
    }, []);

    if (!open) return null;

    const installNow = async () => {
        installEvent.prompt();
        const { outcome } = await installEvent.userChoice;
        deferredPrompt = null;
        setInstallEvent(null);
        if (outcome === 'accepted') setOpen(false);
    };

    return (
        <Modal
            title="Install EcoConnect"
            subtitle="Add it to your home screen for quicker access, full screen, like a regular app."
            onClose={() => setOpen(false)}
            size="sm"
            footer={
                <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={() => setOpen(false)} className="eco-btn eco-btn-outline">Maybe later</button>
                    {tab === 'android' && installEvent && (
                        <button type="button" onClick={installNow} className="eco-btn eco-btn-green">
                            <Download className="h-4 w-4" /> Install now
                        </button>
                    )}
                </div>
            }
        >
            <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Phone type">
                {[['android', 'Android'], ['ios', 'iPhone / iPad']].map(([key, label]) => (
                    <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                        className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
                        {label}
                    </button>
                ))}
            </div>

            <ol className="space-y-3">
                {STEPS[tab].map((step, index) => {
                    const StepIcon = step.icon;
                    return (
                        <li key={index} className="flex items-start gap-3">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                                <StepIcon className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <p className="pt-1 text-sm text-slate-700"><span className="font-semibold text-slate-900">{index + 1}.</span> {step.text}</p>
                        </li>
                    );
                })}
            </ol>

            {tab === 'ios' && (
                <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                    Using Chrome on iPhone? Tap the Share button in the address bar, then <b>Add to Home Screen</b>.
                </p>
            )}
        </Modal>
    );
}
