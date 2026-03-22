import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import LessonList from './pages/LessonList';
import Study from './pages/Study';
import Quiz from './pages/Quiz';
import NuancePractice from './pages/NuancePractice';
import TypingExercise from './pages/TypingExercise';
import Progress from './pages/Progress';
import Admin from './pages/Admin';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;
  return user ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;
  if (!user) return <Navigate to="/login" />;
  return isAdmin ? children : <Navigate to="/" />;
}

export default function App() {
  const { user } = useAuth();
  return (
    <div className="app">
      {user && <Navbar />}
      <main className={user ? 'main-content' : ''}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/lessons" element={<ProtectedRoute><LessonList /></ProtectedRoute>} />
          <Route path="/study/:lessonId" element={<ProtectedRoute><Study /></ProtectedRoute>} />
          <Route path="/quiz/:lessonId" element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
          <Route path="/nuance/:lessonId" element={<ProtectedRoute><NuancePractice /></ProtectedRoute>} />
          <Route path="/typing/:lessonId" element={<ProtectedRoute><TypingExercise /></ProtectedRoute>} />
          <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
        </Routes>
      </main>
    </div>
  );
}
