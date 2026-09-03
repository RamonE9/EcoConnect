import React from 'react';
import { Shield, Lock, FileCheck, X, CheckCircle2, AlertCircle } from 'lucide-react';

export default function DataPrivacyModal({ isOpen, onClose, onAccept }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-3xl sm:rounded-4xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-700 p-6 sm:p-8 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                            <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                        </div>
                        <div>
                            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest bg-white/20 px-2.5 py-0.5 rounded-full">
                                Republic Act No. 10173
                            </span>
                            <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1">
                                Data Privacy Act Awareness
                            </h2>
                        </div>
                    </div>
                    <p className="text-xs sm:text-sm text-green-100 font-medium">
                        EcoConnect is committed to protecting your personal data and upholding your rights as a data subject.
                    </p>
                </div>

                {/* Scrollable Content */}
                <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-700 text-sm leading-relaxed custom-scrollbar">
                    {/* Overview */}
                    <div className="bg-green-50/70 border border-green-200/80 rounded-2xl p-4 flex gap-3 items-start">
                        <AlertCircle className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
                        <p className="text-xs sm:text-sm text-green-900 font-medium">
                            In accordance with the <strong>Philippine Data Privacy Act of 2012 (RA 10173)</strong> and its Implementing Rules and Regulations (IRR), this notice explains how EcoConnect collects, uses, and protects your information.
                        </p>
                    </div>

                    {/* Section 1: What We Collect */}
                    <div className="space-y-2">
                        <h3 className="font-extrabold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
                            <FileCheck className="w-4 h-4 text-green-600" />
                            1. Personal Information We Collect
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600">
                            To facilitate environmental initiatives and residency verification, we collect:
                        </p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-slate-600 pt-1">
                            <li className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0"></span>
                                <span>Full Name & Contact Information</span>
                            </li>
                            <li className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0"></span>
                                <span>Barangay Residence Details</span>
                            </li>
                            <li className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0"></span>
                                <span>Valid Government ID (for verification)</span>
                            </li>
                            <li className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0"></span>
                                <span>Event Attendance & Eco-Points Records</span>
                            </li>
                        </ul>
                    </div>

                    {/* Section 2: Purpose */}
                    <div className="space-y-2">
                        <h3 className="font-extrabold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
                            <Lock className="w-4 h-4 text-green-600" />
                            2. Purpose of Processing
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600">
                            Your data is processed strictly for legitimate community purposes:
                        </p>
                        <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-600">
                            <li>To verify resident identity and eligibility within Puerto Princesa barangays.</li>
                            <li>To coordinate community cleanup drives, monitor waste collection, and ensure participant safety.</li>
                            <li>To accurately record, credit, and redeem ecological reward points.</li>
                            <li>To provide automated notifications regarding scheduled barangay activities.</li>
                        </ul>
                    </div>

                    {/* Section 3: Data Protection & Sharing */}
                    <div className="space-y-2">
                        <h3 className="font-extrabold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
                            <Shield className="w-4 h-4 text-green-600" />
                            3. Confidentiality and Protection
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600">
                            EcoConnect employs strict administrative and technical safeguards. Access to your personal data and verification IDs is strictly limited to authorized barangay officials and system administrators. <strong>We do not sell, trade, or share your personal data with any unauthorized third parties or commercial entities.</strong>
                        </p>
                    </div>

                    {/* Section 4: Your Rights */}
                    <div className="space-y-2">
                        <h3 className="font-extrabold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            4. Your Rights Under RA 10173
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600">
                            As a registered resident, you have the right to:
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm text-slate-600 pt-1">
                            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 font-medium">✓ Be informed of data processing</div>
                            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 font-medium">✓ Access your personal records</div>
                            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 font-medium">✓ Correct or update inaccuracies</div>
                            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 font-medium">✓ Request removal or blocking</div>
                        </div>
                    </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <p className="text-[11px] text-slate-500 text-center sm:text-left">
                        By continuing, you acknowledge that you have read and understood our Data Privacy Policy.
                    </p>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs sm:text-sm hover:bg-slate-100 transition-all active:scale-95"
                        >
                            Close
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (onAccept) onAccept();
                                else onClose();
                            }}
                            className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-green-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            I Understand & Accept
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
