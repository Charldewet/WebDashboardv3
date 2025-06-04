import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import DailyView from './views/DailyView';
import MonthlyView from './views/MonthlyView';
import YearlyView from './views/YearlyView';
import StockView from './views/StockView';
import LoginForm from './components/LoginForm';
import './App.css';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import './calendar.css';

// Configure axios to include credentials by default
axios.defaults.withCredentials = true;

const PHARMACY_OPTIONS = [
  { label: 'TLC Reitz', value: 'reitz' },
  { label: 'TLC Villiers', value: 'villiers' },
  { label: 'TLC Roos', value: 'roos' },
  { label: 'TLC Tugela', value: 'tugela' },
  { label: 'TLC Winterton', value: 'winterton' },
];

// Helper to get last day of previous month
function getLastDayOfPreviousMonth() {
  const now = new Date();
  // Set to first day of this month, then subtract one day
  return new Date(now.getFullYear(), now.getMonth(), 0);
}

function App() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);

  // Existing state
  const [view, setView] = useState('daily');
  const [selectedPharmacy, setSelectedPharmacy] = useState(PHARMACY_OPTIONS[0].value);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getLastDayOfPreviousMonth());
  const [displayMonth, setDisplayMonth] = useState(getLastDayOfPreviousMonth());
  const [showCalendar, setShowCalendar] = useState(false);
  const calendarRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [forceUpdateLoading, setForceUpdateLoading] = useState(false);
  const [forceUpdateOutput, setForceUpdateOutput] = useState("");
  const [showForceUpdateModal, setShowForceUpdateModal] = useState(false);

  const currentYear = new Date().getFullYear(); // Get current year

  // Check authentication status on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/check_session', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.authenticated) {
        setIsAuthenticated(true);
        setCurrentUser(data.username);
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
      setCurrentUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async (username, password) => {
    setLoginLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsAuthenticated(true);
        setCurrentUser(data.username);
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error) {
      throw error;
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
      setIsAuthenticated(false);
      setCurrentUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
      // Force logout on client side even if server request fails
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
  };

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-gradient)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid var(--border-color)',
          borderTop: '4px solid var(--accent-primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} loading={loginLoading} />;
  }

  const navBtnStyle = {
    background: '#111827',
    color: '#bdbdbd',
    padding: 'calc(0.6rem + 1mm) 1.1rem',
    borderRadius: '8px',
    fontWeight: 500,
    fontSize: '01rem',
    border: 'none',
    cursor: 'pointer',
    outline: 'none',
    boxSizing: 'border-box',
    marginRight: '1mm',
    transition: 'background 0.18s, color 0.18s',
  };
  const navBtnActiveStyle = {
    ...navBtnStyle,
    background: '#FF4500',
    color: '#fff',
    fontWeight: 900,
  };

  // Style for the date selector button, derived from navBtnStyle
  const dateSelectorBtnStyle = {
    ...navBtnStyle,
    marginRight: 0, // Remove margin specific to nav tabs
    minWidth: '180px', // Ensure enough width for the date string
    // fontWeight is 500 from navBtnStyle, color is #bdbdbd from navBtnStyle
  };

  const dateSelectorBtnActiveStyle = {
    ...navBtnActiveStyle,
    marginRight: 0,
    minWidth: '180px',
     // fontWeight is 800 from navBtnActiveStyle, color is #fff from navBtnActiveStyle
  };

  const selectedPharmacyLabel = PHARMACY_OPTIONS.find(opt => opt.value === selectedPharmacy)?.label || '';

  // Collapse calendar when clicking outside
  useEffect(() => {
    if (!showCalendar) return;
    function handleClickOutside(event) {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCalendar]);

  // Collapse menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const formatDate = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleCalendarOpen = () => {
    setDisplayMonth(selectedDate || new Date());
    setShowCalendar(v => !v);
  };

  async function handleForceUpdate() {
    setForceUpdateLoading(true);
    setForceUpdateOutput("");
    setShowForceUpdateModal(true);
    try {
      const res = await fetch('/api/force_update', { 
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.output || 'Failed to force update');
      setForceUpdateOutput(data.output || 'Update complete.');
    } catch (err) {
      setForceUpdateOutput('Error running force update: ' + err.message);
    } finally {
      setForceUpdateLoading(false);
    }
  }

  return (
    <div className="dashboard-container" style={{ position: 'relative', minHeight: '100vh', padding: '2rem 0' }}>
      {/* Sticky Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        background: '#111827',
        zIndex: 1000,
        width: '100%',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', background: '#111827', position: 'sticky', top: 0, zIndex: 1000, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', marginBottom: 0, gap: '4mm', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4mm' }}>
              <img
                src="/the-local-choice-logo.png"
                alt="Pharmacy Logo"
                style={{ height: 38, width: 'auto', marginLeft: '2mm' }}
              />
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <button
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#fff',
                    fontSize: '1.2rem',
                    fontWeight: 600,
                    letterSpacing: '0.01em',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                  onClick={() => setDropdownOpen(v => !v)}
                  tabIndex={0}
                >
                  {selectedPharmacyLabel}
                  <span style={{ marginLeft: 6, display: 'inline-flex', alignItems: 'center', transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'none' }}>
                    <svg width="15" height="8" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <polyline points="3,4 10,11 17,4" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>
                {dropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '110%',
                    left: 0,
                    background: '#232b3b',
                    color: '#fff',
                    borderRadius: 8,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                    minWidth: 180,
                    zIndex: 100,
                    padding: '4px 0',
                  }}>
                    {PHARMACY_OPTIONS.map(opt => (
                      <div
                        key={opt.value}
                        style={{
                          padding: '7px 16px',
                          cursor: 'pointer',
                          background: selectedPharmacy === opt.value ? '#FF4500' : 'none',
                          color: selectedPharmacy === opt.value ? '#fff' : '#fff',
                          fontWeight: selectedPharmacy === opt.value ? 700 : 500,
                          fontSize: '1.15rem',
                        }}
                        onClick={() => {
                          setSelectedPharmacy(opt.value);
                          setDropdownOpen(false);
                        }}
                      >
                        {opt.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* User info and logout button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginRight: '2mm' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Welcome, {currentUser}
              </span>
              <button
                onClick={handleLogout}
                style={{
                  background: 'var(--surface-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s, border-color 0.2s'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'var(--accent-primary)';
                  e.target.style.borderColor = 'var(--accent-primary)';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'var(--surface-primary)';
                  e.target.style.borderColor = 'var(--border-color)';
                }}
              >
                Logout
              </button>
            </div>
          </div>

          {/* Navigation and Date Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '0 2mm',
            gap: '4mm',
          }}>
            {/* Navigation Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1mm' }}>
              {['daily', 'monthly', 'yearly', 'stock'].map(tab => (
                <button
                  key={tab}
                  style={view === tab ? navBtnActiveStyle : navBtnStyle}
                  onClick={() => setView(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Date Selector and Menu */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1mm' }}>
              {(view === 'daily' || view === 'monthly') && (
                <div style={{ position: 'relative' }}>
                  <button
                    style={showCalendar ? dateSelectorBtnActiveStyle : dateSelectorBtnStyle}
                    onClick={handleCalendarOpen}
                  >
                    {selectedDate ? selectedDate.toLocaleDateString('en-ZA', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    }) : 'Select Date'}
                  </button>
                  
                  {showCalendar && (
                    <div
                      ref={calendarRef}
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        zIndex: 200,
                        background: '#fff',
                        borderRadius: '8px',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
                        marginTop: '4px',
                      }}
                    >
                      <DayPicker
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date);
                          setShowCalendar(false);
                        }}
                        month={displayMonth}
                        onMonthChange={setDisplayMonth}
                        showOutsideDays
                        fixedWeeks
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Hamburger Menu */}
              <div style={{ position: 'relative' }}>
                <button
                  ref={menuRef}
                  style={{
                    ...navBtnStyle,
                    marginRight: 0,
                    padding: '0.7rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onClick={() => setMenuOpen(v => !v)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {menuOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    background: '#232b3b',
                    borderRadius: 8,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                    minWidth: 200,
                    zIndex: 100,
                    padding: '8px 0',
                    marginTop: '4px',
                  }}>
                    <button
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'none',
                        border: 'none',
                        color: '#fff',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        transition: 'background 0.15s',
                      }}
                      onClick={() => {
                        handleForceUpdate();
                        setMenuOpen(false);
                      }}
                      onMouseOver={(e) => e.target.style.background = '#2c3e50'}
                      onMouseOut={(e) => e.target.style.background = 'none'}
                    >
                      Force Update Data
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ paddingTop: '2rem' }}>
        {view === 'daily' && <DailyView selectedPharmacy={selectedPharmacy} selectedDate={formatDate(selectedDate)} />}
        {view === 'monthly' && <MonthlyView selectedPharmacy={selectedPharmacy} selectedDate={formatDate(selectedDate)} />}
        {view === 'yearly' && <YearlyView selectedPharmacy={selectedPharmacy} selectedDate={formatDate(selectedDate)} />}
        {view === 'stock' && <StockView selectedPharmacy={selectedPharmacy} />}
      </div>

      {/* Force Update Modal */}
      {showForceUpdateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '2rem',
        }}>
          <div className="card" style={{ maxWidth: '600px', width: '100%', maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Force Update Progress</h3>
              <button
                onClick={() => setShowForceUpdateModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '1.5rem',
                  padding: '0.25rem',
                }}
              >
                ✕
              </button>
            </div>
            
            {forceUpdateLoading && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem',
                color: 'var(--accent-primary)',
              }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid transparent',
                  borderTop: '2px solid currentColor',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}></div>
                Running update...
              </div>
            )}
            
            <pre style={{
              background: 'var(--surface-secondary)',
              padding: '1rem',
              borderRadius: '0.5rem',
              whiteSpace: 'pre-wrap',
              maxHeight: '400px',
              overflow: 'auto',
              fontSize: '0.85rem',
              color: 'var(--text-primary)',
            }}>
              {forceUpdateOutput || 'Starting update...'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
