import React, { useEffect, useState } from 'react';
import apiClient from '../api'; // Import the new api client
import { PieChart, Pie, Cell, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Custom Tooltip for Monthly Inventory Chart
const CustomInventoryTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const inventoryData = payload.find(p => p.dataKey === 'closing_stock');
    const changeData = payload.find(p => p.dataKey === 'inventory_change');

    return (
      <div style={{
        background: 'rgba(35, 43, 59, 0.9)',
        border: '1px solid #374151',
        color: '#fff',
        borderRadius: '0.8rem',
        padding: '0.6rem 1rem',
        fontSize: '0.85rem',
        fontWeight: 500,
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      }}>
        {inventoryData && (
          <p style={{ margin: 0, color: '#fff' }}>
            {`Inventory: R ${inventoryData.value.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`}
          </p>
        )}
        {changeData && changeData.value !== null && (
          <p style={{ margin: '0.2rem 0 0 0', color: changeData.value >= 0 ? '#39FF14' : '#FF4500' }}>
            {changeData.value >= 0 ? '+' : ''}R {changeData.value.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}
          </p>
        )}
      </div>
    );
  }
  return null;
};

function StockView({ selectedPharmacy, selectedDate }) {
  const [openingStock, setOpeningStock] = useState(null);
  const [loadingOpeningStock, setLoadingOpeningStock] = useState(true);
  const [errorOpeningStock, setErrorOpeningStock] = useState(null);

  const [purchasesStats, setPurchasesStats] = useState(null);
  const [loadingPurchases, setLoadingPurchases] = useState(true);
  const [errorPurchases, setErrorPurchases] = useState(null);

  const [adjustmentsStats, setAdjustmentsStats] = useState(null);
  const [loadingAdjustments, setLoadingAdjustments] = useState(true);
  const [errorAdjustments, setErrorAdjustments] = useState(null);

  const [costStats, setCostStats] = useState({ cost: null, closingStock: null });
  const [loadingCostStats, setLoadingCostStats] = useState(true);
  const [errorCostStats, setErrorCostStats] = useState(null);

  const [turnoverRatio, setTurnoverRatio] = useState({ ratio: null });
  const [loadingTurnoverRatio, setLoadingTurnoverRatio] = useState(true);
  const [errorTurnoverRatio, setErrorTurnoverRatio] = useState(null);

  const [daysOfInventory, setDaysOfInventory] = useState({ days: null });
  const [loadingDaysOfInventory, setLoadingDaysOfInventory] = useState(true);
  const [errorDaysOfInventory, setErrorDaysOfInventory] = useState(null);

  const [inventoryChartData, setInventoryChartData] = useState([]);
  const [loadingInventoryChart, setLoadingInventoryChart] = useState(true);
  const [errorInventoryChart, setErrorInventoryChart] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (!selectedPharmacy || !selectedDate) {
      // Reset all states if no pharmacy or date
      setOpeningStock(null); setLoadingOpeningStock(true); setErrorOpeningStock(null);
      setPurchasesStats(null); setLoadingPurchases(true); setErrorPurchases(null);
      setAdjustmentsStats(null); setLoadingAdjustments(true); setErrorAdjustments(null);
      setCostStats({ cost: null, closingStock: null }); setLoadingCostStats(true); setErrorCostStats(null);
      setTurnoverRatio({ ratio: null }); setLoadingTurnoverRatio(true); setErrorTurnoverRatio(null);
      setDaysOfInventory({ days: null }); setLoadingDaysOfInventory(true); setErrorDaysOfInventory(null);
      setInventoryChartData([]); setLoadingInventoryChart(true); setErrorInventoryChart(null);
      return;
    }

    // Set loading states to true and reset errors/data for new fetch
    setLoadingOpeningStock(true); setErrorOpeningStock(null); setOpeningStock(null);
    setLoadingPurchases(true); setErrorPurchases(null); setPurchasesStats(null);
    setLoadingAdjustments(true); setErrorAdjustments(null); setAdjustmentsStats(null);
    setLoadingCostStats(true); setErrorCostStats(null); setCostStats({ cost: null, closingStock: null });
    setLoadingTurnoverRatio(true); setErrorTurnoverRatio(null); setTurnoverRatio({ ratio: null });
    setLoadingDaysOfInventory(true); setErrorDaysOfInventory(null); setDaysOfInventory({ days: null });
    setLoadingInventoryChart(true); setErrorInventoryChart(null); setInventoryChartData([]);

    // Calculate first day of the month from selected date
    const selectedDateObj = new Date(selectedDate);
    const firstDayOfMonth = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), 1);
    const firstDayOfMonthStr = firstDayOfMonth.toISOString().split('T')[0];
    const currentDateStr = selectedDate; // Use selected date as end date

    // Fetch Opening stock for the month
    apiClient.get(`/api/opening_stock_for_range/${firstDayOfMonthStr}/${currentDateStr}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    })
      .then(res => {
        setOpeningStock(res.data?.opening_stock ?? 0);
        setLoadingOpeningStock(false);
      })
      .catch(err => {
        setErrorOpeningStock('Error fetching opening stock.');
        setOpeningStock(0);
        setLoadingOpeningStock(false);
      });

    // Fetch monthly purchases
    apiClient.get(`/api/costs_for_range/${firstDayOfMonthStr}/${currentDateStr}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    })
      .then(res => {
        setPurchasesStats(res.data?.purchases ?? 0);
        setLoadingPurchases(false);
      })
      .catch(err => {
        setErrorPurchases('Error fetching purchases.');
        setPurchasesStats(0);
        setLoadingPurchases(false);
      });

    // Fetch monthly stock adjustments
    apiClient.get(`/api/stock_adjustments_for_range/${firstDayOfMonthStr}/${currentDateStr}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    })
      .then(res => {
        setAdjustmentsStats(res.data?.stock_adjustments ?? 0);
        setLoadingAdjustments(false);
      })
      .catch(err => {
        setErrorAdjustments('Error fetching adjustments.');
        setAdjustmentsStats(0);
        setLoadingAdjustments(false);
      });

    // Fetch cost of sales and closing stock for the month
    Promise.all([
      apiClient.get(`/api/costs_for_range/${firstDayOfMonthStr}/${currentDateStr}`, {
        headers: { 'X-Pharmacy': selectedPharmacy }
      }),
      apiClient.get(`/api/closing_stock_for_range/${firstDayOfMonthStr}/${currentDateStr}`, {
        headers: { 'X-Pharmacy': selectedPharmacy }
      })
    ])
      .then(([costRes, closingStockRes]) => {
        setCostStats({ 
          cost: costRes.data?.cost_of_sales ?? 0, 
          closingStock: closingStockRes.data?.closing_stock ?? 0 
        });
        setLoadingCostStats(false);
      })
      .catch(err => {
        setErrorCostStats('Error fetching cost stats.');
        setCostStats({ cost: 0, closingStock: 0 });
        setLoadingCostStats(false);
      });

    // Fetch turnover ratio for the month
    apiClient.get(`/api/turnover_ratio_for_range/${firstDayOfMonthStr}/${currentDateStr}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    })
      .then(res => {
        setTurnoverRatio({ ratio: res.data?.turnover_ratio ?? 0 });
        setLoadingTurnoverRatio(false);
      })
      .catch(err => {
        setErrorTurnoverRatio('Error fetching turnover ratio.');
        setTurnoverRatio({ ratio: 0 });
        setLoadingTurnoverRatio(false);
      });

    // Fetch days of inventory for the month
    apiClient.get(`/api/days_of_inventory_for_range/${firstDayOfMonthStr}/${currentDateStr}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    })
      .then(res => {
        setDaysOfInventory({ days: res.data?.days_of_inventory ?? 0 });
        setLoadingDaysOfInventory(false);
      })
      .catch(err => {
        setErrorDaysOfInventory('Error fetching days of inventory.');
        setDaysOfInventory({ days: 0 });
        setLoadingDaysOfInventory(false);
      });

    // Calculate the date range for 12-month inventory chart
    const currentMonth = selectedDateObj.getMonth() + 1; // 1-12
    const currentYear = selectedDateObj.getFullYear();
    
    // Calculate 12 months back from current month
    let startMonth = currentMonth - 11;
    let startYear = currentYear;
    
    if (startMonth <= 0) {
      startMonth += 12;
      startYear -= 1;
    }
    
    const chartStartDate = `${startYear}-${startMonth.toString().padStart(2, '0')}-01`;
    const chartEndDate = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${new Date(currentYear, currentMonth, 0).getDate()}`;

    // Fetch 12-month inventory data
    apiClient.get(`/api/monthly_closing_stock_for_range/${chartStartDate}/${chartEndDate}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    })
      .then(res => {
        const monthlyData = res.data?.monthly_closing_stock || [];
        
        // Calculate month-over-month changes
        const processedData = monthlyData.map((item, index) => {
          const currentValue = item.closing_stock;
          const previousValue = index > 0 ? monthlyData[index - 1].closing_stock : null;
          const inventoryChange = previousValue !== null ? currentValue - previousValue : null;
          
          return {
            ...item,
            inventory_change: inventoryChange,
            fill: item.month === `${currentYear}-${currentMonth.toString().padStart(2, '0')}` ? '#FF4500' : '#FFB800'
          };
        });
        
        setInventoryChartData(processedData);
        setLoadingInventoryChart(false);
      })
      .catch(err => {
        setErrorInventoryChart('Error fetching inventory chart data.');
        setInventoryChartData([]);
        setLoadingInventoryChart(false);
      });

  }, [selectedPharmacy, selectedDate]);

  // Format the selected date for display
  const getFormattedDate = (dateStr) => {
    if (!dateStr) return 'Selected Month';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  };
  
  const cardValueStyle = { color: '#fff', fontSize: '1.25rem', fontWeight: 700 };
  const cardLabelStyle = { color: '#bdbdbd', fontSize: '0.95rem', fontWeight: 500, marginBottom: 2 };
  const errorStyle = { color: 'red', fontSize: '1.1rem' };

  return (
    <div style={{ width: '100vw', boxSizing: 'border-box', marginTop: '-2mm', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* 12-Month Inventory Chart with Change Line */}
      <div style={{
        width: 'calc(100vw - 5mm)',
        height: 152,
        borderRadius: '1.2rem',
        boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
        padding: '1rem',
        paddingBottom: '0.5rem',
        marginBottom: '2mm',
        marginLeft: '2mm',
        marginRight: '2mm',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {loadingInventoryChart ? (
          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bdbdbd', fontSize: '0.9rem' }}>Loading 12-month inventory...</div>
        ) : errorInventoryChart ? (
          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'red', fontSize: '0.9rem' }}>{errorInventoryChart}</div>
        ) : inventoryChartData && inventoryChartData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" style={{ flexGrow: 1, minHeight: 0 }}>
              <ComposedChart data={inventoryChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <Tooltip content={<CustomInventoryTooltip />} cursor={{ fill: 'rgba(128, 128, 128, 0.1)' }}/>
                <Bar dataKey="closing_stock" name="Closing Stock" radius={[4, 4, 0, 0]} barSize={18} yAxisId="left">
                  {inventoryChartData.map((entry, index) => (
                    <Cell key={`cell-inventory-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
                <Line 
                  type="monotone" 
                  dataKey="inventory_change" 
                  name="Monthly Change" 
                  stroke="#fff" 
                  strokeWidth={3} 
                  dot={false}
                  activeDot={false}
                  yAxisId="right"
                  connectNulls={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
            <div style={{ textAlign: 'center', color: '#bdbdbd', fontSize: '0.8rem', paddingTop: '4px', flexShrink: 0 }}>
              12-Month Inventory Window
            </div>
          </>
        ) : (
          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bdbdbd', fontSize: '0.9rem' }}>No data for 12-month inventory.</div>
        )}
      </div>

      {/* Opening Stock KPI Card - Removed basket info */}
      <div style={{
        width: 'calc(100vw - 5mm)',
        marginLeft: '2mm',
        marginRight: '2mm',
        background: '#232b3b',
        color: '#fff',
        borderRadius: '1.2rem',
        fontSize: '2.2rem',
        fontWeight: 700,
        textAlign: 'center',
        boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
        padding: '0.8rem 0.2rem',
        marginBottom: '2mm',
        position: 'relative',
      }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 500, marginBottom: 4, textAlign: 'left', marginLeft: '4mm', color: '#bdbdbd' }}>
          Opening Stock ({getFormattedDate(selectedDate)})
        </div>
        <div style={{ fontSize: '1.6rem', fontWeight: 600, marginTop: 4, color: '#FF4500', textAlign: 'left', marginLeft: '4mm' }}>
          {loadingOpeningStock ? 'Loading...' : errorOpeningStock ? <span style={errorStyle}>{errorOpeningStock}</span> :
            `R ${openingStock !== null ? Math.round(openingStock).toLocaleString('en-ZA', { maximumFractionDigits: 0 }) : 'N/A'}`}
        </div>
      </div>

      {/* Row 1 of KPI Cards - Updated to show Purchases and Adjustments */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'row', gap: '1.5mm', alignItems: 'stretch', justifyContent: 'center', marginBottom: '2mm', padding: 0, boxSizing: 'border-box' }}>
        {/* Left card: Monthly Purchases and Adjustments */}
        <div style={{
          width: 'calc(50vw - 2.5mm)', background: '#232b3b', borderRadius: '1.2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          minHeight: '60px', marginLeft: '1.5mm', marginRight: 0, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'flex-start', padding: '0.5rem 1.2rem',
        }}>
          <div style={cardLabelStyle}>Monthly Purchases</div>
          <div style={{...cardValueStyle, marginBottom: 10 }}>
            {loadingPurchases ? '...' : errorPurchases ? <span style={errorStyle}>Err</span> : purchasesStats !== null ? `R${purchasesStats.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}` : 'N/A'}
          </div>
          <div style={cardLabelStyle}>Adjustments</div>
          <div style={cardValueStyle}>
            {loadingAdjustments ? '...' : errorAdjustments ? <span style={errorStyle}>Err</span> : adjustmentsStats !== null ? `R${adjustmentsStats.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}` : 'N/A'}
          </div>
        </div>
        {/* Right card: Cost of Sales and Closing Stock */}
        <div style={{
          width: 'calc(50vw - 2.5mm)', background: '#232b3b', borderRadius: '1.2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          minHeight: '60px', marginLeft: 0, marginRight: '1.5mm', display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'flex-start', padding: '0.5rem 1.2rem',
        }}>
          <div style={cardLabelStyle}>Cost of Sales</div>
          <div style={{ color: '#39FF14', fontSize: '1.25rem', fontWeight: 700, marginBottom: 10 }}>
            {loadingCostStats ? '...' : errorCostStats ? <span style={errorStyle}>Err</span> : costStats.cost !== null ? `R${costStats.cost.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}` : 'N/A'}
          </div>
          <div style={cardLabelStyle}>Closing Stock</div>
          <div style={{ color: '#FF4500', fontSize: '1.25rem', fontWeight: 700 }}>
            {loadingCostStats ? '...' : errorCostStats ? <span style={errorStyle}>Err</span> : costStats.closingStock !== null ? `R${costStats.closingStock.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Row 2 of KPI Cards - New Gauge Cards */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'row', gap: '1.5mm', alignItems: 'stretch', justifyContent: 'center', marginBottom: '1rem', padding: 0, boxSizing: 'border-box' }}>
        {/* Left card: Turnover Ratio Gauge */}
        <div style={{
          width: 'calc(50vw - 2.5mm)', background: '#232b3b', borderRadius: '1.2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          minHeight: '60px', marginLeft: '1.5mm', marginRight: 0, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center', padding: '0.5rem 1.2rem',
        }}>
          <div style={{ ...cardLabelStyle, alignSelf: 'center' }}>Turnover Ratio</div>
          {loadingTurnoverRatio ? (
            <div style={{ color: '#bdbdbd', fontSize: '1.1rem', marginTop: 18 }}>...</div>
          ) : errorTurnoverRatio ? (
            <div style={errorStyle}>Err</div>
          ) : (
            <div style={{ width: 140, height: 95, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
              <PieChart width={160} height={90} style={{ marginTop: 0 }}>
                <Pie
                  data={[
                    { name: 'Ratio', value: Math.min(turnoverRatio.ratio * 75, 100) }, // 1.0 ratio = 75% fill
                    { name: 'Remaining', value: Math.max(100 - (turnoverRatio.ratio * 75), 0) },
                  ]}
                  cx={80}
                  cy={74}
                  innerRadius={48}
                  outerRadius={70}
                  startAngle={180}
                  endAngle={0}
                  dataKey="value"
                  stroke="none"
                  cornerRadius={4}
                >
                  <Cell key="ratio" fill="#8A2BE2" />
                  <Cell key="remaining" fill="#374151" />
                </Pie>
              </PieChart>
              <div style={{
                position: 'absolute', left: 8, right: 0, top: 38, textAlign: 'center',
                fontSize: '2.1rem', fontWeight: 700, color: '#fff',
                letterSpacing: '-1px', pointerEvents: 'none',
              }}>
                {turnoverRatio.ratio !== null ? turnoverRatio.ratio.toFixed(1) : ''}
              </div>
            </div>
          )}
        </div>
        {/* Right card: Days of Inventory Gauge */}
        <div style={{
          width: 'calc(50vw - 2.5mm)', background: '#232b3b', borderRadius: '1.2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          minHeight: '60px', marginLeft: 0, marginRight: '1.5mm', display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center', padding: '0.5rem 1.2rem',
        }}>
          <div style={{ ...cardLabelStyle, alignSelf: 'center' }}>Days of Inventory</div>
          {loadingDaysOfInventory ? (
            <div style={{ color: '#bdbdbd', fontSize: '1.1rem', marginTop: 18 }}>...</div>
          ) : errorDaysOfInventory ? (
            <div style={errorStyle}>Err</div>
          ) : (
            <div style={{ width: 140, height: 95, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
              <PieChart width={160} height={90} style={{ marginTop: 0 }}>
                <Pie
                  data={[
                    { name: 'Days', value: Math.min((daysOfInventory.days / 60) * 100, 100) }, // 60 days = 100% fill
                    { name: 'Remaining', value: Math.max(100 - ((daysOfInventory.days / 60) * 100), 0) },
                  ]}
                  cx={80}
                  cy={74}
                  innerRadius={48}
                  outerRadius={70}
                  startAngle={180}
                  endAngle={0}
                  dataKey="value"
                  stroke="none"
                  cornerRadius={4}
                >
                  <Cell key="days" fill="#00CED1" />
                  <Cell key="remaining" fill="#374151" />
                </Pie>
              </PieChart>
              <div style={{
                position: 'absolute', left: 8, right: 0, top: 38, textAlign: 'center',
                fontSize: '2.1rem', fontWeight: 700, color: '#fff',
                letterSpacing: '-1px', pointerEvents: 'none',
              }}>
                {daysOfInventory.days !== null ? Math.round(daysOfInventory.days) : ''}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StockView; 
