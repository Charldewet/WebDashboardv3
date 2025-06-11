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
      <div style={{ width: 300, padding: 20, background: '#232b3b', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}>
        <h2 style={{ color: '#fff', textAlign: 'center' }}>Login</h2>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 15 }}>
            <label htmlFor="username" style={{ color: '#bdbdbd' }}>Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: '100%', padding: 8, background: '#374151', border: 'none', borderRadius: 4, color: '#fff', marginTop: 5 }}
              required
            />
          </div>
          <div style={{ marginBottom: 15 }}>
            <label htmlFor="password" style={{ color: '#bdbdbd' }}>Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: 8, background: '#374151', border: 'none', borderRadius: 4, color: '#fff', marginTop: 5 }}
              required
            />
          </div>
          {error && <p style={{ color: '#FF4444', textAlign: 'center' }}>{error}</p>}
          <button
            type="submit"
            style={{ width: '100%', padding: 10, background: '#FF4500', border: 'none', borderRadius: 4, color: '#fff', fontWeight: 600, cursor: 'pointer' }}
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginView; 