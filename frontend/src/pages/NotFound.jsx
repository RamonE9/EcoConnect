import { Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-white flex items-center justify-center px-5">
            <div className="w-full max-w-[400px] text-center">
                <span className="mx-auto grid place-items-center w-12 h-12 rounded-xl bg-brand-50 text-brand-700">
                    <Leaf className="w-6 h-6" aria-hidden="true" />
                </span>
                <p className="mt-6 text-sm font-semibold text-brand-700">404</p>
                <h1 className="mt-1 text-[28px] font-bold tracking-tight text-slate-900">Page not found</h1>
                <p className="mt-2 text-sm text-slate-500">The page you’re looking for doesn’t exist or was moved.</p>
                <div className="mt-8 space-y-3">
                    <Link to="/landing" className="eco-btn-primary">Go to home</Link>
                    <Link to="/login-Residence" className="eco-btn-secondary">Sign in</Link>
                </div>
            </div>
        </div>
    );
}
