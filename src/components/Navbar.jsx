import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="nav-inner">
        <NavLink to="/" className="nav-logo">
          <div className="logo-icon">✦</div>
          <span>RemoteAI</span>
        </NavLink>

        <div className="nav-links">
          <NavLink to="/" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')} end>Home</NavLink>
          <NavLink to="/jobs" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Jobs</NavLink>
          {user && <NavLink to="/profile" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Profile</NavLink>}
          {user && <NavLink to="/resume-builder" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Resume Builder</NavLink>}
        </div>

        <div className="nav-actions">
          {user ? (
            <>
              <div className="user-avatar" title={user.name} onClick={() => navigate('/profile')}>{user.avatar}</div>
              <button className="btn btn-ghost btn-sm" onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="btn btn-ghost btn-sm">Login</NavLink>
              <NavLink to="/signup" className="btn btn-primary btn-sm">Sign Up</NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
