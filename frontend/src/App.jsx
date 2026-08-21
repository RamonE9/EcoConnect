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
import AdminSignup from './pages/AdminSignup';
import AdminForgotPassword from './pages/AdminForgotPassword';
import ForgotPassword from './pages/ForgotPassword';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login-Residence" replace />} />
        <Route path="/login-Residence" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create-event" element={<CreateEvent />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/manage-participants/:eventId" element={<ManageParticipants />} />

        {/* Admin Routes */}
        <Route path="/login-Barangay" element={<AdminLogin />} />
        <Route path="/admin/signup" element={<AdminSignup />} />
        <Route path="/admin/forgot-password" element={<AdminForgotPassword />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/edit-event/:eventId" element={<EditEvent />} />
      </Routes>
    </Router>
  );
}

export default App;
