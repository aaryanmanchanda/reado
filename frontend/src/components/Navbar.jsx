import React from 'react';
import { useNavigate } from 'react-router-dom';
import { NAVBAR_HEIGHT, COLORWAYS, getThemesGrouped } from '../theme';
import './Navbar.css';

const Navbar = ({ theme, onThemeChange, user, onLogout, showUserNavToDashboard }) => {
  const navigate = useNavigate();
  return (
    <nav
      className="navbar-app"
      aria-label="Main navigation"
      style={{
        width: '100%',
        height: NAVBAR_HEIGHT,
        background: 'var(--bg-main)',
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 100,
      }}
    >
      <div
        className="navbar-logo"
        style={{
          fontFamily: '"Futura"',
          fontSize: '2.3rem',
          color: 'var(--accent)',
          marginLeft: '2vw',
          letterSpacing: '2px',
          userSelect: 'none',
          textShadow: '0 2px 8px rgba(0,0,0,0.18)',
          cursor: 'pointer',
        }}
        onClick={() => navigate('/')}
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter') navigate('/'); }}
        aria-label="Go to home page"
      >
        reado
      </div>
      <div className="navbar-right" style={{ marginLeft: 'auto', marginRight: '2vw', display: 'flex', alignItems: 'center', gap: 12 }}>
        <label htmlFor="navbar-theme-select" className="navbar-theme-label" style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '1.1rem', marginRight: 8 }}>Theme:</label>
        <select
          id="navbar-theme-select"
          value={theme}
          onChange={e => onThemeChange && onThemeChange(e.target.value)}
          aria-label="Choose color theme"
          style={{
            background: 'var(--bg-panel)',
            color: 'var(--accent)',
            border: '1.5px solid var(--accent)',
            borderRadius: 8,
            fontSize: '1.1rem',
            padding: '0.3em 1em',
            fontWeight: 600,
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <optgroup label="Light Themes">
            {getThemesGrouped().lightThemes.map(([key, val]) => (
              <option key={key} value={key}>{val.name}</option>
            ))}
          </optgroup>
          <optgroup label="Dark Themes">
            {getThemesGrouped().darkThemes.map(([key, val]) => (
              <option key={key} value={key}>{val.name}</option>
            ))}
          </optgroup>
        </select>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 16 }}>
            <div
              role={showUserNavToDashboard ? 'button' : undefined}
              tabIndex={showUserNavToDashboard ? 0 : undefined}
              onKeyDown={e => { if (showUserNavToDashboard && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); navigate('/dashboard'); } }}
              aria-label={showUserNavToDashboard ? 'Go to Dashboard' : undefined}
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: showUserNavToDashboard ? 'pointer' : 'default' }}
              onClick={() => showUserNavToDashboard ? navigate('/dashboard') : null}
              title={showUserNavToDashboard ? 'Go to Dashboard' : undefined}
            >
              <img
                src={user.picture}
                alt={user.name}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: '2px solid var(--accent)'
                }}
              />
              <span className="navbar-user-name" style={{
                color: 'var(--accent)',
                fontWeight: 600,
                fontSize: '1rem',
                whiteSpace: 'nowrap',
                overflow: 'visible',
                textOverflow: 'unset',
              }}>
                {user.name}
              </span>
            </div>
            <button
              className="logout-btn"
              onClick={onLogout}
              style={{
                background: 'var(--accent)',
                color: 'var(--text-dark)',
                border: 'none',
                borderRadius: 8,
                fontSize: '1rem',
                padding: '0.4em 1.2em',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.13)',
                outline: 'none',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            className="login-btn"
            onClick={() => {
              window.location.href = 'https://api.reado.co.in/users/auth/google';
            }}
            aria-label="Log in with Google"
            style={{
              marginLeft: 16,
              background: 'var(--accent)',
              color: 'var(--text-dark)',
              border: 'none',
              borderRadius: 8,
              fontSize: '1.1rem',
              padding: '0.4em 1.2em',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.13)',
              outline: 'none',
              transition: 'background 0.2s',
            }}
          >
            Login
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;


