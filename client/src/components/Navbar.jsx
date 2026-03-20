import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">📚 Collocation Master</Link>
      <div className="navbar-links">
        <Link to="/" className={isActive('/')}>Dashboard</Link>
        <Link to="/lessons" className={isActive('/lessons')}>Bài học</Link>
        <Link to="/progress" className={isActive('/progress')}>Tiến trình</Link>
        {isAdmin && <Link to="/admin" className={isActive('/admin')}>Admin</Link>}
        <button onClick={logout} style={{ color: 'var(--text-muted)' }}>Đăng xuất</button>
      </div>
    </nav>
  );
}
