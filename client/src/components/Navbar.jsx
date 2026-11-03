import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const SunIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={label} title={label}>
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <div className="brand">
          <span className="brand-mark">+</span> MediCare <strong>Connect</strong>
        </div>
        <div className="nav-end">
          <nav className={`nav-links ${open ? 'open' : ''}`}>
            <NavLink to="/" end onClick={close}>Home</NavLink>
            <NavLink to="/doctors" onClick={close}>Find Doctors</NavLink>
            <NavLink to="/hospitals" onClick={close}>Hospitals</NavLink>
            {user ? (
              <>
                {user.role === 'admin' ? (
                  <>
                    <NavLink to="/admin" end onClick={close}>Admin</NavLink>
                    <NavLink to="/admin/completions" onClick={close}>Completions</NavLink>
                  </>
                ) : (
                  <NavLink to="/dashboard" onClick={close}>Dashboard</NavLink>
                )}
                <NavLink to="/profile" onClick={close}>Profile</NavLink>
                <span className="nav-user">Hi, {user.name.split(' ')[0]}</span>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    logout();
                    close();
                    navigate('/');
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" onClick={close}>Login</NavLink>
                <Link to="/register" className="btn btn-primary btn-sm" onClick={close}>Sign up</Link>
              </>
            )}
          </nav>
          {/* Outside the collapsible menu so it's always one tap away on mobile too. */}
          <ThemeToggle />
          <button className="nav-toggle" aria-label="Toggle menu" onClick={() => setOpen((o) => !o)}>
            ☰
          </button>
        </div>
      </div>
    </header>
  );
}
