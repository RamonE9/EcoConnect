import { Leaf, Award, MapPin, Users, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Landing() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                <div className="flex justify-center mb-6">
                    <div className="bg-green-100 p-4 rounded-full">
                        <Leaf className="w-12 h-12 text-green-600" />
                    </div>
                </div>

                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                    EcoConnect
                </h1>
                <p className="text-slate-600 mb-8 max-w-sm mx-auto">
                    Inspiring Puerto Princesa to Clean, Connect, and Earn Together. Choose your gateway to the system.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-stretch w-full max-w-2xl">
                    {/* Citizen Portal */}
                    <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 w-full hover:border-green-300 transition-all group flex flex-col">
                        <div className="bg-green-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                            <Leaf className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-slate-800 text-lg mb-1">Citizen Portal</h3>
                        <p className="text-[10px] font-mono text-green-600 uppercase tracking-widest mb-4 font-black italic">For Residents</p>
                        <p className="text-slate-500 text-sm mb-6 flex-grow">Join cleanup events and earn points for your community service.</p>
                        <Link
                            to="/login-Residence"
                            className="block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-95 text-center"
                        >
                            Open Portal
                        </Link>
                    </div>

                    {/* Admin Command Center */}
                    <div className="bg-slate-900 p-6 rounded-3xl shadow-xl border border-slate-800 w-full hover:border-red-500/50 transition-all group flex flex-col">
                        <div className="bg-slate-800 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors">
                            <Shield className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-white text-lg mb-1">Command Center</h3>
                        <p className="text-[10px] font-mono text-red-500 uppercase tracking-widest mb-4 font-black italic">For Barangay Officials</p>
                        <p className="text-slate-400 text-sm mb-6 flex-grow">Manage local events, monitor participation, and oversee jurisdiction stats.</p>
                        <Link
                            to="/login-Barangay"
                            className="block w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-95 text-center"
                        >
                            Access Console
                        </Link>
                    </div>
                </div>
            </div>

            <p className="mt-8 text-sm text-slate-400">
                Project Initialized Successfully
            </p>
        </div>
    );
}
