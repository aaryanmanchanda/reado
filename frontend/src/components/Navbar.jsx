import React from 'react';
import { useNavigate } from 'react-router-dom';
import { NAVBAR_HEIGHT, COLORWAYS } from '../theme';

const Navbar = ({ theme, onThemeChange, user, onLogout, showUserNavToDashboard }) => {
  const navigate = useNavigate();
  return (
    <nav
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
      <div style={{ marginLeft: 'auto', marginRight: '2vw', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '1.1rem', marginRight: 8 }}>Theme:</span>
        <select
          value={theme}
          onChange={e => onThemeChange && onThemeChange(e.target.value)}
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
          {Object.entries(COLORWAYS).map(([key, val]) => (
            <option key={key} value={key}>{val.name}</option>
          ))}
        </select>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 16 }}>
            <div
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
              <span style={{
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
            onClick={() => {
              window.location.href = 'https://api.reado.co.in/users/auth/google';
            }}
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


