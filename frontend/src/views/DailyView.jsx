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
        {/* <p style={{ margin: 0, marginBottom: '0.3rem' }}>{`Date: ${label}`}</p> */}
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

// Custom Tooltip for Year-over-Year Comparison Chart
const CustomYoYTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const currentYearData = payload.find(p => p.dataKey === 'currentYear');
    const lastYearData = payload.find(p => p.dataKey === 'lastYear');
    const data = payload[0]?.payload;

    return (
      <div style={{
        background: 'rgba(35, 43, 59, 0.9)',
        border: '1px solid #374151',
        color: '#fff',
        borderRadius: '0.8rem',
        padding: '0.8rem 1.2rem',
        fontSize: '0.9rem',
        fontWeight: 500,
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      }}>
        {data?.currentDate && (
          <p style={{ margin: 0, color: '#bdbdbd', fontSize: '0.8rem', textAlign: 'center' }}>
            {new Date(data.currentDate).toLocaleDateString('en-ZA')} vs {new Date(data.lastYearDate).toLocaleDateString('en-ZA')}
          </p>
        )}
        {currentYearData && (
          <p style={{ margin: '0.4rem 0 0 0', color: '#FF4500', fontSize: '1rem', fontWeight: 600 }}>
            {`This Year: R ${currentYearData.value.toLocaleString('en-ZA')}`}
          </p>
        )}
        {lastYearData && (
          <p style={{ margin: '0.4rem 0 0 0', color: '#39FF14', fontSize: '1rem', fontWeight: 600 }}>
            {`Last Year: R ${lastYearData.value.toLocaleString('en-ZA')}`}
          </p>
        )}
        {currentYearData && lastYearData && lastYearData.value > 0 && (
          <p style={{ margin: '0.4rem 0 0 0', color: '#bdbdbd', fontSize: '0.85rem' }}>
            {`Change: ${((currentYearData.value - lastYearData.value) / lastYearData.value * 100).toFixed(1)}%`}
          </p>
        )}
      </div>
    );
  }
  return null;
};

function DailyView({ selectedPharmacy, selectedDate }) {
  const [dailyTurnover, setDailyTurnover] = useState(null);
  const [loadingKpi, setLoadingKpi] = useState(true);
  const [errorKpi, setErrorKpi] = useState(null);

  const [avgBasket, setAvgBasket] = useState({ value: null, size: null });
  const [loadingAvgBasket, setLoadingAvgBasket] = useState(true);
  const [errorAvgBasket, setErrorAvgBasket] = useState(null);

  const [gpStats, setGpStats] = useState({ percent: null, value: null });
  const [loadingGpStats, setLoadingGpStats] = useState(true);
  const [errorGpStats, setErrorGpStats] = useState(null);

  const [costStats, setCostStats] = useState({ cost: null, purchases: null });
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

  // Year-over-year comparison chart states
  const [yoyComparisonData, setYoyComparisonData] = useState([]);
  const [loadingYoyComparison, setLoadingYoyComparison] = useState(true);
  const [errorYoyComparison, setErrorYoyComparison] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (!selectedPharmacy || !selectedDate) {
      // Reset all states if no pharmacy or date
      setDailyTurnover(null); setLoadingKpi(true); setErrorKpi(null);
      setAvgBasket({ value: null, size: null }); setLoadingAvgBasket(true); setErrorAvgBasket(null);
      setGpStats({ percent: null, value: null }); setLoadingGpStats(true); setErrorGpStats(null);
      setCostStats({ cost: null, purchases: null }); setLoadingCostStats(true); setErrorCostStats(null);
      setTransStats({ transactions: null, scripts: null }); setLoadingTransStats(true); setErrorTransStats(null);
      setDispPie({ percent: null, disp: null, total: null }); setLoadingDispPie(true); setErrorDispPie(null);
      setCombinedChartData([]); setLoadingCombinedChart(true); setErrorCombinedChart(null);
      setYoyComparisonData([]); setLoadingYoyComparison(true); setErrorYoyComparison(null);
      return;
    }

    // Set loading states to true and reset errors/data for new fetch
    setLoadingKpi(true); setErrorKpi(null); setDailyTurnover(null);
    setLoadingAvgBasket(true); setErrorAvgBasket(null); setAvgBasket({ value: null, size: null });
    setLoadingGpStats(true); setErrorGpStats(null); setGpStats({ percent: null, value: null });
    setLoadingCostStats(true); setErrorCostStats(null); setCostStats({ cost: null, purchases: null });
    setLoadingTransStats(true); setErrorTransStats(null); setTransStats({ transactions: null, scripts: null });
    setLoadingDispPie(true); setErrorDispPie(null); setDispPie({ percent: null, disp: null, total: null });
    setLoadingCombinedChart(true); setErrorCombinedChart(null); setCombinedChartData([]);
    setLoadingYoyComparison(true); setErrorYoyComparison(null); setYoyComparisonData([]);

    const singleDate = selectedDate; // Use selectedDate for both start and end

    // Fetch Daily turnover for KPI card
    axios.get(`${API_BASE_URL}/api/turnover_for_range/${singleDate}/${singleDate}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    })
      .then(res => {
        setDailyTurnover(res.data?.turnover ?? 0);
        setLoadingKpi(false);
      })
      .catch(err => {
        setErrorKpi('Error fetching daily turnover.');
        setDailyTurnover(0);
        setLoadingKpi(false);
      });

    // Fetch avg basket value/size
    axios.get(`${API_BASE_URL}/api/avg_basket_for_range/${singleDate}/${singleDate}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    })
      .then(res => {
        setAvgBasket({ value: res.data?.avg_basket_value ?? 0, size: res.data?.avg_basket_size ?? 0 });
        setLoadingAvgBasket(false);
      })
      .catch(err => {
        setErrorAvgBasket('Error fetching basket metrics.');
        setAvgBasket({ value: 0, size: 0 });
        setLoadingAvgBasket(false);
      });

    // Fetch GP stats
    axios.get(`${API_BASE_URL}/api/gp_for_range/${singleDate}/${singleDate}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    })
      .then(res => {
        // For daily, avg_gp_percent is the day's GP percent, cumulative_gp_value is the day's GP value
        setGpStats({ percent: res.data?.avg_gp_percent ?? 0, value: res.data?.cumulative_gp_value ?? 0 });
        setLoadingGpStats(false);
      })
      .catch(err => {
        setErrorGpStats('Error fetching GP stats.');
        setGpStats({ percent: 0, value: 0 });
        setLoadingGpStats(false);
      });

    // Fetch cost of sales and purchases
    axios.get(`${API_BASE_URL}/api/costs_for_range/${singleDate}/${singleDate}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    })
      .then(res => {
        setCostStats({ cost: res.data?.cost_of_sales ?? 0, purchases: res.data?.purchases ?? 0 });
        setLoadingCostStats(false);
      })
      .catch(err => {
        setErrorCostStats('Error fetching cost stats.');
        setCostStats({ cost: 0, purchases: 0 });
        setLoadingCostStats(false);
      });

    // Fetch total transactions and scripts
    axios.get(`${API_BASE_URL}/api/transactions_for_range/${singleDate}/${singleDate}`, {
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

    // Fetch dispensary vs total turnover
    axios.get(`${API_BASE_URL}/api/dispensary_vs_total_turnover/${singleDate}/${singleDate}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    })
      .then(res => {
        setDispPie({ percent: res.data?.percent ?? 0, disp: res.data?.dispensary_turnover ?? 0, total: res.data?.total_turnover ?? 0 });
        setLoadingDispPie(false);
      })
      .catch(err => {
        setErrorDispPie('Error fetching dispensary pie.');
        setDispPie({ percent: 0, disp: 0, total: 0 });
        setLoadingDispPie(false);
      });

    // Fetch 14-day turnover data
    const endDateForChart = new Date(singleDate + 'T00:00:00');
    const startDateForChart = new Date(endDateForChart);
    startDateForChart.setDate(endDateForChart.getDate() - 13);

    const formatDateForAPI = (date) => {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const apiStartDate = formatDateForAPI(startDateForChart);
    const apiEndDate = singleDate; // already in YYYY-MM-DD format

    const fetchTurnover = axios.get(`${API_BASE_URL}/api/daily_turnover_for_range/${apiStartDate}/${apiEndDate}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    });
    const fetchAvgBasket = axios.get(`${API_BASE_URL}/api/daily_avg_basket_for_range/${apiStartDate}/${apiEndDate}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    });

    Promise.all([fetchTurnover, fetchAvgBasket])
      .then(([turnoverRes, basketRes]) => {
        const dailyTurnover = turnoverRes.data?.daily_turnover || [];
        const dailyBasket = basketRes.data?.daily_avg_basket || [];

        // Combine turnover and basket data
        const combinedData = dailyTurnover.map((turnoverItem, index) => {
          const basketItem = dailyBasket.find(b => b.date === turnoverItem.date) || {};
          const isToday = turnoverItem.date === singleDate;
          return {
            date: turnoverItem.date.slice(5), // MM-DD format
            turnover: turnoverItem.turnover || 0,
            avg_basket_value: basketItem.avg_basket_value || 0,
            fill: isToday ? '#FF4500' : '#39FF14'
          };
        });

        setCombinedChartData(combinedData);
        setLoadingCombinedChart(false);
      })
      .catch(err => {
        setErrorCombinedChart('Error fetching chart data.');
        setCombinedChartData([]);
        setLoadingCombinedChart(false);
      });

    // Calculate corresponding day last year and fetch year-over-year comparison data
    const getCorrespondingDayLastYear = (dateString) => {
      const currentDate = new Date(dateString + 'T00:00:00'); // Ensure proper parsing as local date
      const currentYear = currentDate.getFullYear();
      const lastYear = currentYear - 1;
      
      // Try the exact same date last year first
      const sameDataLastYear = new Date(lastYear, currentDate.getMonth(), currentDate.getDate());
      
      // Get the day of the week for the current date and same date last year
      const currentDayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const lastYearDayOfWeek = sameDataLastYear.getDay();
      
      // Calculate how many days to adjust to get the same day of the week
      const dayDifference = currentDayOfWeek - lastYearDayOfWeek;
      
      // Adjust the date to get the closest day of the week from last year
      const correspondingDate = new Date(sameDataLastYear);
      correspondingDate.setDate(sameDataLastYear.getDate() + dayDifference);
      
      // Development logging to verify calculation
      if (process.env.NODE_ENV === 'development') {
        const currentDayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
        const sameDataLastYearDayName = sameDataLastYear.toLocaleDateString('en-US', { weekday: 'long' });
        const correspondingDayName = correspondingDate.toLocaleDateString('en-US', { weekday: 'long' });
        console.log(`Year-over-Year Date Calculation:
          Selected: ${dateString} (${currentDayName})
          Same date last year: ${sameDataLastYear.getFullYear()}-${(sameDataLastYear.getMonth() + 1).toString().padStart(2, '0')}-${sameDataLastYear.getDate().toString().padStart(2, '0')} (${sameDataLastYearDayName})
          Corresponding day: ${correspondingDate.getFullYear()}-${(correspondingDate.getMonth() + 1).toString().padStart(2, '0')}-${correspondingDate.getDate().toString().padStart(2, '0')} (${correspondingDayName})
          Days adjusted: ${dayDifference}`);
      }
      
      // Return in YYYY-MM-DD format
      const year = correspondingDate.getFullYear();
      const month = (correspondingDate.getMonth() + 1).toString().padStart(2, '0');
      const day = correspondingDate.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Test function to verify specific date calculations
    const testDateCalculation = () => {
      const testCases = [
        '2025-06-07', // Saturday - should map to Saturday June 8, 2024
        '2024-06-07', // Friday - should map to Friday June 9, 2023
        '2024-12-25', // Wednesday - should map to Wednesday Dec 27, 2023
        '2024-02-29', // Thursday (leap year) - should map to Thursday March 2, 2023
      ];
      
      console.log('=== Year-over-Year Date Calculation Tests ===');
      testCases.forEach(testDate => {
        const result = getCorrespondingDayLastYear(testDate);
        console.log(`${testDate} → ${result}`);
      });
      console.log('=== End Tests ===');
    };

    // Run test for development
    if (process.env.NODE_ENV === 'development') {
      testDateCalculation();
    }

    const correspondingDayLastYear = getCorrespondingDayLastYear(singleDate);

    // Fetch current year and last year data for comparison
    const fetchCurrentYearData = axios.get(`${API_BASE_URL}/api/turnover_for_range/${singleDate}/${singleDate}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    });

    const fetchLastYearData = axios.get(`${API_BASE_URL}/api/turnover_for_range/${correspondingDayLastYear}/${correspondingDayLastYear}`, {
      headers: { 'X-Pharmacy': selectedPharmacy }
    });

    Promise.all([fetchCurrentYearData, fetchLastYearData])
      .then(([currentRes, lastYearRes]) => {
        const currentYearTurnover = currentRes.data?.turnover || 0;
        const lastYearTurnover = lastYearRes.data?.turnover || 0;
        
        // Sanitize the data to ensure valid numbers
        const sanitizeValue = (value) => {
          const num = Number(value);
          return isNaN(num) || !isFinite(num) ? 0 : num;
        };
        
        const currentDate = new Date(singleDate);
        const lastYearDate = new Date(correspondingDayLastYear);
        const currentDayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
        
        const yoyData = [
          {
            category: currentDayName,
            currentYear: sanitizeValue(currentYearTurnover),
            lastYear: sanitizeValue(lastYearTurnover),
            currentDate: singleDate,
            lastYearDate: correspondingDayLastYear
          }
        ];

        console.log('Sanitized YoY data:', yoyData);
        setYoyComparisonData(yoyData);
        setLoadingYoyComparison(false);
      })
      .catch(err => {
        setErrorYoyComparison('Error fetching year-over-year comparison data.');
        setYoyComparisonData([]);
        setLoadingYoyComparison(false);
      });

  }, [selectedPharmacy, selectedDate]);

  // Format the selected date for display
  const getFormattedDate = (dateStr) => {
    if (!dateStr) return 'Selected Day';
    const date = new Date(dateStr + 'T00:00:00'); // Ensure it's parsed as local date
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  
  const cardValueStyle = { color: '#fff', fontSize: '1.25rem', fontWeight: 700 };
  const cardLabelStyle = { color: '#bdbdbd', fontSize: '0.95rem', fontWeight: 500, marginBottom: 2 };
  const errorStyle = { color: 'red', fontSize: '1.1rem' };

  return (
    <div style={{ width: '100vw', boxSizing: 'border-box', marginTop: '-2mm', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* 14-Day Combined Chart */}
      <div style={{
        width: 'calc(100vw - 5mm)',
        height: 152, // Increased height for legend and dual axis
        /* background: '#232b3b', */
        borderRadius: '1.2rem',
        boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
        padding: '1rem',
        paddingBottom: '0.5rem', // Less padding at bottom for label
        marginBottom: '2mm', // Reverted change from user
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
                {/* <CartesianGrid strokeDasharray="3 3" stroke="#374151" /> */}
                {/* <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10, fill: '#9CA3AF' }} 
                  axisLine={{ stroke: '#4B5563' }} 
                  tickLine={{ stroke: '#4B5563' }}
                  interval="preserveStartEnd"
                /> */}
                {/* <YAxis 
                  yAxisId="left" 
                  orientation="left" 
                  stroke="#A0AEC0" 
                  tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  tickFormatter={(value) => `R${(value / 1000).toFixed(0)}k`}
                  axisLine={{ stroke: '#4B5563' }}
                  tickLine={{ stroke: '#4B5563' }}
                /> */}
                {/* <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke="#8884d8" 
                  tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  tickFormatter={(value) => `R${value.toFixed(0)}`}
                  axisLine={{ stroke: '#4B5563' }}
                  tickLine={{ stroke: '#4B5563' }}
                /> */}
                <Tooltip content={<CustomCombinedTooltip />} cursor={{ fill: 'rgba(128, 128, 128, 0.1)' }}/>
                {/* <Legend verticalAlign="top" height={25} wrapperStyle={{fontSize: "11px", color: "#bdbdbd", paddingTop: "0px", paddingBottom: "5px" }} /> */}
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

      {/* KPI Card */}
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
          Turnover ({getFormattedDate(selectedDate)})
        </div>
        <div style={{ fontSize: '1.6rem', fontWeight: 600, marginTop: 4, color: '#FF4500', textAlign: 'left', marginLeft: '4mm' }}>
          {loadingKpi ? 'Loading...' : errorKpi ? <span style={errorStyle}>{errorKpi}</span> :
            `R ${dailyTurnover !== null ? Math.round(dailyTurnover).toLocaleString('en-ZA', { maximumFractionDigits: 0 }) : 'N/A'}`}
        </div>
        <div style={{ position: 'absolute', top: 22, right: 18, display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#bdbdbd', fontWeight: 400, lineHeight: 1 }}>Avg basket</span>
            <span style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 600, lineHeight: 2.5 }}>
              {loadingAvgBasket ? '...' : errorAvgBasket ? <span style={{ color: 'red', fontSize: '0.9rem' }}>Err</span> : `R${avgBasket.value !== null ? avgBasket.value.toLocaleString('en-ZA', { maximumFractionDigits: 2 }) : 'N/A'}`}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#bdbdbd', fontWeight: 400, lineHeight: 1 }}>Avg size</span>
            <span style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 600, lineHeight: 2.5 }}>
              {loadingAvgBasket ? '...' : errorAvgBasket ? <span style={{ color: 'red', fontSize: '0.9rem' }}>Err</span> : `${avgBasket.size !== null ? avgBasket.size.toLocaleString('en-ZA', { maximumFractionDigits: 2 }) : 'N/A'}`}
            </span>
          </div>
        </div>
      </div>

      {/* Row 1 of KPI Cards */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'row', gap: '1.5mm', alignItems: 'stretch', justifyContent: 'center', marginBottom: '2mm', padding: 0, boxSizing: 'border-box' }}>
        {/* Left card: Daily GP% and GP Value */}
        <div style={{
          width: 'calc(50vw - 2.5mm)', background: '#232b3b', borderRadius: '1.2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          minHeight: '60px', marginLeft: '1.5mm', marginRight: 0, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'flex-start', padding: '0.5rem 1.2rem',
        }}>
          <div style={cardLabelStyle}>Daily GP%</div>
          <div style={{...cardValueStyle, marginBottom: 10 }}>
            {loadingGpStats ? '...' : errorGpStats ? <span style={errorStyle}>Err</span> : gpStats.percent !== null ? `${gpStats.percent.toLocaleString('en-ZA', { maximumFractionDigits: 2 })}%` : 'N/A'}
          </div>
          <div style={cardLabelStyle}>GP Value</div>
          <div style={cardValueStyle}>
            {loadingGpStats ? '...' : errorGpStats ? <span style={errorStyle}>Err</span> : gpStats.value !== null ? `R${gpStats.value.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}` : 'N/A'}
          </div>
        </div>
        {/* Right card: Cost of Sales and Purchases */}
        <div style={{
          width: 'calc(50vw - 2.5mm)', background: '#232b3b', borderRadius: '1.2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          minHeight: '60px', marginLeft: 0, marginRight: '1.5mm', display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'flex-start', padding: '0.5rem 1.2rem',
        }}>
          <div style={cardLabelStyle}>Cost of Sales</div>
          <div style={{ color: '#39FF14', fontSize: '1.25rem', fontWeight: 700, marginBottom: 10 }}>
            {loadingCostStats ? '...' : errorCostStats ? <span style={errorStyle}>Err</span> : costStats.cost !== null ? `R${costStats.cost.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}` : 'N/A'}
          </div>
          <div style={cardLabelStyle}>Purchases</div>
          <div style={{ color: '#FF4500', fontSize: '1.25rem', fontWeight: 700 }}>
            {loadingCostStats ? '...' : errorCostStats ? <span style={errorStyle}>Err</span> : costStats.purchases !== null ? `R${costStats.purchases.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}` : 'N/A'}
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

      {/* Year-over-Year Comparison Chart */}
      <div style={{
        width: 'calc(100vw - 5mm)',
        marginLeft: '2mm',
        marginRight: '2mm',
        background: '#232b3b',
        color: '#fff',
        borderRadius: '1.2rem',
        boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
        padding: '1rem',
        marginBottom: '1rem',
        height: '280px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ 
          fontSize: '1.1rem', 
          fontWeight: 600, 
          marginBottom: '0.8rem', 
          textAlign: 'center', 
          color: '#fff' 
        }}>
          {yoyComparisonData.length > 0 && yoyComparisonData[0].currentDate ? 
            `Sales Comparison: ${new Date(yoyComparisonData[0].currentDate).toLocaleDateString('en-ZA')} vs ${new Date(yoyComparisonData[0].lastYearDate).toLocaleDateString('en-ZA')}` :
            'Sales Comparison: Today vs Same Day Last Year'
          }
        </div>
        
        {loadingYoyComparison ? (
          <div style={{ 
            flexGrow: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: '#bdbdbd', 
            fontSize: '0.9rem' 
          }}>
            Loading comparison data...
          </div>
        ) : errorYoyComparison ? (
          <div style={{ 
            flexGrow: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: 'red', 
            fontSize: '0.9rem' 
          }}>
            {errorYoyComparison}
          </div>
        ) : yoyComparisonData.length > 0 && yoyComparisonData.every(item => 
            typeof item.currentYear === 'number' && 
            typeof item.lastYear === 'number' && 
            isFinite(item.currentYear) && 
            isFinite(item.lastYear)
          ) ? (
          <>
            {/* Enhanced Debug logging for development */}
            {process.env.NODE_ENV === 'development' && console.log('YoY Chart Data:', JSON.stringify(yoyComparisonData, null, 2))}
            {process.env.NODE_ENV === 'development' && yoyComparisonData.forEach((item, index) => {
              console.log(`Data item ${index}:`, {
                category: item.category,
                currentYear: item.currentYear,
                lastYear: item.lastYear,
                currentDate: item.currentDate,
                lastYearDate: item.lastYearDate
              });
            })}
            
            {/* Test data for debugging */}
            {process.env.NODE_ENV === 'development' && (() => {
              const testData = [
                {
                  category: 'Saturday',
                  currentYear: 53680,
                  lastYear: 45000,
                  currentDate: '2025-05-31',
                  lastYearDate: '2024-06-01'
                }
              ];
              console.log('Test data for comparison:', testData);
              return null;
            })()}
            
            <ResponsiveContainer width="100%" style={{ flexGrow: 1, minHeight: 0 }}>
              <BarChart 
                data={yoyComparisonData.map(item => ({
                  category: item.category || 'Day',
                  currentYear: Math.max(0, Number(item.currentYear) || 0),
                  lastYear: Math.max(0, Number(item.lastYear) || 0),
                  currentDate: item.currentDate,
                  lastYearDate: item.lastYearDate
                }))} 
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="category" 
                  tick={{ fontSize: 12, fill: '#9CA3AF' }} 
                  axisLine={{ stroke: '#4B5563' }} 
                  tickLine={{ stroke: '#4B5563' }}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  tickFormatter={(value) => {
                    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
                      return 'R0';
                    }
                    if (value >= 1000000) return `R${(value/1000000).toFixed(1)}M`;
                    if (value >= 1000) return `R${(value/1000).toFixed(0)}k`;
                    return `R${Math.round(value)}`;
                  }}
                  axisLine={{ stroke: '#4B5563' }}
                  tickLine={{ stroke: '#4B5563' }}
                />
                <Tooltip content={<CustomYoYTooltip />} cursor={{ fill: 'rgba(128, 128, 128, 0.1)' }}/>
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  wrapperStyle={{
                    fontSize: "12px", 
                    color: "#bdbdbd", 
                    paddingTop: "0px", 
                    paddingBottom: "10px"
                  }} 
                />
                <Bar 
                  dataKey="currentYear" 
                  name="This Year" 
                  fill="#FF4500"
                  radius={[4, 4, 0, 0]} 
                  barSize={60}
                />
                <Bar 
                  dataKey="lastYear" 
                  name="Last Year" 
                  fill="#39FF14"
                  radius={[4, 4, 0, 0]} 
                  barSize={60}
                />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ 
              textAlign: 'center', 
              color: '#bdbdbd', 
              fontSize: '0.8rem', 
              paddingTop: '4px', 
              flexShrink: 0 
            }}>
              Comparing {yoyComparisonData[0]?.category} sales
            </div>
          </>
        ) : (
          <div style={{ 
            flexGrow: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: '#bdbdbd', 
            fontSize: '0.9rem' 
          }}>
            No comparison data available.
          </div>
        )}
      </div>
    </div>
  );
}

export default DailyView; 
