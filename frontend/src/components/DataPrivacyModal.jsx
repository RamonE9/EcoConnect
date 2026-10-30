import { Modal } from './ui';

const SECTIONS = [
    {
        title: '1. Information we collect',
        body: 'To run community cleanup drives and verify residency, we collect:',
        list: ['Name and contact details', 'Barangay of residence', 'A government or barangay ID (for verification)', 'Event attendance and Eco-Points records'],
    },
    {
        title: '2. Why we process it',
        list: [
            'To verify that you live in a Puerto Princesa barangay.',
            'To organize cleanup drives and keep participants safe.',
            'To record, credit and redeem Eco-Points.',
            'To send notices about barangay activities.',
        ],
    },
    {
        title: '3. Confidentiality and protection',
        body: 'Only authorized barangay officials and system administrators can see your personal data and ID. We do not sell, trade or share your data with unauthorized third parties or businesses.',
    },
    {
        title: '4. Your rights under RA 10173',
        list: ['Be informed about how your data is processed', 'Access your personal records', 'Correct inaccurate information', 'Ask for your data to be removed or blocked'],
    },
];

export default function DataPrivacyModal({ isOpen, onClose, onAccept }) {
    if (!isOpen) return null;

    return (
        <Modal
            title="Data Privacy Notice"
            subtitle="Republic Act No. 10173 — Data Privacy Act of 2012"
            onClose={onClose}
            size="lg"
            footer={
                <>
                    <button type="button" onClick={onClose} className="eco-btn eco-btn-outline">Close</button>
                    <button type="button" onClick={() => (onAccept ? onAccept() : onClose())} className="eco-btn eco-btn-green">
                        I understand and accept
                    </button>
                </>
            }
        >
            <p className="text-sm leading-relaxed text-slate-600">
                EcoConnect follows the Philippine Data Privacy Act of 2012 and its implementing rules. This notice explains what we collect, why, and how we protect it.
            </p>
            <div className="mt-6 space-y-6">
                {SECTIONS.map((section) => (
                    <section key={section.title}>
                        <h3 className="text-sm font-semibold text-slate-900">{section.title}</h3>
                        {section.body && <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{section.body}</p>}
                        {section.list && (
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600 marker:text-brand-600">
                                {section.list.map((item) => <li key={item}>{item}</li>)}
                            </ul>
                        )}
                    </section>
                ))}
            </div>
        </Modal>
    );
}
