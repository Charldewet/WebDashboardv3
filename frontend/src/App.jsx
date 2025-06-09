import React, { useState, useRef, useEffect } from 'react';
import DailyView from './views/DailyView';
import MonthlyView from './views/MonthlyView';
import YearlyView from './views/YearlyView';
import StockView from './views/StockView';
import Login from './components/Login';
import './App.css';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import './calendar.css';

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState('daily');
  const [selectedPharmacy, setSelectedPharmacy] = useState(PHARMACY_OPTIONS[0].value);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getLastDayOfPreviousMonth());
  const [displayMonth, setDisplayMonth] = useState(getLastDayOfPreviousMonth());
  const [showCalendar, setShowCalendar] = useState(false);
  const calendarRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const currentYear = new Date().getFullYear(); // Get current year

  // Check authentication status on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/check_auth', {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.authenticated) {
        setIsAuthenticated(true);
        setUsername(data.username);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = (loggedInUsername) => {
    setIsAuthenticated(true);
    setUsername(loggedInUsername);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setIsAuthenticated(false);
      setUsername('');
      setMenuOpen(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#111827',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ color: '#bdbdbd', fontSize: '1.2rem' }}>Loading...</div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
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
                        onMouseDown={e => e.preventDefault()}
                      >
                        {opt.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Right-aligned icon group */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '2mm' }}>
              {/* User indicator */}
              <div style={{
                color: '#bdbdbd',
                fontSize: '0.9rem',
                fontWeight: 500,
                marginRight: '0.5rem',
              }}>
                Welcome, {username}
              </div>
              {/* Calendar Icon */}
              <button
                aria-label="Open calendar"
                onClick={handleCalendarOpen}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  zIndex: 200,
                  padding: 0,
                  marginRight: 5,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#FF4500" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="16" rx="2"/>
                  <path d="M16 3v4M8 3v4M3 9h18"/>
                </svg>
              </button>
              {/* Hamburger Menu Icon */}
              <button
                aria-label="Open menu"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  zIndex: 200,
                  padding: 0,
                  marginRight: 5,
                  display: 'flex',
                  alignItems: 'center',
                }}
                onClick={() => setMenuOpen(v => !v)}
              >
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#FF4500" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="5" x2="20" y2="5" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="19" x2="20" y2="19" />
                </svg>
              </button>
            </div>
          </div>
          {/* Selected Day Label as part of header */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'right', marginBottom: '1mm', marginRight: '4mm' }}>
            <span style={{
              fontSize: '0.78rem',
              color: '#bdbdbd',
              letterSpacing: '0.01em',
              fontWeight: 400,
              minWidth: 80,
              textAlign: 'center',
            }}>
              {selectedDate ? formatDate(selectedDate) : ''}
            </span>
          </div>
          {/* Navigation Bar below date label, part of header */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.1rem', background: '#111827', margin: 0, padding: 0 }}>
            <button
              style={view === 'daily' ? navBtnActiveStyle : navBtnStyle}
              onClick={() => setView('daily')}
            >
              Daily
            </button>
            <button
              style={view === 'monthly' ? navBtnActiveStyle : navBtnStyle}
              onClick={() => setView('monthly')}
            >
              Monthly
            </button>
            <button
              style={view === 'yearly' ? navBtnActiveStyle : navBtnStyle}
              onClick={() => setView('yearly')}
            >
              Yearly
            </button>
            <button
              style={{ ...(view === 'stock' ? navBtnActiveStyle : navBtnStyle), marginRight: 0 }}
              onClick={() => setView('stock')}
            >
              Stock
            </button>
          </div>
        </div>
      </div>
      {/* Calendar Popover */}
      {showCalendar && (
        <div ref={calendarRef} style={{ position: 'fixed', top: 60, right: 32, zIndex: 20000 }}>
          <DayPicker
            mode="single"
            selected={selectedDate}
            month={displayMonth}
            onMonthChange={setDisplayMonth}
            onSelect={date => {
              if (date) {
                setSelectedDate(date);
                setDisplayMonth(date);
              }
              setShowCalendar(false);
            }}
            showOutsideDays
            modifiersClassNames={{
              selected: 'calendar-selected',
              today: 'calendar-today',
              weekend: 'calendar-weekend',
            }}
            className="custom-calendar"
            fromYear={2018}
            toYear={currentYear}
            captionLayout="dropdown"
          />
        </div>
      )}
      {/* Hamburger Dropdown Menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          style={{
            position: 'absolute',
            top: 60, // height of header
            left: '2.5vw',
            width: '95vw',
            background: '#232b3b',
            color: '#fff',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
            minHeight: 180,
            zIndex: 20000,
            padding: '0',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: 'auto',
            maxWidth: 600,
            margin: '0 auto',
          }}
        >
          <div style={{ padding: '18px 0 8px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button style={{
              width: '92%',
              margin: '0 auto',
              background: '#232b3b',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: '1.15rem',
              fontWeight: 600,
              padding: '12px 0',
              cursor: 'pointer',
              transition: 'background 0.18s, color 0.18s',
              textAlign: 'left',
              paddingLeft: 18,
            }}
            onClick={() => {}}>
              Admin
            </button>
          </div>
          <button style={{
            width: '92%',
            margin: '18px auto 18px auto',
            background: '#232b3b',
            color: '#FF4444',
            border: 'none',
            borderRadius: 8,
            fontSize: '1.15rem',
            fontWeight: 700,
            padding: '12px 0',
            cursor: 'pointer',
            transition: 'background 0.18s, color 0.18s',
            textAlign: 'left',
            paddingLeft: 18,
          }}
          onClick={handleLogout}>
            Logout
          </button>
        </div>
      )}
      {/* Main View */}
      <div className="view-container" style={{ marginTop: '1mm' }}>
        {view === 'daily' && <DailyView selectedPharmacy={selectedPharmacy} selectedDate={formatDate(selectedDate)} />}
        {view === 'monthly' && <MonthlyView selectedPharmacy={selectedPharmacy} selectedDate={formatDate(selectedDate)} />}
        {view === 'yearly' && <YearlyView selectedPharmacy={selectedPharmacy} selectedDate={formatDate(selectedDate)} />}
        {view === 'stock' && <StockView selectedPharmacy={selectedPharmacy} selectedDate={formatDate(selectedDate)} />}
      </div>
    </div>
  );
}

export default App;
