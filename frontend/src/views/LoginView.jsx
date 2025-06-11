import React, { useState } from 'react';

function LoginView({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const API_BASE_URL = import.meta.env.VITE_API_URL;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        onLogin(data.token);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to login');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#111827' }}>
      <div style={{ width: 320, padding: '2rem', background: '#232b3b', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img
            src="/the-local-choice-logo.png"
            alt="Pharmacy Logo"
            style={{ height: 50, width: 'auto' }}
          />
        </div>
        <h2 style={{ color: '#fff', textAlign: 'center', marginBottom: '2rem', fontSize: '2rem' }}>Login</h2>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="username" style={{ color: '#bdbdbd', display: 'block', marginBottom: '0.5rem' }}>Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem', background: '#374151', border: '1px solid #4B5563', borderRadius: 8, color: '#fff', boxSizing: 'border-box' }}
              required
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="password" style={{ color: '#bdbdbd', display: 'block', marginBottom: '0.5rem' }}>Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem', background: '#374151', border: '1px solid #4B5563', borderRadius: 8, color: '#fff', boxSizing: 'border-box' }}
              required
            />
          </div>
          {error && <p style={{ color: '#EF4444', textAlign: 'center', marginBottom: '1.5rem' }}>{error}</p>}
          <button
            type="submit"
            style={{ width: '100%', padding: '0.8rem 1rem', background: '#FF4500', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', transition: 'background 0.2s' }}
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginView; 