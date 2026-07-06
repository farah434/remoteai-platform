import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const handleAvatarClick = () => {
    closeMenu();
    navigate('/profile');
  };

  const handleLogout = () => {
    closeMenu();
    logout();
  };

  return (
    <nav className="navbar">
      <div className="nav-inner">
        <NavLink to="/" className="nav-logo" onClick={closeMenu}>
          <div className="logo-icon">✦</div>
          <span>RemoteAI</span>
        </NavLink>

        <button
          type="button"
          className="nav-toggle"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(o => !o)}
        >
          <span className={'nav-toggle-bar' + (menuOpen ? ' open' : '')} />
          <span className={'nav-toggle-bar' + (menuOpen ? ' open' : '')} />
          <span className={'nav-toggle-bar' + (menuOpen ? ' open' : '')} />
        </button>

        <div className={'nav-collapse' + (menuOpen ? ' open' : '')}>
          <div className="nav-links">
            <NavLink to="/" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')} end onClick={closeMenu}>Home</NavLink>
            <NavLink to="/jobs" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')} onClick={closeMenu}>Jobs</NavLink>
            {user && <NavLink to="/profile" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')} onClick={closeMenu}>Profile</NavLink>}
          </div>

          <div className="nav-actions">
            {user ? (
              <>
                <div className="user-avatar" title={user.name} onClick={handleAvatarClick}>{user.avatar}</div>
                <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="btn btn-ghost btn-sm" onClick={closeMenu}>Login</NavLink>
                <NavLink to="/signup" className="btn btn-primary btn-sm" onClick={closeMenu}>Sign Up</NavLink>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
