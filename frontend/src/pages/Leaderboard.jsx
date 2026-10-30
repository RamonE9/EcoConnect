import { SimplePage } from '../components/ui';
import LeaderboardList from '../components/LeaderboardList';

function storedUser() {
    try {
        return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
        return null;
    }
}

export default function Leaderboard() {
    const user = storedUser();
    const backTo = user && user.role !== 'resident' ? '/admin' : '/dashboard';
    return (
        <SimplePage title="Leaderboard" subtitle="Top environmental contributors." backTo={backTo} backLabel="Back to dashboard" width="max-w-2xl">
            <LeaderboardList currentUser={user} />
        </SimplePage>
    );
}
