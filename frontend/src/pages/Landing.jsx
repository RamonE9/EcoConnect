import { useState } from 'react';
import { Leaf, Award, MapPin, Users, Shield, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import DataPrivacyModal from '../components/DataPrivacyModal';

export default function Landing() {
    const [showPrivacyModal, setShowPrivacyModal] = useState(() => {
        try {
            return !localStorage.getItem('ecoconnect_privacy_acknowledged');
        } catch {
            return false;
        }
    });

    const handleAcceptPrivacy = () => {
        localStorage.setItem('ecoconnect_privacy_acknowledged', 'true');
        setShowPrivacyModal(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6">
            <div className="bg-white p-6 sm:p-10 rounded-3xl sm:rounded-4xl shadow-xl max-w-3xl w-full text-center border border-slate-100">
                <div className="flex justify-center mb-6">
                    <div className="bg-green-100 p-4 rounded-full shadow-inner">
                        <Leaf className="w-12 h-12 text-green-600" />
                    </div>
                </div>

                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">
                    EcoConnect
                </h1>
                <p className="text-slate-600 mb-8 max-w-md mx-auto text-sm sm:text-base leading-relaxed">
                    Inspiring Puerto Princesa to Clean, Connect, and Earn Together. Choose your gateway to the system.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 justify-center items-stretch w-full">
                    {/* Citizen Portal */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:border-green-400 hover:shadow-lg transition-all group flex flex-col text-left">
                        <div className="bg-green-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                            <Leaf className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-slate-800 text-lg mb-1">Citizen Portal</h3>
                        <p className="text-[10px] font-mono text-green-600 uppercase tracking-widest mb-3 font-black">For Residents</p>
                        <p className="text-slate-500 text-sm mb-6 flex-grow">Join cleanup events and earn points for your community service.</p>
                        <Link
                            to="/login-Residence"
                            className="block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md active:scale-95 text-center text-sm"
                        >
                            Open Portal
                        </Link>
                    </div>

                    {/* Admin Command Center */}
                    <div className="bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-800 hover:border-red-500/50 hover:shadow-lg transition-all group flex flex-col text-left">
                        <div className="bg-slate-800 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors">
                            <Shield className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-white text-lg mb-1">Command Center</h3>
                        <p className="text-[10px] font-mono text-red-500 uppercase tracking-widest mb-3 font-black">For Barangay Officials</p>
                        <p className="text-slate-400 text-sm mb-6 flex-grow">Manage local events, monitor participation, and oversee jurisdiction stats.</p>
                        <Link
                            to="/login-Barangay"
                            className="block w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md active:scale-95 text-center text-sm border border-slate-700"
                        >
                            Access Console
                        </Link>
                    </div>
                </div>

                {/* Data Privacy Trigger Button inside Card */}
                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center">
                    <button
                        type="button"
                        onClick={() => setShowPrivacyModal(true)}
                        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-green-700 bg-slate-50 hover:bg-green-50 px-4 py-2 rounded-xl transition-all border border-slate-200"
                    >
                        <Shield className="w-4 h-4 text-green-600" />
                        Data Privacy Act (RA 10173) Awareness & Policy
                    </button>
                </div>
            </div>

            <p className="mt-6 text-xs sm:text-sm text-slate-400 font-medium text-center">
                EcoConnect • Puerto Princesa City Cleanliness & Connectivity
            </p>

            {/* Data Privacy Modal */}
            <DataPrivacyModal
                isOpen={showPrivacyModal}
                onClose={() => setShowPrivacyModal(false)}
                onAccept={handleAcceptPrivacy}
            />
        </div>
    );
}
