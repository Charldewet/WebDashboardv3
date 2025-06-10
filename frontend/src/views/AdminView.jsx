import React, { useState, useEffect, useRef } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

function AdminView({ selectedPharmacy }) {
  const [missingDates, setMissingDates] = useState([]);
  const [loadingMissingDates, setLoadingMissingDates] = useState(false);
  const [errorMissingDates, setErrorMissingDates] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [turnoverValue, setTurnoverValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [displayMonth, setDisplayMonth] = useState(new Date());
  const modalRef = useRef(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL;
  const currentYear = new Date().getFullYear();

  // Calculate date range (last 90 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 90);

  const formatDate = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fetch missing turnover dates
  useEffect(() => {
    if (!selectedPharmacy) return;

    setLoadingMissingDates(true);
    setErrorMissingDates(null);

    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);

    fetch(`${API_BASE_URL}/api/missing_turnover_dates/${selectedPharmacy}/${startDateStr}/${endDateStr}`)
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          setErrorMissingDates(data.error);
        } else {
          setMissingDates(data.missing_dates || []);
        }
        setLoadingMissingDates(false);
      })
      .catch(error => {
        setErrorMissingDates('Failed to fetch missing dates');
        setLoadingMissingDates(false);
        console.error('Error fetching missing dates:', error);
      });
  }, [selectedPharmacy, API_BASE_URL]);

  // Handle date selection
  const handleDateSelect = (date) => {
    if (!date) return;
    
    const dateStr = formatDate(date);
    if (missingDates.includes(dateStr)) {
      setSelectedDate(date);
      setShowModal(true);
      setTurnoverValue('');
      setSubmitError(null);
      setSubmitSuccess(null);
    }
  };

  // Handle modal close
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedDate(null);
    setTurnoverValue('');
    setSubmitError(null);
    setSubmitSuccess(null);
  };

  // Handle turnover submission
  const handleSubmitTurnover = async () => {
    if (!selectedDate || !turnoverValue || !selectedPharmacy) return;

    const value = parseFloat(turnoverValue);
    if (isNaN(value) || value <= 0) {
      setSubmitError('Please enter a valid positive number');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/manual_turnover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pharmacy_code: selectedPharmacy,
          date: formatDate(selectedDate),
          turnover_value: value
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSubmitSuccess(`Successfully added turnover data: R${value.toLocaleString()}`);
        // Remove the date from missing dates
        setMissingDates(prev => prev.filter(date => date !== formatDate(selectedDate)));
        // Close modal after 2 seconds
        setTimeout(() => {
          handleCloseModal();
        }, 2000);
      } else {
        setSubmitError(data.error || 'Failed to submit turnover data');
      }
    } catch (error) {
      setSubmitError('Network error. Please try again.');
      console.error('Error submitting turnover:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Create modifiers for the date picker
  const missingDateObjects = missingDates.map(dateStr => {
    // Create date in local timezone to avoid timezone offset issues
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  });
  
  // Debug: log the dates for troubleshooting
  console.log('Missing dates from API:', missingDates);
  console.log('Missing date objects for calendar:', missingDateObjects);
  console.log('Date range:', { start: startDate, end: endDate });
  
  const modifiers = {
    missing: missingDateObjects,
    disabled: (date) => {
      const dateStr = formatDate(date);
      const isNotMissing = !missingDates.includes(dateStr);
      const isOutOfRange = date > endDate || date < startDate;
      const shouldDisable = isNotMissing || isOutOfRange;
      
      // Debug specific dates to see why they might be disabled
      if (dateStr === '2025-05-01' || dateStr === '2025-05-04' || dateStr === '2025-03-21') {
        console.log(`Date ${dateStr}: isMissing=${missingDates.includes(dateStr)}, isOutOfRange=${isOutOfRange}, shouldDisable=${shouldDisable}`);
      }
      
      return shouldDisable;
    }
  };

  const modifiersClassNames = {
    missing: 'admin-calendar-missing',
    disabled: 'admin-calendar-disabled'
  };

  // Handle click outside modal
  useEffect(() => {
    if (!showModal) return;
    
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        handleCloseModal();
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showModal]);

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        background: '#232b3b',
        color: '#fff',
        borderRadius: '1.2rem',
        padding: '1.5rem',
        marginBottom: '2rem',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 700,
          margin: 0,
          marginBottom: '0.5rem'
        }}>
          Manual Turnover Entry
        </h1>
        <p style={{
          fontSize: '1rem',
          color: '#bdbdbd',
          margin: 0
        }}>
          Add missing turnover data for {selectedPharmacy ? selectedPharmacy.toUpperCase() : 'selected pharmacy'}
        </p>
      </div>

      {/* Instructions */}
      <div style={{
        background: '#1F2937',
        border: '2px solid #374151',
        borderRadius: '0.75rem',
        padding: '1rem',
        marginBottom: '2rem',
        color: '#D1D5DB'
      }}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#FF4500' }}>Instructions:</h3>
        <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
          <li>Orange dates can be selected (missing turnover data)</li>
          <li>Gray dates cannot be selected (already have turnover data)</li>
          <li>Only dates from the last 90 days are shown</li>
          <li>Click on an orange date to add turnover data</li>
        </ul>
      </div>

      {/* Loading/Error states */}
      {loadingMissingDates && (
        <div style={{
          textAlign: 'center',
          color: '#bdbdbd',
          fontSize: '1.1rem',
          padding: '2rem'
        }}>
          Loading missing dates...
        </div>
      )}

      {errorMissingDates && (
        <div style={{
          background: '#7F1D1D',
          color: '#FCA5A5',
          borderRadius: '0.5rem',
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          Error: {errorMissingDates}
        </div>
      )}

      {/* Summary */}
      {!loadingMissingDates && !errorMissingDates && (
        <div style={{
          background: '#232b3b',
          borderRadius: '0.75rem',
          padding: '1rem',
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          <span style={{ color: '#bdbdbd' }}>
            Found{' '}
            <span style={{ color: '#FF4500', fontWeight: 600 }}>
              {missingDates.length}
            </span>
            {' '}dates with missing turnover data
          </span>
        </div>
      )}

      {/* Calendar */}
      {!loadingMissingDates && !errorMissingDates && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          background: '#232b3b',
          borderRadius: '1rem',
          padding: '2rem'
        }}>
          <DayPicker
            mode="single"
            selected={selectedDate}
            month={displayMonth}
            onMonthChange={setDisplayMonth}
            onSelect={handleDateSelect}
            modifiers={modifiers}
            modifiersClassNames={modifiersClassNames}
            showOutsideDays
            className="admin-calendar"
            fromYear={2018}
            toYear={currentYear}
            captionLayout="dropdown"
          />
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 30000
        }}>
          <div
            ref={modalRef}
            style={{
              background: '#232b3b',
              borderRadius: '1rem',
              padding: '2rem',
              maxWidth: '400px',
              width: '90%',
              color: '#fff'
            }}
          >
            <h2 style={{
              margin: '0 0 1rem 0',
              fontSize: '1.5rem',
              fontWeight: 600
            }}>
              Add Turnover Data
            </h2>
            <p style={{
              margin: '0 0 1.5rem 0',
              color: '#bdbdbd'
            }}>
              Date: {selectedDate ? formatDate(selectedDate) : ''}
            </p>

            {submitSuccess && (
              <div style={{
                background: '#065F46',
                color: '#A7F3D0',
                borderRadius: '0.5rem',
                padding: '0.75rem',
                marginBottom: '1rem'
              }}>
                {submitSuccess}
              </div>
            )}

            {submitError && (
              <div style={{
                background: '#7F1D1D',
                color: '#FCA5A5',
                borderRadius: '0.5rem',
                padding: '0.75rem',
                marginBottom: '1rem'
              }}>
                {submitError}
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 500
              }}>
                Turnover Amount (R)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={turnoverValue}
                onChange={(e) => setTurnoverValue(e.target.value)}
                placeholder="Enter turnover amount"
                disabled={submitting || !!submitSuccess}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #4B5563',
                  background: '#374151',
                  color: '#fff',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={handleCloseModal}
                disabled={submitting}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: '#4B5563',
                  color: '#fff',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontWeight: 500
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitTurnover}
                disabled={submitting || !turnoverValue || !!submitSuccess}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: submitting || !!submitSuccess ? '#6B7280' : '#FF4500',
                  color: '#fff',
                  cursor: submitting || !turnoverValue || !!submitSuccess ? 'not-allowed' : 'pointer',
                  fontWeight: 500
                }}
              >
                {submitting ? 'Adding...' : 'Add Turnover'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom CSS is now in calendar.css file */}
    </div>
  );
}

export default AdminView; 