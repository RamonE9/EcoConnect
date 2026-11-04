import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        console.error(error, info?.componentStack);
    }

    render() {
        if (!this.state.error) return this.props.children;
        const goHome = () => {
            this.setState({ error: null });
            window.location.assign('/');
        };
        return (
            <div className="flex min-h-screen items-center justify-center bg-white px-4 dark:bg-slate-950">
                <div className="w-full max-w-md text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Something went wrong</h1>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">This page ran into a problem. Reloading usually fixes it.</p>
                    <p className="mt-3 break-words rounded-lg bg-slate-100 px-3 py-2 font-mono text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {String(this.state.error?.message || this.state.error)}
                    </p>
                    <div className="mt-5 flex justify-center gap-2">
                        <button type="button" onClick={() => window.location.reload()} className="eco-btn eco-btn-primary">Reload page</button>
                        <button type="button" onClick={goHome} className="eco-btn eco-btn-outline">Go to sign in</button>
                    </div>
                </div>
            </div>
        );
    }
}
