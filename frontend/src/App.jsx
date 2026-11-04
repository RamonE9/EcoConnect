import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import CreateEvent from './pages/CreateEvent';
import Leaderboard from './pages/Leaderboard';
import ManageParticipants from './pages/ManageParticipants';
import AdminDashboard from './pages/AdminDashboard';
import EditEvent from './pages/EditEvent';
import AdminLogin from './pages/AdminLogin';
import AdminForgotPassword from './pages/AdminForgotPassword';
import ForgotPassword from './pages/ForgotPassword';
import NotFound from './pages/NotFound';
import SetPassword from './pages/SetPassword';
import { Toaster } from './components/Toast';
import { ConfirmHost } from './components/ConfirmDialog';
import InstallAppPrompt from './components/InstallAppPrompt';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <Router>
      <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/login-Residence" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create-event" element={<CreateEvent />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/manage-participants/:eventId" element={<ManageParticipants />} />

        <Route path="/login-Barangay" element={<AdminLogin />} />
        <Route path="/admin/forgot-password" element={<AdminForgotPassword />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/edit-event/:eventId" element={<EditEvent />} />
        <Route path="/set-password" element={<SetPassword />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
      </ErrorBoundary>
      <Toaster />
      <ConfirmHost />
      <InstallAppPrompt />
    </Router>
  );
}

export default App;
