import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Custom Tooltip for Composed Chart
const CustomCombinedTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const turnoverData = payload.find(p => p.dataKey === 'turnover');
    const basketData = payload.find(p => p.dataKey === 'avg_basket_value');

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
        {turnoverData && (
          <p style={{ margin: 0, color: turnoverData.payload.fill === '#FF4500' ? '#FF4500' : '#39FF14' }}>
            {`Turnover: R ${turnoverData.value.toLocaleString('en-ZA')}`}
          </p>
        )}
        {basketData && (
          <p style={{ margin: '0.2rem 0 0 0', color: '#fff' }}>
            {`Avg Basket: R ${basketData.value.toLocaleString('en-ZA', { maximumFractionDigits: 2 })}`}
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

  const [transStats, setTransStats] = useState({ transactions: null, scripts: null });
  const [loadingTransStats, setLoadingTransStats] = useState(true);
  const [errorTransStats, setErrorTransStats] = useState(null);

  const [dispPie, setDispPie] = useState({ percent: null, disp: null, total: null });
  const [loadingDispPie, setLoadingDispPie] = useState(true);
  const [errorDispPie, setErrorDispPie] = useState(null);

  const [combinedChartData, setCombinedChartData] = useState([]);
  const [loadingCombinedChart, setLoadingCombinedChart] = useState(true);
  const [errorCombinedChart, setErrorCombinedChart] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (!selectedPharmacy || !selectedDate) {
      // Reset all states if no pharmacy or date
      setOpeningStock(null); setLoadingOpeningStock(true); setErrorOpeningStock(null);
      setPurchasesStats(null); setLoadingPurchases(true); setErrorPurchases(null);
      setAdjustmentsStats(null); setLoadingAdjustments(true); setErrorAdjustments(null);
      setCostStats({ cost: null, closingStock: null }); setLoadingCostStats(true); setErrorCostStats(null);
      setTransStats({ transactions: null, scripts: null }); setLoadingTransStats(true); setErrorTransStats(null);
      setDispPie({ percent: null, disp: null, total: null }); setLoadingDispPie(true); setErrorDispPie(null);
      setCombinedChartData([]); setLoadingCombinedChart(true); setErrorCombinedChart(null);
      return;
    }

    // Set loading states to true and reset errors/data for new fetch
    setLoadingOpeningStock(true); setErrorOpeningStock(null); setOpeningStock(null);
    setLoadingPurchases(true); setErrorPurchases(null); setPurchasesStats(null);
    setLoadingAdjustments(true); setErrorAdjustments(null); setAdjustmentsStats(null);
    setLoadingCostStats(true); setErrorCostStats(null); setCostStats({ cost: null, closingStock: null });
    setLoadingTransStats(true); setErrorTransStats(null); setTransStats({ transactions: null, scripts: null });
    setLoadingDispPie(true); setErrorDispPie(null); setDispPie({ percent: null, disp: null, total: null });
    setLoadingCombinedChart(true); setErrorCombinedChart(null); setCombinedChartData([]);

    // Calculate first day of the month from selected date
    const selectedDateObj = new Date(selectedDate);
    const firstDayOfMonth = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), 1);
    const firstDayOfMonthStr = firstDayOfMonth.toISOString().split('T')[0];
    const currentDateStr = selectedDate; // Use selected date as end date

    // Fetch Opening stock for the month
    axios.get(`${API_BASE_URL}/api/opening_stock_for_range/${firstDayOfMonthStr}/${currentDateStr}`, {
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
    axios.get(`${API_BASE_URL}/api/costs_for_range/${firstDayOfMonthStr}/${currentDateStr}`, {
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
    axios.get(`${API_BASE_URL}/api/stock_adjustments_for_range/${firstDayOfMonthStr}/${currentDateStr}`, {
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
      axios.get(`${API_BASE_URL}/api/costs_for_range/${firstDayOfMonthStr}/${currentDateStr}`, {
        headers: { 'X-Pharmacy': selectedPharmacy }
      }),
      axios.get(`${API_BASE_URL}/api/closing_stock_for_range/${firstDayOfMonthStr}/${currentDateStr}`, {
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

    // Fetch total transactions and scripts for the month
    axios.get(`${API_BASE_URL}/api/transactions_for_range/${firstDayOfMonthStr}/${currentDateStr}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    })
      .then(res => {
        setTransStats({ transactions: res.data?.total_transactions ?? 0, scripts: res.data?.total_scripts ?? 0 });
        setLoadingTransStats(false);
      })
      .catch(err => {
        setErrorTransStats('Error fetching transaction stats.');
        setTransStats({ transactions: 0, scripts: 0 });
        setLoadingTransStats(false);
      });

    // Fetch dispensary percentage for the month
    axios.get(`${API_BASE_URL}/api/dispensary_vs_total_turnover/${firstDayOfMonthStr}/${currentDateStr}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    })
      .then(res => {
        const dispensary = res.data?.dispensary_turnover ?? 0;
        const total = res.data?.total_turnover ?? 0;
        const percent = total > 0 ? (dispensary / total) * 100 : 0;
        setDispPie({ percent, disp: dispensary, total });
        setLoadingDispPie(false);
      })
      .catch(err => {
        setErrorDispPie('Error fetching dispensary metrics.');
        setDispPie({ percent: 0, disp: 0, total: 0 });
        setLoadingDispPie(false);
      });

    // Calculate the date range for the chart (14 days ending with selected date)
    const endDate = new Date(selectedDate);
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 13); // 14 days total

    const formatDateForAPI = (date) => {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const chartStartDate = formatDateForAPI(startDate);
    const chartEndDate = formatDateForAPI(endDate);

    // Fetch 14-day turnover and basket data for combined chart
    Promise.all([
      axios.get(`${API_BASE_URL}/api/daily_turnover_for_range/${chartStartDate}/${chartEndDate}`, {
        headers: { 'X-Pharmacy': selectedPharmacy }
      }),
      axios.get(`${API_BASE_URL}/api/daily_avg_basket_for_range/${chartStartDate}/${chartEndDate}`, {
        headers: { 'X-Pharmacy': selectedPharmacy }
      })
    ])
      .then(([turnoverRes, basketRes]) => {
        const dailyTurnover = turnoverRes.data?.daily_turnover || [];
        const dailyBasket = basketRes.data?.daily_avg_basket || [];

        // Create a combined dataset
        const dataMap = {};
        dailyTurnover.forEach(item => {
          dataMap[item.date] = { 
            date: item.date, 
            turnover: item.turnover || 0,
            fill: item.date === selectedDate ? '#FF4500' : '#39FF14' // Highlight selected date
          };
        });

        dailyBasket.forEach(item => {
          if (dataMap[item.date]) {
            dataMap[item.date].avg_basket_value = item.avg_basket_value || 0;
          }
        });

        const chartData = Object.values(dataMap).sort((a, b) => a.date.localeCompare(b.date));
        setCombinedChartData(chartData);
        setLoadingCombinedChart(false);
      })
      .catch(err => {
        setErrorCombinedChart('Error fetching chart data.');
        setCombinedChartData([]);
        setLoadingCombinedChart(false);
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
      {/* 14-Day Combined Chart */}
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
        {loadingCombinedChart ? (
          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bdbdbd', fontSize: '0.9rem' }}>Loading 14-day chart...</div>
        ) : errorCombinedChart ? (
          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'red', fontSize: '0.9rem' }}>{errorCombinedChart}</div>
        ) : combinedChartData && combinedChartData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" style={{ flexGrow: 1, minHeight: 0 }}>
              <ComposedChart data={combinedChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <Tooltip content={<CustomCombinedTooltip />} cursor={{ fill: 'rgba(128, 128, 128, 0.1)' }}/>
                <Bar dataKey="turnover" yAxisId="left" name="Turnover" radius={[4, 4, 0, 0]} barSize={18}>
                  {combinedChartData.map((entry, index) => (
                    <Cell key={`cell-turnover-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
                <Line 
                  type="monotone" 
                  dataKey="avg_basket_value" 
                  yAxisId="right" 
                  name="Avg Basket Value" 
                  stroke="#fff" 
                  strokeWidth={3.5} 
                  dot={false}
                  activeDot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
            <div style={{ textAlign: 'center', color: '#bdbdbd', fontSize: '0.8rem', paddingTop: '4px', flexShrink: 0 }}>
              14-Day Sales Window
            </div>
          </>
        ) : (
          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bdbdbd', fontSize: '0.9rem' }}>No data for 14-day trend.</div>
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

      {/* Row 2 of KPI Cards */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'row', gap: '1.5mm', alignItems: 'stretch', justifyContent: 'center', marginBottom: '1rem', padding: 0, boxSizing: 'border-box' }}>
        {/* Left card: Transaction Qty and Script Qty */}
        <div style={{
          width: 'calc(50vw - 2.5mm)', background: '#232b3b', borderRadius: '1.2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          minHeight: '60px', marginLeft: '1.5mm', marginRight: 0, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'flex-start', padding: '0.5rem 1.2rem',
        }}>
          <div style={cardLabelStyle}>Transaction Qty</div>
          <div style={{...cardValueStyle, marginBottom: 10 }}>
            {loadingTransStats ? '...' : errorTransStats ? <span style={errorStyle}>Err</span> : transStats.transactions !== null ? transStats.transactions.toLocaleString('en-ZA') : 'N/A'}
          </div>
          <div style={cardLabelStyle}>Script Qty</div>
          <div style={cardValueStyle}>
            {loadingTransStats ? '...' : errorTransStats ? <span style={errorStyle}>Err</span> : transStats.scripts !== null ? transStats.scripts.toLocaleString('en-ZA') : 'N/A'}
          </div>
        </div>
        {/* Right card: Dispensary % Pie Chart */}
        <div style={{
          width: 'calc(50vw - 2.5mm)', background: '#232b3b', borderRadius: '1.2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          minHeight: '60px', marginLeft: 0, marginRight: '1.5mm', display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center', padding: '0.5rem 1.2rem',
        }}>
          <div style={{ ...cardLabelStyle, alignSelf: 'center' }}>Dispensary %</div>
          {loadingDispPie ? (
            <div style={{ color: '#bdbdbd', fontSize: '1.1rem', marginTop: 18 }}>...</div>
          ) : errorDispPie ? (
            <div style={errorStyle}>Err</div>
          ) : (
            <div style={{ width: 140, height: 95, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
              <PieChart width={160} height={90} style={{ marginTop: 0 }}>
                <Pie
                  data={[
                    { name: 'Dispensary', value: dispPie.disp },
                    { name: 'Other', value: Math.max(dispPie.total - dispPie.disp, 0) },
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
                  <Cell key="disp" fill="#FFB800" />
                  <Cell key="other" fill="#374151" />
                </Pie>
              </PieChart>
              <div style={{
                position: 'absolute', left: 8, right: 0, top: 38, textAlign: 'center',
                fontSize: '2.1rem', fontWeight: 700, color: '#fff',
                letterSpacing: '-1px', pointerEvents: 'none',
              }}>
                {dispPie.percent !== null ? Math.round(dispPie.percent) : ''}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StockView; 
