import React, { useEffect, useState } from 'react';
import apiClient from '../api';

function LowGPProductsView({ selectedPharmacy, selectedDate }) {
  const [lowGpProducts, setLowGpProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gpThreshold, setGpThreshold] = useState(20); // Default to 20%

  // Generate percentage options from 15% to 30% at 1% intervals
  const thresholdOptions = [];
  for (let i = 15; i <= 30; i++) {
    thresholdOptions.push(i);
  }

  useEffect(() => {
    if (!selectedPharmacy || !selectedDate) return;

    setLoading(true);
    setError(null);

    // Fetch low GP products based on threshold
    apiClient.get(`/api/low_gp_products/${selectedDate}?threshold=${gpThreshold}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    })
      .then(response => {
        setLowGpProducts(response.data?.products || []);
        setLoading(false);
      })
      .catch(err => {
        let errorMessage = 'Error fetching low GP products.';
        if (err.response && err.response.data && err.response.data.error) {
          errorMessage = err.response.data.error;
        } else if (err.request) {
          errorMessage = 'No response from server.';
        } else {
          errorMessage = err.message;
        }
        setError(errorMessage);
        setLowGpProducts([]);
        setLoading(false);
      });
  }, [selectedPharmacy, selectedDate, gpThreshold]);

  const cardStyle = {
    background: '#232b3b',
    borderRadius: '1.2rem',
    boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
    padding: '1rem',
    margin: '1rem',
    color: '#fff'
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid #374151'
  };

  const titleStyle = {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: '#FFB800',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  };

  const countBadgeStyle = {
    background: '#374151',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.9rem',
    fontWeight: 600
  };

  const controlsStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  };

  const dropdownStyle = {
    background: '#374151',
    border: '1px solid #4B5563',
    borderRadius: '0.5rem',
    color: '#fff',
    padding: '0.25rem 0.5rem',
    fontSize: '0.9rem',
    outline: 'none'
  };

  const listStyle = {
    maxHeight: '400px',
    overflowY: 'auto'
  };

  const itemStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    fontSize: '0.9rem'
  };

  const productInfoStyle = {
    flex: 1,
    minWidth: 0
  };

  const productNameStyle = {
    fontWeight: 500,
    color: '#fff',
    marginBottom: '0.25rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  };

  const productDetailsStyle = {
    color: '#bdbdbd',
    fontSize: '0.8rem'
  };

  const gpPercentStyle = {
    fontWeight: 600,
    fontSize: '1rem',
    color: '#FF4500',
    textAlign: 'right',
    minWidth: '60px'
  };

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div style={titleStyle}>
          $ Low GP Products
          <div style={countBadgeStyle}>
            {loading ? '...' : lowGpProducts.length}
          </div>
        </div>
        <div style={controlsStyle}>
          <span style={{ color: '#bdbdbd', fontSize: '0.9rem' }}>Below:</span>
          <select
            value={gpThreshold}
            onChange={(e) => setGpThreshold(parseInt(e.target.value))}
            style={dropdownStyle}
          >
            {thresholdOptions.map(threshold => (
              <option key={threshold} value={threshold}>
                {threshold}%
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#bdbdbd', padding: '2rem' }}>
          Loading products...
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', color: '#FF4500', padding: '2rem' }}>
          {error}
        </div>
      ) : lowGpProducts.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#bdbdbd', padding: '2rem' }}>
          No products found below {gpThreshold}% GP
        </div>
      ) : (
        <div style={listStyle}>
          {lowGpProducts.slice(0, 10).map((product, index) => (
            <div key={index} style={itemStyle}>
              <div style={productInfoStyle}>
                <div style={productNameStyle}>
                  #{index + 1}. {product.description}
                </div>
                <div style={productDetailsStyle}>
                  Code: {product.stock_code} | On Hand: {product.on_hand}
                </div>
              </div>
              <div style={gpPercentStyle}>
                {product.gp_percent?.toFixed(1)}% GP
              </div>
            </div>
          ))}
          {lowGpProducts.length > 10 && (
            <div style={{ textAlign: 'center', color: '#bdbdbd', padding: '1rem', fontSize: '0.8rem' }}>
              Showing top 10 of {lowGpProducts.length} products
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default LowGPProductsView; 