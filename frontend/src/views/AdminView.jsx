import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../api'; // Import the new api client
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

function AdminView({ selectedPharmacy }) {
  const [missingDates, setMissingDates] = useState([]);
  const [loadingMissingDates, setLoadingMissingDates] = useState(false);
  const [errorMissingDates, setErrorMissingDates] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  // State for all form fields
  const [formData, setFormData] = useState({
    turnover_value: '',
    avg_basket_size: '',
    avg_basket_value: '',
    daily_gp_percent: '',
    gp_value: '',
    cost_of_sales: '',
    purchases: '',
    transaction_qty: '',
    script_qty: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [displayMonth, setDisplayMonth] = useState(new Date());
  const modalRef = useRef(null);

  const currentYear = new Date().getFullYear();

  // Calculate date range (last 2 years)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(endDate.getFullYear() - 2);

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

    apiClient.get(`/api/missing_turnover_dates/${selectedPharmacy}/${startDateStr}/${endDateStr}`)
      .then(res => {
        if (res.data.error) {
          setErrorMissingDates(res.data.error);
        } else {
          setMissingDates(res.data.missing_dates || []);
        }
        setLoadingMissingDates(false);
      })
      .catch(error => {
        setErrorMissingDates('Failed to fetch missing dates');
        setLoadingMissingDates(false);
        console.error('Error fetching missing dates:', error);
      });
  }, [selectedPharmacy]);

  // Handle date selection
  const handleDateSelect = (date) => {
    if (!date) return;
    
    const dateStr = formatDate(date);
    if (missingDates.includes(dateStr)) {
      setSelectedDate(date);
      setShowModal(true);
      // Reset form data when modal opens
      setFormData({
        turnover_value: '',
        avg_basket_size: '',
        avg_basket_value: '',
        daily_gp_percent: '',
        gp_value: '',
        cost_of_sales: '',
        purchases: '',
        transaction_qty: '',
        script_qty: ''
      });
      setSubmitError(null);
      setSubmitSuccess(null);
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle modal close
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedDate(null);
    setSubmitError(null);
    setSubmitSuccess(null);
  };

  // Handle turnover submission
  const handleSubmitData = async () => {
    if (!selectedDate || !selectedPharmacy) return;

    // Filter out empty fields and convert to numbers
    const payload = Object.entries(formData).reduce((acc, [key, value]) => {
      if (value !== '') {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          acc[key] = numValue;
        }
      }
      return acc;
    }, {});

    if (Object.keys(payload).length === 0) {
      setSubmitError('Please enter at least one value to submit.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await apiClient.post(`/api/manual_turnover`, {
        pharmacy_code: selectedPharmacy,
        date: formatDate(selectedDate),
        ...payload
      });

      const data = response.data;

      if (response.status === 200 && data.success) {
        setSubmitSuccess(`Successfully added data for ${formatDate(selectedDate)}.`);
        // Remove the date from missing dates
        setMissingDates(prev => prev.filter(date => date !== formatDate(selectedDate)));
        // Close modal after 2 seconds
        setTimeout(() => {
          handleCloseModal();
        }, 2000);
      } else {
        setSubmitError(data.error || 'Failed to add data');
      }
    } catch (error) {
      console.error('Error submitting data:', error);
      const errorMessage = error.response?.data?.error || 'An error occurred while submitting the data';
      setSubmitError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle click outside modal
  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        handleCloseModal();
      }
    }

    if (showModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showModal]);

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

  if (!selectedPharmacy) {
    return <div>Please select a pharmacy to manage turnover data.</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ color: '#fff', marginBottom: '2rem' }}>Turnover Data Management</h1>
      
      {/* Header */}
      <div style={{
        background: '#232b3b',
        color: '#fff',
        borderRadius: '1rem',
        padding: '1rem',
        marginBottom: '1.5rem',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          margin: 0,
          marginBottom: '0.5rem'
        }}>
          Manual Turnover Entry
        </h1>
        <p style={{
          fontSize: '0.9rem',
          color: '#bdbdbd',
          margin: 0
        }}>
          Select a missing date from the calendar to manually enter its data. <br/>
          Only dates highlighted in red are available for manual entry.
        </p>
      </div>

      {/* Instructions */}
      <div style={{
        background: '#1F2937',
        border: '2px solid #374151',
        borderRadius: '0.75rem',
        padding: '1rem',
        marginBottom: '1.5rem',
        color: '#D1D5DB'
      }}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#FF4500', fontSize: '1rem' }}>Instructions:</h3>
        <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem' }}>
          <li>Orange dates can be selected (missing turnover data)</li>
          <li>Gray dates cannot be selected (already have turnover data)</li>
          <li>Only dates from the last 2 years are shown</li>
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
          padding: '0.8rem',
          marginBottom: '1.5rem',
          textAlign: 'center'
        }}>
          <span style={{ color: '#bdbdbd', fontSize: '0.9rem' }}>
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
          padding: '1rem',
          overflow: 'auto'
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

      {/* Modal for adding turnover */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div ref={modalRef} style={{
            background: '#2d3748',
            padding: '2rem',
            borderRadius: '1rem',
            width: '90%',
            maxWidth: '600px',
            color: '#fff',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ borderBottom: '1px solid #4a5568', paddingBottom: '1rem' }}>
              Add Data for {formatDate(selectedDate)}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              {/* Turnover */}
              <div>
                <label>Turnover (R)</label>
                <input
                  type="number"
                  name="turnover_value"
                  value={formData.turnover_value}
                  onChange={handleInputChange}
                  placeholder="e.g., 25000.50"
                  style={inputStyle}
                />
              </div>

              {/* GP Value */}
              <div>
                <label>GP Value (R)</label>
                <input
                  type="number"
                  name="gp_value"
                  value={formData.gp_value}
                  onChange={handleInputChange}
                  placeholder="e.g., 8000.25"
                  style={inputStyle}
                />
              </div>

              {/* Daily GP % */}
              <div>
                <label>Daily GP (%)</label>
                <input
                  type="number"
                  name="daily_gp_percent"
                  value={formData.daily_gp_percent}
                  onChange={handleInputChange}
                  placeholder="e.g., 32.5"
                  style={inputStyle}
                />
              </div>

              {/* Cost of Sales */}
              <div>
                <label>Cost of Sales (R)</label>
                <input
                  type="number"
                  name="cost_of_sales"
                  value={formData.cost_of_sales}
                  onChange={handleInputChange}
                  placeholder="e.g., 17000.25"
                  style={inputStyle}
                />
              </div>

              {/* Purchases */}
              <div>
                <label>Purchases (R)</label>
                <input
                  type="number"
                  name="purchases"
                  value={formData.purchases}
                  onChange={handleInputChange}
                  placeholder="e.g., 15000"
                  style={inputStyle}
                />
              </div>

              {/* Avg Basket Value */}
              <div>
                <label>Avg Basket Value (R)</label>
                <input
                  type="number"
                  name="avg_basket_value"
                  value={formData.avg_basket_value}
                  onChange={handleInputChange}
                  placeholder="e.g., 150.75"
                  style={inputStyle}
                />
              </div>

              {/* Avg Basket Size */}
              <div>
                <label>Avg Basket Size (Items)</label>
                <input
                  type="number"
                  name="avg_basket_size"
                  value={formData.avg_basket_size}
                  onChange={handleInputChange}
                  placeholder="e.g., 3.2"
                  style={inputStyle}
                />
              </div>
              
              {/* Transaction Qty */}
              <div>
                <label>Transaction Qty</label>
                <input
                  type="number"
                  name="transaction_qty"
                  value={formData.transaction_qty}
                  onChange={handleInputChange}
                  placeholder="e.g., 165"
                  style={inputStyle}
                />
              </div>

              {/* Script Qty */}
              <div>
                <label>Script Qty</label>
                <input
                  type="number"
                  name="script_qty"
                  value={formData.script_qty}
                  onChange={handleInputChange}
                  placeholder="e.g., 90"
                  style={inputStyle}
                />
              </div>
            </div>

            {submitError && <div style={{ color: '#e53e3e', marginTop: '1rem' }}>{submitError}</div>}
            {submitSuccess && <div style={{ color: '#48bb78', marginTop: '1rem' }}>{submitSuccess}</div>}

            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button
                onClick={handleCloseModal}
                disabled={submitting}
                style={{ background: '#4a5568', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitData}
                disabled={submitting}
                style={{ background: '#48bb78', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer' }}
              >
                {submitting ? 'Submitting...' : 'Submit Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom CSS is now in calendar.css file */}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: '0.5rem',
  border: '1px solid #4a5568',
  background: '#1a202c',
  color: '#fff',
  marginTop: '0.25rem',
  boxSizing: 'border-box'
};

export default AdminView; 