import React from 'react';
import { COLORWAYS } from '../theme';

const ProfileCard = ({ user, theme }) => (
  <div
    style={{
      background: 'var(--bg-main)',
      borderRadius: 18,
      boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
      padding: '2.5rem 2.5rem 2rem 2.5rem',
      minWidth: 340,
      maxWidth: 420,
      width: '100%',
      color: 'var(--text-main)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 18,
    }}
  >
    <h2 style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '2.1rem', marginBottom: 8, marginTop: 0 }}>
      User Dashboard
    </h2>
    {user ? (
      <>
        <img
          src={user.picture}
          alt={user.name}
          style={{ width: 80, height: 80, borderRadius: '50%', border: '3px solid var(--accent)', marginBottom: 12 }}
        />
        <div style={{ fontSize: '1.3rem', fontWeight: 600, color: 'var(--accent)' }}>{user.name}</div>
        <div style={{ fontSize: '1.1rem', opacity: 0.85 }}>{user.email}</div>
        <div style={{ marginTop: 18, width: '100%', textAlign: 'center' }}>
          <div style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: 6 }}>Current Theme</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: COLORWAYS[theme]['--accent'], border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.10)' }} />
            <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{COLORWAYS[theme].name}</span>
          </div>
        </div>
      </>
    ) : (
      <div style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '1.2rem', marginTop: 24 }}>
        Please log in to view your dashboard.
      </div>
    )}
  </div>
);

export default ProfileCard;


