import React, { useState } from 'react';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        onLogin(data.username);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#111827',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{
        background: '#232b3b',
        padding: '3rem',
        borderRadius: '1rem',
        boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
        width: '100%',
        maxWidth: '400px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img
            src="/the-local-choice-logo.png"
            alt="Pharmacy Logo"
            style={{ height: 48, width: 'auto', marginBottom: '1rem' }}
          />
          <h2 style={{
            color: '#fff',
            fontSize: '1.5rem',
            fontWeight: 600,
            margin: 0,
          }}>
            Login to Dashboard
          </h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              color: '#bdbdbd',
              fontSize: '0.9rem',
              fontWeight: 500,
              marginBottom: '0.5rem',
            }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#111827',
                border: '1px solid #374151',
                borderRadius: '0.5rem',
                color: '#fff',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = '#FF4500'}
              onBlur={(e) => e.target.style.borderColor = '#374151'}
            />
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{
              display: 'block',
              color: '#bdbdbd',
              fontSize: '0.9rem',
              fontWeight: 500,
              marginBottom: '0.5rem',
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#111827',
                border: '1px solid #374151',
                borderRadius: '0.5rem',
                color: '#fff',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = '#FF4500'}
              onBlur={(e) => e.target.style.borderColor = '#374151'}
            />
          </div>

          {error && (
            <div style={{
              color: '#EF4444',
              fontSize: '0.9rem',
              marginBottom: '1rem',
              textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: loading ? '#6B7280' : '#FF4500',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.875rem',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!loading) e.target.style.background = '#E63E00';
            }}
            onMouseLeave={(e) => {
              if (!loading) e.target.style.background = '#FF4500';
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          background: '#111827',
          borderRadius: '0.5rem',
          fontSize: '0.8rem',
          color: '#9CA3AF',
        }}>
          <div><strong>Demo Credentials:</strong></div>
          <div>Username: Charl</div>
          <div>Password: admin</div>
        </div>
      </div>
    </div>
  );
};

export default Login; 